import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../../../../../../../../lib/auth';
import { assertGuildAccess } from '../../../../../../../../lib/permissions';
import { prisma } from '../../../../../../../../lib/prisma';

export async function POST(req: Request, ctx: { params: Promise<{ guildId: string; id: string }> }) {
  const session = await getServerSession(authOptions);
  const discordUserId = (session as any)?.discordUserId as string | undefined;
  const discordAccessToken = (session as any)?.discordAccessToken as string | undefined;
  if (!discordUserId || !discordAccessToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { guildId, id } = await ctx.params;
  await assertGuildAccess(guildId, discordUserId, discordAccessToken);

  const body = (await req.json().catch(() => ({}))) as any;
  const amount = Number(body?.amount);
  const currency = typeof body?.currency === 'string' && body.currency.length > 0 ? body.currency : 'points';
  const note = typeof body?.note === 'string' ? body.note : null;
  if (!Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: 'invalid_amount' }, { status: 400 });

  const updated = await prisma.submission.update({
    where: { id },
    data: {
      pointsAwarded: true,
      pointsAmount: Math.floor(amount),
      pointsCurrency: currency,
      pointsAwardedAt: new Date(),
      pointsAwardedByDiscordUserId: discordUserId,
      pointsNote: note
    }
  });
  if (updated.guildId !== guildId) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}

