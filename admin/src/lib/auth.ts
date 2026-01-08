import type { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { env } from './env';

type Token = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number; // epoch seconds
  userId?: string;
};

async function refreshDiscordToken(refreshToken: string) {
  const params = new URLSearchParams();
  params.set('client_id', env.DISCORD_CLIENT_ID);
  params.set('client_secret', env.DISCORD_OAUTH_CLIENT_SECRET);
  params.set('grant_type', 'refresh_token');
  params.set('refresh_token', refreshToken);

  const resp = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  if (!resp.ok) throw new Error(`Failed to refresh Discord token: ${resp.status}`);
  const data = (await resp.json()) as any;

  return {
    accessToken: data.access_token as string | undefined,
    refreshToken: (data.refresh_token as string | undefined) ?? refreshToken,
    expiresAt: data.expires_in ? Math.floor(Date.now() / 1000) + Number(data.expires_in) : undefined
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_OAUTH_CLIENT_SECRET,
      authorization: { params: { scope: 'identify guilds' } }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  callbacks: {
    async jwt({ token, account }) {
      const t = token as any as Token;
      if (account) {
        t.accessToken = account.access_token;
        t.refreshToken = account.refresh_token;
        t.expiresAt = account.expires_at;
        t.userId = token.sub;
        return token;
      }

      if (t.refreshToken && t.expiresAt && Date.now() / 1000 > t.expiresAt - 60) {
        const refreshed = await refreshDiscordToken(t.refreshToken);
        t.accessToken = refreshed.accessToken ?? t.accessToken;
        t.refreshToken = refreshed.refreshToken ?? t.refreshToken;
        t.expiresAt = refreshed.expiresAt ?? t.expiresAt;
      }

      return token;
    },
    async session({ session, token }) {
      const t = token as any as Token;
      (session as any).discordUserId = token.sub;
      (session as any).discordAccessToken = t.accessToken;
      return session;
    }
  },
  secret: env.NEXTAUTH_SECRET
};

