### Development guide

### Repo layout

- `src/index.ts`: Discord client startup, interaction routing, shutdown
- `src/discord/commands.ts`: command builders + handlers
- `src/discord/registerCommands.ts`: registers slash commands (guild or global)
- `src/services/apify.ts`: Apify Task run + polling
- `src/services/cmcPost.ts`: normalizes Apify dataset items into a canonical CMC post
- `src/services/paralon.ts`: ParalonCloud OpenAI-compatible sentiment classification + model fallback
- `prisma/schema.prisma`: schema
- `prisma/migrations/*`: migrations

### Local dev

Install deps and run:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run register-commands
npm run dev
```

### Manual test checklist

#### Registration

- `/register handle:<your handle>` returns a code
- Create a new CMC post containing the code
- `/verify post:<url or id>` succeeds

#### Submission

- `/submit url:<url>`:
  - rejects if post owner handle != registered handle
  - rejects if post is older than `maxPostAgeDays`
  - rejects on duplicate `postStableId`
  - queues if bullish missing
  - rejects if bullish=false
  - approves only if bullish=true and LLM positive + confident

#### Admin

- `/admin review list status:PENDING_REVIEW` lists items
- approve/reject paths work
- points award/revoke updates submission record

### Contributing

For OSS contributions:
- keep secrets out of the repo
- prefer adding docs for new commands and env vars in `docs/` + `README.md`

