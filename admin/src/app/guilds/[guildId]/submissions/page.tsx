import Link from 'next/link';
import { prisma } from '../../../../lib/prisma';
import { requireSession } from '../../../../lib/serverSession';
import { assertGuildAccess } from '../../../../lib/permissions';

export default async function Page({ params }: { params: Promise<{ guildId: string }> }) {
  const session = await requireSession();
  if (!session) {
    return (
      <div>
        <p>Not signed in.</p>
        <a href="/admin/api/auth/signin">Sign in</a>
      </div>
    );
  }

  const { guildId } = await params;
  await assertGuildAccess(guildId, session.discordUserId, session.discordAccessToken);

  const items = await prisma.submission.findMany({
    where: { guildId },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1>Submissions</h1>
        <Link href="/">All servers</Link>
      </div>

      <p style={{ opacity: 0.7 }}>Most recent 50 submissions for guild: {guildId}</p>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>ID</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Status</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Awarded</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Author</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Post</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr key={s.id}>
              <td style={{ padding: 8 }}>
                <Link href={`/guilds/${guildId}/submissions/${s.id}`}>{s.id}</Link>
              </td>
              <td style={{ padding: 8 }}>{s.status}</td>
              <td style={{ padding: 8 }}>
                {s.pointsAwarded ? `yes (${s.pointsAmount ?? 0} ${s.pointsCurrency ?? 'points'})` : 'no'}
              </td>
              <td style={{ padding: 8 }}>{s.postOwnerHandle ?? '—'}</td>
              <td style={{ padding: 8 }}>
                {s.postUrl ? (
                  <a href={s.postUrl} target="_blank" rel="noreferrer">
                    link
                  </a>
                ) : (
                  s.postIdOrUrl
                )}
              </td>
            </tr>
          ))}
          {items.length === 0 ? (
            <tr>
              <td style={{ padding: 8 }} colSpan={5}>
                No submissions found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

