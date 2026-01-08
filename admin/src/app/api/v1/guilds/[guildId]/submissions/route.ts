import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../../../../../lib/auth';
import { assertGuildAccess } from '../../../../../lib/permissions';
import { prisma } from '../../../../../lib/prisma';

export async function GET(req: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const session = await getServerSession(authOptions);
  const discordUserId = (session as any)?.discordUserId as string | undefined;
  const discordAccessToken = (session as any)?.discordAccessToken as string | undefined;
  if (!discordUserId || !discordAccessToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { guildId } = await ctx.params;
  await assertGuildAccess(guildId, discordUserId, discordAccessToken);

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const unawarded = url.searchParams.get('unawarded') === 'true';
  const q = url.searchParams.get('q')?.trim();

  const where: any = { guildId };
  if (status === 'PENDING_REVIEW' || status === 'APPROVED' || status === 'REJECTED') where.status = status;
  if (unawarded) where.pointsAwarded = false;
  if (q) {
    where.OR = [
      { postUrl: { contains: q, mode: 'insensitive' } },
      { postOwnerHandle: { contains: q, mode: 'insensitive' } },
      { postText: { contains: q, mode: 'insensitive' } },
      { discordUserId: { contains: q } }
    ];
  }

  const items = await prisma.submission.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return NextResponse.json({
    submissions: items.map((s) => ({
      id: s.id,
      status: s.status,
      postUrl: s.postUrl,
      postOwnerHandle: s.postOwnerHandle,
      bullish: s.bullish,
      llmLabel: s.llmLabel,
      llmConfidence: s.llmConfidence,
      pointsAwarded: s.pointsAwarded,
      pointsAmount: s.pointsAmount,
      pointsCurrency: s.pointsCurrency,
      createdAt: s.createdAt
    }))
  });
}

