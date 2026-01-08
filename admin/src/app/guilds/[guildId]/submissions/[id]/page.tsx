import Link from 'next/link';
import { prisma } from '../../../../../lib/prisma';
import { requireSession } from '../../../../../lib/serverSession';
import { assertGuildAccess } from '../../../../../lib/permissions';

export default async function Page({ params }: { params: Promise<{ guildId: string; id: string }> }) {
  const session = await requireSession();
  if (!session) {
    return (
      <div>
        <p>Not signed in.</p>
        <a href="/admin/api/auth/signin">Sign in</a>
      </div>
    );
  }

  const { guildId, id } = await params;
  await assertGuildAccess(guildId, session.discordUserId, session.discordAccessToken);

  const s = await prisma.submission.findUnique({ where: { id } });
  if (!s || s.guildId !== guildId) return <p>Not found.</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1>Submission</h1>
        <Link href={`/guilds/${guildId}/submissions`}>Back to list</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <div>
          <h3>Post</h3>
          <div>
            <div>
              <b>Status:</b> {s.status}
            </div>
            <div>
              <b>Author handle:</b> {s.postOwnerHandle ?? '—'}
            </div>
            <div>
              <b>Bullish:</b> {String(s.bullish)}
            </div>
            <div>
              <b>URL:</b>{' '}
              {s.postUrl ? (
                <a href={s.postUrl} target="_blank" rel="noreferrer">
                  {s.postUrl}
                </a>
              ) : (
                s.postIdOrUrl
              )}
            </div>
            <div>
              <b>Points awarded:</b>{' '}
              {s.pointsAwarded ? `yes (${s.pointsAmount ?? 0} ${s.pointsCurrency ?? 'points'})` : 'no'}
            </div>
          </div>
        </div>

        <div>
          <h3>Actions</h3>
          <p style={{ opacity: 0.7 }}>Use the API routes for mutations (simple MVP).</p>
          <ul>
            <li>
              Approve: <code>POST /admin/api/v1/guilds/{guildId}/submissions/{id}/approve</code>
            </li>
            <li>
              Reject: <code>POST /admin/api/v1/guilds/{guildId}/submissions/{id}/reject</code> with JSON{' '}
              <code>{`{"reason":"..."}`}</code>
            </li>
            <li>
              Award points: <code>POST /admin/api/v1/guilds/{guildId}/submissions/{id}/points/award</code> with JSON{' '}
              <code>{`{"amount":10,"currency":"points","note":"..."}`}</code>
            </li>
            <li>
              Revoke points: <code>POST /admin/api/v1/guilds/{guildId}/submissions/{id}/points/revoke</code>
            </li>
          </ul>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Post text</h3>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 12, borderRadius: 8 }}>
          {s.postText ?? ''}
        </pre>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Sentiment (LLM)</h3>
        <div>
          <div>
            <b>Label:</b> {s.llmLabel ?? '—'} ({s.llmConfidence ?? '—'})
          </div>
          <div>
            <b>Language:</b> {s.llmLanguage ?? '—'}
          </div>
        </div>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 12, borderRadius: 8 }}>
          {JSON.stringify(s.llmRawJson, null, 2)}
        </pre>
      </div>
    </div>
  );
}

