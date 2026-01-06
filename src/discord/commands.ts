import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../db.js';
import { env } from '../env.js';
import { logger } from '../logger.js';
import { fetchCmcPostViaTask } from '../services/apify.js';
import { classifySentiment } from '../services/paralon.js';
import { extractCmcPostIdOrUrl, normalizeCmcPost } from '../services/cmcPost.js';
import type { SubmissionStatus } from '@prisma/client';

function randomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'CMC-';
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function ensureGuildConfig(guildId: string) {
  const existing = await prisma.guildConfig.findUnique({ where: { guildId } });
  if (existing) return existing;
  return await prisma.guildConfig.create({
    data: {
      guildId,
      maxPostAgeDays: env.DEFAULT_MAX_POST_AGE_DAYS,
      sentimentMinConfidence: env.DEFAULT_SENTIMENT_MIN_CONFIDENCE
    }
  });
}

async function isAdmin(interaction: ChatInputCommandInteraction): Promise<boolean> {
  const guildId = interaction.guildId;
  if (!guildId) return false;
  const config = await ensureGuildConfig(guildId);

  const allowlisted = await prisma.guildAllowlistedUser.findFirst({
    where: { guildConfigId: config.id, discordUserId: interaction.user.id }
  });
  if (allowlisted) return true;

  const roleId = config.adminRoleId;
  if (!roleId) return false;

  const member = interaction.member;
  // guild-only command; member should exist
  const roles = (member as any)?.roles;
  if (!roles) return false;
  if (typeof roles.cache?.has === 'function') return roles.cache.has(roleId);
  if (Array.isArray(roles)) return roles.includes(roleId);
  return false;
}

