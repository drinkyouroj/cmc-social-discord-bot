import { Client, GatewayIntentBits, Events } from 'discord.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { handleCommand } from './discord/commands.js';
import { prisma } from './db.js';

async function main() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  client.once(Events.ClientReady, (c) => {
    logger.info({ user: c.user.tag }, 'Discord client ready');
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (!interaction.isChatInputCommand()) return;
      await handleCommand(interaction);
    } catch (e: any) {
      logger.error({ err: e }, 'Interaction handler error');
      if (interaction.isRepliable()) {
        const msg = 'Something went wrong handling that command.';
        if (interaction.deferred || interaction.replied) await interaction.editReply(msg);
        else await interaction.reply({ content: msg, ephemeral: true });
      }
    }
  });

  await client.login(env.DISCORD_TOKEN);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    try {
      await prisma.$disconnect();
    } finally {
      client.destroy();
      process.exit(0);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((e) => {
  logger.error({ err: e }, 'Fatal error');
  process.exit(1);
});

