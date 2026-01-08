import { env } from './env';

export type DiscordGuild = { id: string; name: string; owner?: boolean; permissions?: string };

export async function fetchUserGuilds(userAccessToken: string): Promise<DiscordGuild[]> {
  const resp = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: { Authorization: `Bearer ${userAccessToken}` },
    cache: 'no-store'
  });
  if (!resp.ok) throw new Error(`Failed to fetch Discord guilds: ${resp.status}`);
  return (await resp.json()) as DiscordGuild[];
}

export async function fetchMemberRoleIds(guildId: string, userId: string): Promise<string[]> {
  const resp = await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${env.DISCORD_TOKEN}` },
    cache: 'no-store'
  });
  if (!resp.ok) {
    // If the bot isn't in the guild or lacks permissions, treat as no roles.
    return [];
  }
  const data = (await resp.json()) as any;
  return Array.isArray(data?.roles) ? data.roles : [];
}

