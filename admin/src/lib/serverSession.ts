import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export type AdminSession = {
  discordUserId: string;
  discordAccessToken: string;
};

export async function requireSession(): Promise<AdminSession | null> {
  const session = await getServerSession(authOptions);
  const discordUserId = (session as any)?.discordUserId as string | undefined;
  const discordAccessToken = (session as any)?.discordAccessToken as string | undefined;
  if (!discordUserId || !discordAccessToken) return null;
  return { discordUserId, discordAccessToken };
}

