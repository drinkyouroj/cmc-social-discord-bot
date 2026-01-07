### Economy + integration API (planned)

Today the bot tracks “points awarded” on submissions inside Postgres. The long-term goal is for the bot to expose a small HTTP API so other systems (including existing Engage Bot setups, custom dashboards, or game/economy servers) can integrate.

This document describes the intended interface so the ecosystem can be designed early.

### Current state

- The bot **does not** expose HTTP endpoints yet.
- Admins can track points via:
  - `/admin points award …`
  - `/admin points revoke …`

### Proposed API (v1)

Base:
- `GET /api/v1/...`

Auth:
- Initial recommendation: `Authorization: Bearer <API_KEY>` set via env var
- (Future) Discord OAuth for admin dashboard integration

#### Fetch submissions (for accounting)

`GET /api/v1/guilds/{guildId}/submissions?status=PENDING_REVIEW&unawarded=true&limit=50`

Returns:
- submission id
- user id
- post url
- decision status
- points awarded state + amount/currency
- timestamps

#### Award points (idempotent)

`POST /api/v1/guilds/{guildId}/submissions/{submissionId}/award`

Body:
```json
{ "amount": 10, "currency": "points", "note": "weekly reward", "idempotencyKey": "..." }
```

Behavior:
- mark submission as awarded
- store amount/currency/note

#### Revoke points

`POST /api/v1/guilds/{guildId}/submissions/{submissionId}/revoke`

Body:
```json
{ "note": "reversed", "idempotencyKey": "..." }
```

### Suggested next steps (implementation)

When you’re ready to implement:
- add a small HTTP server (Express/Fastify) in the bot container
- add an API auth key env var and middleware
- reuse existing Prisma models for reads/writes
- optionally add webhooks for “submission approved/awarded”

