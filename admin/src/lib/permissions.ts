import { prisma } from './prisma';
import { env } from './env';
import { fetchMemberRoleIds, fetchUserGuilds } from './discord';

export type AllowedGuild = { guildId: string; name?: string };

export async function listAllowedGuilds(discordUserId: string, discordAccessToken: string) {
  if (discordUserId === env.DEFAULT_ADMIN_DISCORD_USER_ID) {
    // Super-admin can see all guild configs in DB, plus any guilds the user is a member of.
    const guilds = await fetchUserGuilds(discordAccessToken);
    return guilds.map((g) => ({ guildId: g.id, name: g.name }));
  }

  const guilds = await fetchUserGuilds(discordAccessToken);
  const allowed: AllowedGuild[] = [];

  for (const g of guilds) {
    const config = await prisma.guildConfig.findUnique({ where: { guildId: g.id } });
    if (!config) continue;

    const allowlisted = await prisma.guildAllowlistedUser.findFirst({
      where: { guildConfigId: config.id, discordUserId }
    });
    if (allowlisted) {
      allowed.push({ guildId: g.id, name: g.name });
      continue;
    }

    if (config.adminRoleId) {
      const roleIds = await fetchMemberRoleIds(g.id, discordUserId);
      if (roleIds.includes(config.adminRoleId)) {
        allowed.push({ guildId: g.id, name: g.name });
        continue;
      }
    }
  }

  return allowed;
}

export async function assertGuildAccess(
  guildId: string,
  discordUserId: string,
  discordAccessToken: string
): Promise<void> {
  if (discordUserId === env.DEFAULT_ADMIN_DISCORD_USER_ID) return;
  const allowed = await listAllowedGuilds(discordUserId, discordAccessToken);
  if (!allowed.some((g) => g.guildId === guildId)) throw new Error('Not authorized for this guild');
}

