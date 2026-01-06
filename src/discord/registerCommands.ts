import { REST, Routes } from 'discord.js';
import { env } from '../env.js';
import { commandBuilders } from './commands.js';

async function main() {
  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

  if (env.DISCORD_GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID), {
      body: commandBuilders
    });
    // eslint-disable-next-line no-console
    console.log(`Registered commands to guild ${env.DISCORD_GUILD_ID}`);
    return;
  }

  await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: commandBuilders });
  // eslint-disable-next-line no-console
  console.log('Registered global commands');
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