export const commandBuilders = [
  new SlashCommandBuilder()
    .setName('register')
    .setDescription('Start registration by binding your Discord to a CMC Community handle')
    .addStringOption((o) =>
      o.setName('handle').setDescription('Your CMC Community handle (e.g. Datagram_Network)').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify your registration by providing a CMC post URL or ID containing your code')
    .addStringOption((o) => o.setName('post').setDescription('CMC post URL or ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('submit')
    .setDescription('Submit a CMC post URL for verification and sentiment checking')
    .addStringOption((o) => o.setName('url').setDescription('CMC post URL').setRequired(true)),

  new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('reset-user')
        .setDescription('Reset a user registration (allows re-register)')
        .addUserOption((o) => o.setName('user').setDescription('Discord user').setRequired(true))
    )
    .addSubcommandGroup((g) =>
      g
        .setName('config')
        .setDescription('Guild configuration')
        .addSubcommand((s) =>
          s
            .setName('set-admin-role')
            .setDescription('Set the role ID that is allowed to administer the bot')
            .addStringOption((o) => o.setName('role_id').setDescription('Discord role ID').setRequired(true))
        )
        .addSubcommand((s) =>
          s
            .setName('set-max-post-age-days')
            .setDescription('Set the maximum age allowed for submissions')
            .addIntegerOption((o) => o.setName('days').setDescription('Days').setMinValue(1).setRequired(true))
        )
        .addSubcommand((s) =>
          s
            .setName('set-sentiment-min-confidence')
            .setDescription('Set the minimum confidence for auto-approval')
            .addNumberOption((o) =>
              o.setName('confidence').setDescription('0..1').setMinValue(0).setMaxValue(1).setRequired(true)
            )
        )
    )
    .addSubcommandGroup((g) =>
      g
        .setName('allowlist')
        .setDescription('Allowlist specific Discord users as admins')
        .addSubcommand((s) =>
          s
            .setName('add')
            .setDescription('Add a user to the allowlist')
            .addUserOption((o) => o.setName('user').setDescription('Discord user').setRequired(true))
        )
        .addSubcommand((s) =>
          s
            .setName('remove')
            .setDescription('Remove a user from the allowlist')
            .addUserOption((o) => o.setName('user').setDescription('Discord user').setRequired(true))
        )
    )
    .addSubcommandGroup((g) =>
      g
        .setName('review')
        .setDescription('Review queued submissions')
        .addSubcommand((s) =>
          s
            .setName('list')
            .setDescription('List submissions')
            .addStringOption((o) =>
              o
                .setName('status')
                .setDescription('PENDING_REVIEW | APPROVED | REJECTED')
                .setRequired(false)
            )
        )
        .addSubcommand((s) =>
          s
            .setName('approve')
            .setDescription('Approve a submission')
            .addStringOption((o) => o.setName('id').setDescription('Submission ID').setRequired(true))
        )
        .addSubcommand((s) =>
          s
            .setName('reject')
            .setDescription('Reject a submission')
            .addStringOption((o) => o.setName('id').setDescription('Submission ID').setRequired(true))
            .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(true))
        )
    )
].map((b) => b.toJSON());

export async function handleCommand(interaction: ChatInputCommandInteraction) {
  if (interaction.commandName === 'register') return await handleRegister(interaction);
  if (interaction.commandName === 'verify') return await handleVerify(interaction);
  if (interaction.commandName === 'submit') return await handleSubmit(interaction);
  if (interaction.commandName === 'admin') return await handleAdmin(interaction);
}

async function handleRegister(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const handle = interaction.options.getString('handle', true).trim();

  const existingUser = await prisma.user.findUnique({ where: { discordUserId: interaction.user.id } });
  if (existingUser?.registeredHandle) {
    return await interaction.editReply(
      `You are already registered as **${existingUser.registeredHandle}**. Ask an admin to reset you if needed.`
    );
  }

  const user = await prisma.user.upsert({
    where: { discordUserId: interaction.user.id },
    update: {},
    create: { discordUserId: interaction.user.id }
  });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000);

  const existingPending = await prisma.pendingRegistration.findFirst({
    where: { userId: user.id, consumedAt: null, expiresAt: { gt: now } },
    orderBy: { issuedAt: 'desc' }
  });

  if (existingPending) {
    return await interaction.editReply(
      [
        `You already have an active registration code for **${existingPending.requestedHandle}**.`,
        `Your code: \`${existingPending.code}\` (expires <t:${Math.floor(
          existingPending.expiresAt.getTime() / 1000
        )}:R>)`,
        `Post on CMC with this code in the post text, then run \`/verify post:<url-or-id>\`.`
      ].join('\n')
    );
  }

  let code = randomCode();
  // ensure uniqueness (very low probability collision, but we guard anyway)
  for (let i = 0; i < 5; i++) {
    const collision = await prisma.pendingRegistration.findUnique({ where: { code } });
    if (!collision) break;
    code = randomCode();
  }

  await prisma.pendingRegistration.create({
    data: { userId: user.id, requestedHandle: handle, code, issuedAt: now, expiresAt }
  });

  return await interaction.editReply(
    [
      `Registration started for CMC handle **${handle}**.`,
      `Your verification code: \`${code}\` (expires in 12h).`,
      `Create a CMC Community post that includes this code anywhere in the text, then run \`/verify\` with the post URL or ID.`
    ].join('\n')
  );
}

async function handleVerify(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const postInput = interaction.options.getString('post', true);
  const postIdOrUrl = extractCmcPostIdOrUrl(postInput);

  const user = await prisma.user.findUnique({ where: { discordUserId: interaction.user.id } });
  if (!user) return await interaction.editReply('You have no pending registration. Run `/register` first.');
  if (user.registeredHandle) {
    return await interaction.editReply(
      `You are already registered as **${user.registeredHandle}**. Ask an admin to reset you if needed.`
    );
  }

  const now = new Date();
  const pending = await prisma.pendingRegistration.findFirst({
    where: { userId: user.id, consumedAt: null, expiresAt: { gt: now } },
    orderBy: { issuedAt: 'desc' }
  });
  if (!pending) return await interaction.editReply('No active registration code found. Run `/register` again.');

  let post;
  try {
    const { item } = await fetchCmcPostViaTask(postIdOrUrl);
    post = normalizeCmcPost(item);
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    return await interaction.editReply(
      `Failed to fetch the CMC post from Apify (try again in a minute): ${msg}`
    );
  }

  if (post.ownerHandle !== pending.requestedHandle) {
    return await interaction.editReply(
      `Verification failed: post author handle is **${post.ownerHandle}**, expected **${pending.requestedHandle}**.`
    );
  }

  if (post.postTimeMs <= BigInt(pending.issuedAt.getTime())) {
    return await interaction.editReply('Verification failed: the post must be created after your code was issued.');
  }

  const hay = post.textContent.toLowerCase();
  const needle = pending.code.toLowerCase();
  if (!hay.includes(needle)) {
    return await interaction.editReply(`Verification failed: your code \`${pending.code}\` was not found in the post.`);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { registeredHandle: pending.requestedHandle, registeredAt: new Date() }
    }),
    prisma.pendingRegistration.update({ where: { id: pending.id }, data: { consumedAt: new Date() } })
  ]);

  return await interaction.editReply(`✅ Registered successfully as **${pending.requestedHandle}**.`);
}

