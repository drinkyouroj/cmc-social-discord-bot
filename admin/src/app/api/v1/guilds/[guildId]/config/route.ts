import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../../../../../lib/auth';
import { assertGuildAccess } from '../../../../../lib/permissions';
import { prisma } from '../../../../../lib/prisma';

export async function GET(_req: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const session = await getServerSession(authOptions);
  const discordUserId = (session as any)?.discordUserId as string | undefined;
  const discordAccessToken = (session as any)?.discordAccessToken as string | undefined;
  if (!discordUserId || !discordAccessToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { guildId } = await ctx.params;
  await assertGuildAccess(guildId, discordUserId, discordAccessToken);

  const config = await prisma.guildConfig.findUnique({
    where: { guildId },
    include: { allowlistedUsers: true }
  });

  if (!config) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ config });
}

export async function POST(req: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const session = await getServerSession(authOptions);
  const discordUserId = (session as any)?.discordUserId as string | undefined;
  const discordAccessToken = (session as any)?.discordAccessToken as string | undefined;
  if (!discordUserId || !discordAccessToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { guildId } = await ctx.params;
  await assertGuildAccess(guildId, discordUserId, discordAccessToken);

  const body = (await req.json().catch(() => ({}))) as any;
  const data: any = {};
  if (typeof body?.adminRoleId === 'string') data.adminRoleId = body.adminRoleId || null;
  if (typeof body?.maxPostAgeDays === 'number') data.maxPostAgeDays = Math.max(1, Math.floor(body.maxPostAgeDays));
  if (typeof body?.sentimentMinConfidence === 'number') {
    data.sentimentMinConfidence = Math.max(0, Math.min(1, body.sentimentMinConfidence));
  }

  const updated = await prisma.guildConfig.update({ where: { guildId }, data });
  return NextResponse.json({ config: updated });
}

