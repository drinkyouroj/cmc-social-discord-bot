import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../../../lib/auth';
import { listAllowedGuilds } from '../../../lib/permissions';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  const discordUserId = (session as any)?.discordUserId as string | undefined;
  const discordAccessToken = (session as any)?.discordAccessToken as string | undefined;

  if (!discordUserId || !discordAccessToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const allowed = await listAllowedGuilds(discordUserId, discordAccessToken);

  // Summaries: counts per guild
  const summaries = await Promise.all(
    allowed.map(async (g) => {
      const [pendingCount, unawardedApprovedCount] = await Promise.all([
        prisma.submission.count({ where: { guildId: g.guildId, status: 'PENDING_REVIEW' } }),
        prisma.submission.count({ where: { guildId: g.guildId, status: 'APPROVED', pointsAwarded: false } })
      ]);
      return {
        guildId: g.guildId,
        name: g.name ?? g.guildId,
        pendingCount,
        unawardedApprovedCount
      };
    })
  );

  return NextResponse.json({ guilds: summaries });
}