async function handleSubmit(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const guildId = interaction.guildId;
  if (!guildId) return await interaction.editReply('This command must be used in a server.');
  const config = await ensureGuildConfig(guildId);

  const user = await prisma.user.findUnique({ where: { discordUserId: interaction.user.id } });
  if (!user?.registeredHandle) return await interaction.editReply('You are not registered. Use `/register` first.');

  const url = interaction.options.getString('url', true).trim();
  const postIdOrUrl = extractCmcPostIdOrUrl(url);

  // Fetch post from Apify
  let postItem;
  try {
    const { item } = await fetchCmcPostViaTask(postIdOrUrl);
    postItem = item;
  } catch (e: any) {
    logger.error({ err: e }, 'Apify fetch failed');
    return await interaction.editReply(`Failed to fetch the post from Apify: ${String(e?.message ?? e)}`);
  }

  const post = normalizeCmcPost(postItem);

  if (post.ownerHandle !== user.registeredHandle) {
    return await interaction.editReply(
      `Submission rejected: post author handle is **${post.ownerHandle}**, but you are registered as **${user.registeredHandle}**.`
    );
  }

  // Age check
  const maxAgeMs = BigInt(config.maxPostAgeDays) * BigInt(24 * 60 * 60 * 1000);
  const nowMs = BigInt(Date.now());
  if (nowMs - post.postTimeMs > maxAgeMs) {
    return await interaction.editReply(`Submission rejected: post is older than ${config.maxPostAgeDays} days.`);
  }

  // Dedupe globally
  const existing = await prisma.submission.findUnique({ where: { postStableId: post.stableId } });
  if (existing) {
    return await interaction.editReply('Submission rejected: this post has already been submitted.');
  }

  // Run LLM sentiment and store it regardless of bullish presence
  let llm;
  try {
    llm = await classifySentiment(post.textContent);
  } catch (e: any) {
    logger.error({ err: e }, 'LLM sentiment failed');
    return await interaction.editReply(`Sentiment analysis failed: ${String(e?.message ?? e)}`);
  }

  const bullish = post.bullish;

  let status: SubmissionStatus = 'PENDING_REVIEW';
  let reason: string | undefined = undefined;

  if (bullish === undefined) {
    status = 'PENDING_REVIEW';
    reason = 'Bullish flag missing; requires manual review.';
  } else if (bullish === false) {
    status = 'REJECTED';
    reason = 'Bullish flag is false.';
  } else {
    // bullish === true
    if (llm.result.label === 'positive' && llm.result.confidence >= config.sentimentMinConfidence) {
      status = 'APPROVED';
      reason = 'Auto-approved: bullish=true and positive sentiment.';
    } else {
      status = 'PENDING_REVIEW';
      reason = `Requires review: bullish=true but sentiment=${llm.result.label} (conf=${llm.result.confidence.toFixed(2)}).`;
    }
  }

  const created = await prisma.submission.create({
    data: {
      guildId,
      discordUserId: interaction.user.id,
      userId: user.id,
      postIdOrUrl,
      postStableId: post.stableId,
      postUrl: post.url,
      postOwnerHandle: post.ownerHandle,
      postText: post.textContent,
      postTimeMs: post.postTimeMs,
      bullish,
      llmLabel: llm.result.label,
      llmConfidence: llm.result.confidence,
      llmLanguage: llm.result.language,
      llmRawJson: llm.rawJson as any,
      status,
      decisionReason: reason,
      decidedAt: status === 'PENDING_REVIEW' ? null : new Date(),
      decidedByDiscordUserId: status === 'PENDING_REVIEW' ? null : 'SYSTEM'
    }
  });

  if (status === 'APPROVED') {
    return await interaction.editReply(`✅ Approved. Submission ID: \`${created.id}\``);
  }

  if (status === 'REJECTED') {
    return await interaction.editReply(`❌ Rejected. ${reason ?? ''} Submission ID: \`${created.id}\``);
  }

  return await interaction.editReply(`⏳ Queued for review. ${reason ?? ''} Submission ID: \`${created.id}\``);
}

