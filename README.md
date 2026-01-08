### cmc-social-discord-bot

Discord bot that mimics Engage Bot-style “proof + sentiment” workflows for **CoinMarketCap Community** posts, backed by **Postgres** and **Redis**, using **Apify** to fetch posts and **ParalonCloud** (OpenAI-compatible) for multilingual sentiment.

- **Apify Task**: `J28Ta2lp3OdssRi57` (returns exactly 1 post item for a given `postIdOrUrl`)
- **ParalonCloud base URL**: `https://paraloncloud.com/v1` (OpenAI-compatible; see ParalonCloud inference page at `https://paraloncloud.com/inference`)

### Documentation

- `docs/00-overview.md`
- `docs/01-apify.md`
- `docs/02-paralon-sentiment.md`
- `docs/03-database.md`
- `docs/04-discord-commands.md`
- `docs/05-deployment.md`
- `docs/06-operations-runbook.md`
- `docs/07-development.md`
- `docs/08-economy-api.md`

### Features

- **/register**: starts registration by generating a unique code (expires in 12h)
- **/verify**: verifies a CMC post contains the code, is authored by the requested handle, and was posted *after* the code was issued; registration is **global** per Discord user
- **/submit**: fetches a CMC post, verifies it’s authored by the registered handle, checks max age, de-dupes globally, requires `bullish === true` (missing → review), runs Paralon sentiment, and either auto-approves or queues for review
- **/admin ...**: guild-scoped config + allowlist + review queue + reset user registration

### Environment variables

Create a `.env` file (you can copy `example.env`) and set:

- **Discord**
  - `DISCORD_TOKEN`
  - `DISCORD_CLIENT_ID`
  - `DISCORD_GUILD_ID` (optional; if set, registers slash commands to that guild for faster iteration)
- **Database / Redis**
  - `DATABASE_URL` (for Docker Compose: `postgresql://postgres:postgres@postgres:5432/cmc_bot?schema=public`)
  - `REDIS_URL` (for Docker Compose: `redis://redis:6379`)
- **Apify**
  - `APIFY_TOKEN`
  - `APIFY_TASK_ID` (default is already set to `J28Ta2lp3OdssRi57`)
- **ParalonCloud**
  - `PARALON_BASE_URL` (default `https://paraloncloud.com/v1`)
  - `PARALON_API_KEY`
  - `PARALON_MODEL` (default `qwen3-8b`; actual availability depends on your ParalonCloud API key)
- **Defaults**
  - `DEFAULT_MAX_POST_AGE_DAYS`
  - `DEFAULT_SENTIMENT_MIN_CONFIDENCE`
  - `DEFAULT_ADMIN_DISCORD_USER_ID` (bootstraps an initial admin allowlist entry when a guild is first seen)

### Local dev (non-Docker)

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run register-commands
npm run dev
```

### Docker / VPS

1. Copy `example.env` → `.env` and fill in values.
2. Start services:

```bash
docker compose up -d --build
```

3. Run migrations once (inside the bot container):

```bash
docker compose exec bot npx prisma migrate deploy
```

4. Register slash commands (guild-scoped is fast if `DISCORD_GUILD_ID` is set):

```bash
docker compose exec bot node dist/discord/registerCommands.js
```

### Web admin UI

This repo includes a minimal Next.js admin app served under **`/admin`** (via Next `basePath`).

- Local access: `http://localhost:3000/admin`
- Production: configure your reverse proxy to route `/admin/*` to the `admin` container (port 3000).

Required env vars (in `.env`):
- `DISCORD_OAUTH_CLIENT_SECRET`
- `NEXTAUTH_URL` (e.g. `https://yourdomain.com`)
- `NEXTAUTH_SECRET` (random 32+ chars)

Discord OAuth redirect URIs to add in the Discord Developer Portal:
- `http://localhost:3000/admin/api/auth/callback/discord`
- `https://yourdomain.com/admin/api/auth/callback/discord`

### Admin usage

- Set admin role for a guild:
  - `/admin config set-admin-role role_id:<ROLE_ID>`
- Or allowlist a user:
  - `/admin allowlist add user:<USER>`
- Review queue:
  - `/admin review list status:PENDING_REVIEW`
  - `/admin review approve id:<SUBMISSION_ID>`
  - `/admin review reject id:<SUBMISSION_ID> reason:<TEXT>`
- Track “points awarded” for approved submissions (tracking only):
  - `/admin points award id:<SUBMISSION_ID> amount:<N> currency:<optional> note:<optional>`
  - `/admin points revoke id:<SUBMISSION_ID> note:<optional>`
- Reset a user’s registration:
  - `/admin reset-user user:<USER>`

