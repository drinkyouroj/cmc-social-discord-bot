import Link from 'next/link';
import { prisma } from '../lib/prisma';
import { listAllowedGuilds } from '../lib/permissions';
import { requireSession } from '../lib/serverSession';

export default async function Page() {
  const session = await requireSession();
  if (!session) {
    return (
      <div>
        <h1>CMC Social Admin</h1>
        <p>You are not signed in.</p>
        <a href="/admin/api/auth/signin">Sign in with Discord</a>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1>All my servers</h1>
        <a href="/admin/api/auth/signout">Sign out</a>
      </div>
      <p style={{ opacity: 0.7 }}>
        This dashboard shows the servers you can administer (based on your Discord role/allowlist settings).
      </p>
      <Dashboard discordUserId={session.discordUserId} discordAccessToken={session.discordAccessToken} />
      <p style={{ marginTop: 24, opacity: 0.7 }}>
        Tip: use the Discord bot commands as a fallback if the web UI is unavailable.
      </p>
    </div>
  );
}

async function Dashboard(props: { discordUserId: string; discordAccessToken: string }) {
  const allowed = await listAllowedGuilds(props.discordUserId, props.discordAccessToken);
  const guilds = await Promise.all(
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

  if (guilds.length === 0) return <p>No accessible servers found.</p>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
      {guilds.map((g: any) => (
        <div key={g.guildId} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 600 }}>{g.name}</div>
          <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span>Pending: {g.pendingCount}</span>
            <span>Unawarded approved: {g.unawardedApprovedCount}</span>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
            <Link href={`/guilds/${g.guildId}/submissions`}>Submissions</Link>
            <Link href={`/guilds/${g.guildId}/settings`}>Settings</Link>
          </div>
        </div>
      ))}
    </div>
  );
}

