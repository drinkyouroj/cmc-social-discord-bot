import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../../../../../../../lib/auth';
import { assertGuildAccess } from '../../../../../../../lib/permissions';
import { prisma } from '../../../../../../../lib/prisma';

export async function POST(_req: Request, ctx: { params: Promise<{ guildId: string; id: string }> }) {
  const session = await getServerSession(authOptions);
  const discordUserId = (session as any)?.discordUserId as string | undefined;
  const discordAccessToken = (session as any)?.discordAccessToken as string | undefined;
  if (!discordUserId || !discordAccessToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { guildId, id } = await ctx.params;
  await assertGuildAccess(guildId, discordUserId, discordAccessToken);

  const updated = await prisma.submission.update({
    where: { id },
    data: {
      status: 'APPROVED',
      decidedAt: new Date(),
      decidedByDiscordUserId: discordUserId,
      decisionReason: 'Approved via web admin.'
    }
  });
  if (updated.guildId !== guildId) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}