async function handleAdmin(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const guildId = interaction.guildId;
  if (!guildId) return await interaction.editReply('This command must be used in a server.');
  const config = await ensureGuildConfig(guildId);

  const allowed = await isAdmin(interaction);
  if (!allowed) return await interaction.editReply('Not authorized.');

  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand(true);

  if (!group && sub === 'reset-user') {
    const target = interaction.options.getUser('user', true);
    await prisma.user.updateMany({
      where: { discordUserId: target.id },
      data: { registeredHandle: null, registeredAt: null }
    });
    await prisma.pendingRegistration.deleteMany({
      where: { user: { discordUserId: target.id } }
    });
    return await interaction.editReply(`Reset registration for <@${target.id}>.`);
  }

  if (group === 'config' && sub === 'set-admin-role') {
    const roleId = interaction.options.getString('role_id', true);
    await prisma.guildConfig.update({ where: { id: config.id }, data: { adminRoleId: roleId } });
    return await interaction.editReply(`Set admin role to \`${roleId}\`.`);
  }

  if (group === 'config' && sub === 'set-max-post-age-days') {
    const days = interaction.options.getInteger('days', true);
    await prisma.guildConfig.update({ where: { id: config.id }, data: { maxPostAgeDays: days } });
    return await interaction.editReply(`Set max post age to ${days} days.`);
  }

  if (group === 'config' && sub === 'set-sentiment-min-confidence') {
    const confidence = interaction.options.getNumber('confidence', true);
    await prisma.guildConfig.update({ where: { id: config.id }, data: { sentimentMinConfidence: confidence } });
    return await interaction.editReply(`Set sentiment min confidence to ${confidence}.`);
  }

  if (group === 'allowlist' && sub === 'add') {
    const target = interaction.options.getUser('user', true);
    await prisma.guildAllowlistedUser.upsert({
      where: { guildConfigId_discordUserId: { guildConfigId: config.id, discordUserId: target.id } },
      update: {},
      create: { guildConfigId: config.id, discordUserId: target.id }
    });
    return await interaction.editReply(`Allowlisted <@${target.id}>.`);
  }

  if (group === 'allowlist' && sub === 'remove') {
    const target = interaction.options.getUser('user', true);
    await prisma.guildAllowlistedUser.deleteMany({
      where: { guildConfigId: config.id, discordUserId: target.id }
    });
    return await interaction.editReply(`Removed <@${target.id}> from allowlist.`);
  }

  if (group === 'review' && sub === 'list') {
    const statusStr = interaction.options.getString('status', false);
    const status =
      statusStr === 'APPROVED' || statusStr === 'REJECTED' || statusStr === 'PENDING_REVIEW' ? statusStr : undefined;

    const items = await prisma.submission.findMany({
      where: { guildId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (items.length === 0) return await interaction.editReply('No submissions found.');
    const lines = items.map(
      (s) =>
        `\`${s.id}\` • ${s.status} • <@${s.discordUserId}> • ${s.postUrl ?? s.postIdOrUrl} • bullish=${String(
          s.bullish
        )} • llm=${s.llmLabel ?? 'n/a'}(${s.llmConfidence ?? 'n/a'})`
    );
    return await interaction.editReply(lines.join('\n'));
  }

  if (group === 'review' && sub === 'approve') {
    const id = interaction.options.getString('id', true);
    const updated = await prisma.submission.update({
      where: { id },
      data: {
        status: 'APPROVED',
        decidedAt: new Date(),
        decidedByDiscordUserId: interaction.user.id,
        decisionReason: 'Approved by admin.'
      }
    });
    return await interaction.editReply(`Approved \`${updated.id}\`.`);
  }

  if (group === 'review' && sub === 'reject') {
    const id = interaction.options.getString('id', true);
    const reason = interaction.options.getString('reason', true);
    const updated = await prisma.submission.update({
      where: { id },
      data: {
        status: 'REJECTED',
        decidedAt: new Date(),
        decidedByDiscordUserId: interaction.user.id,
        decisionReason: reason
      }
    });
    return await interaction.editReply(`Rejected \`${updated.id}\`: ${reason}`);
  }

  return await interaction.editReply('Unknown admin command.');
}

