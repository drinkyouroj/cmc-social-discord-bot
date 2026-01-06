### cmc-social-discord-bot

Discord bot that mimics Engage Bot-style “proof + sentiment” workflows for **CoinMarketCap Community** posts, backed by **Postgres** and **Redis**, using **Apify** to fetch posts and **ParalonCloud** (OpenAI-compatible) for multilingual sentiment.

- **Apify Task**: `J28Ta2lp3OdssRi57` (returns exactly 1 post item for a given `postIdOrUrl`)
- **ParalonCloud base URL**: `https://paraloncloud.com/v1` (OpenAI-compatible; see ParalonCloud inference page at `https://paraloncloud.com/inference`)

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
  - `PARALON_MODEL` (default `qwen3-14b`)

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

### Admin usage

- Set admin role for a guild:
  - `/admin config set-admin-role role_id:<ROLE_ID>`
- Or allowlist a user:
  - `/admin allowlist add user:<USER>`
- Review queue:
  - `/admin review list status:PENDING_REVIEW`
  - `/admin review approve id:<SUBMISSION_ID>`
  - `/admin review reject id:<SUBMISSION_ID> reason:<TEXT>`
- Reset a user’s registration:
  - `/admin reset-user user:<USER>`

