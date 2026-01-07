### Deployment (Docker / VPS)

This bot is designed to run in Docker, with Postgres + Redis via Docker Compose.

### 1) Create a Discord application + bot

In the Discord Developer Portal:

- Create an application
- Add a bot
- Copy:
  - `DISCORD_TOKEN`
  - `DISCORD_CLIENT_ID`

Invite the bot to your server with scopes:
- `bot`
- `applications.commands`

### 2) Configure environment

Copy `example.env` → `.env` and fill in:

- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_GUILD_ID` (recommended for faster slash command updates)
- `APIFY_TOKEN`
- `APIFY_TASK_ID`
- `PARALON_API_KEY`

### 3) Start services

```bash
docker compose up -d --build
```

### 4) Apply DB migrations

```bash
docker compose exec bot npx prisma migrate deploy
```

### 5) Register slash commands

Guild-scoped (fast):

```bash
docker compose exec bot node dist/discord/registerCommands.js
```

### 6) Verify bot health

Logs:

```bash
docker compose logs bot --tail=100
```

You should see:
- “Discord client ready”

### Upgrades

For a safe upgrade:

```bash
docker compose pull
docker compose up -d --build
docker compose exec bot npx prisma migrate deploy
docker compose exec bot node dist/discord/registerCommands.js
```

### Backups (recommended)

Back up the Postgres volume regularly. Example (simple, no encryption):

```bash
docker compose exec -T postgres pg_dump -U postgres cmc_bot > backup.sql
```

