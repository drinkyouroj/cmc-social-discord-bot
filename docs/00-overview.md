### Overview

This project is a Discord bot that runs an “Engage Bot”-style workflow for **CoinMarketCap Community** posts:

- Users **bind** a Discord account to a CMC Community handle via a proof-of-control code.
- Users **submit** CMC posts for approval based on:
  - authorship (must match the registered handle)
  - bullish flag (must be `true`; missing → review; false → reject)
  - multilingual sentiment classification via ParalonCloud (OpenAI-compatible API)
- Admins **review** queued submissions and optionally **award points** (tracking).

This repository is intended to be **public open-source**. It does **not** include secrets; all credentials are provided via environment variables.

### Architecture (high level)

```mermaid
flowchart LR
  U[Discord User] -->|/register| B[Discord Bot]
  B -->|Create PendingRegistration code| DB[(Postgres)]
  U -->|Post on CMC w/ code| CMC[CoinMarketCap Community]
  U -->|/verify post URL/ID| B
  B -->|Run Apify Task (postIdOrUrl)| A[Apify Task]
  A -->|Dataset item JSON| B
  B -->|Validate author+code+postTime| DB

  U -->|/submit post URL| B
  B -->|Run Apify Task| A
  A -->|Post JSON| B
  B -->|bullish gate| B
  B -->|Sentiment classify| P[ParalonCloud /v1/chat/completions]
  P -->|JSON result| B
  B -->|Persist Submission + LLM result| DB
  Admin[Discord Admin] -->|/admin review| B
  Admin -->|/admin points award| B
  B -->|Update Submission awarded fields| DB
```

### Key external dependencies

- **Discord**: slash commands, guild-scoped configs, admin allowlist/role.
- **Apify**: a Task is called to fetch a single CMC post by URL/ID:
  - Task ID: `J28Ta2lp3OdssRi57`
- **ParalonCloud**: OpenAI-compatible API:
  - Base URL: `https://paraloncloud.com/v1`
  - Used endpoints: `POST /chat/completions`, `GET /models`
  - Reference page: `https://paraloncloud.com/inference`
- **Postgres**: source of truth for registrations, submissions, reviews, and points tracking.
- **Redis**: provisioned in Docker Compose (future async workflows; not required for current core flow).

### Data + privacy (OSS-friendly)

Stored data includes:
- Discord user IDs (required for identity binding)
- CMC post URL/ID, author handle, and text content (for verification and review)
- LLM output JSON and derived label/confidence/language (for explainability and review)

If you deploy this bot publicly, ensure you have appropriate terms/consent for storing user-submitted content.

### Where to read next

- `docs/01-apify.md` – how the Apify Task is configured and called
- `docs/02-paralon-sentiment.md` – sentiment classification details + model fallback behavior
- `docs/03-database.md` – schema and invariants (dedupe, registration, review)
- `docs/04-discord-commands.md` – command reference
- `docs/05-deployment.md` – Docker/VPS deployment
- `docs/08-economy-api.md` – planned API endpoints for integrating points into other systems

