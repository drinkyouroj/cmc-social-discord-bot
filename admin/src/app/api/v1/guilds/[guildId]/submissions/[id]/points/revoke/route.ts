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
  const note = typeof body?.note === 'string' ? body.note : null;

  const updated = await prisma.submission.update({
    where: { id },
    data: {
      pointsAwarded: false,
      pointsAmount: null,
      pointsCurrency: null,
      pointsAwardedAt: null,
      pointsAwardedByDiscordUserId: null,
      pointsNote: note
    }
  });
  if (updated.guildId !== guildId) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}

