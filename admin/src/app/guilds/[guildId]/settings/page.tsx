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

  const config = await prisma.guildConfig.findUnique({
    where: { guildId },
    include: { allowlistedUsers: true }
  });
  if (!config) return <p>No guild config found for {guildId}.</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1>Settings</h1>
        <Link href="/">All servers</Link>
      </div>

      <p style={{ opacity: 0.7 }}>
        MVP settings view (editing is via API for now): <code>POST /admin/api/v1/guilds/{guildId}/config</code>
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          <h3>Config</h3>
          <div>
            <div>
              <b>adminRoleId:</b> {config.adminRoleId ?? '—'}
            </div>
            <div>
              <b>maxPostAgeDays:</b> {config.maxPostAgeDays}
            </div>
            <div>
              <b>sentimentMinConfidence:</b> {config.sentimentMinConfidence}
            </div>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 12, borderRadius: 8 }}>
            {JSON.stringify(
              {
                adminRoleId: config.adminRoleId,
                maxPostAgeDays: config.maxPostAgeDays,
                sentimentMinConfidence: config.sentimentMinConfidence
              },
              null,
              2
            )}
          </pre>
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          <h3>Allowlist</h3>
          <p style={{ opacity: 0.7 }}>
            Current allowlisted user IDs for this guild (manage via Discord commands for now).
          </p>
          <ul>
            {config.allowlistedUsers.map((u) => (
              <li key={u.id}>
                <code>{u.discordUserId}</code>
              </li>
            ))}
            {config.allowlistedUsers.length === 0 ? <li>None</li> : null}
          </ul>
        </div>
      </div>
    </div>
  );
}

