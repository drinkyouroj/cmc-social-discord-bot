### Operations runbook

This document is aimed at server admins/mods operating the bot day-to-day.

### Common workflows

#### Review pending submissions

- List pending submissions:
  - `/admin review list status:PENDING_REVIEW`
- Approve:
  - `/admin review approve id:<SUBMISSION_ID>`
- Reject:
  - `/admin review reject id:<SUBMISSION_ID> reason:<TEXT>`

#### Award points (tracking)

After approving a submission, you can mark it as “awarded”:

- `/admin points award id:<SUBMISSION_ID> amount:<N> currency:points note:<optional>`

To undo:

- `/admin points revoke id:<SUBMISSION_ID>`

#### Reset a user registration

- `/admin reset-user user:<USER>`

### Troubleshooting playbooks

#### “Not authorized”

You are authorized if:
- your Discord user is allowlisted for that guild, OR
- you have the configured admin role, OR
- your user ID matches `DEFAULT_ADMIN_DISCORD_USER_ID`

Actions:
- `/admin allowlist add user:<YOU>` (run by a current admin)
- `/admin config set-admin-role role_id:<ROLE_ID>`

#### “Something went wrong handling that command”

Check bot logs:

```bash
docker compose logs bot --tail=200
```

Common causes:
- DB migrations not applied
- Apify timeout fetching a post
- Paralon model not available to the API key

#### Apify timeouts

Symptoms:
- verify/submit says “Timed out waiting for Apify dataset items…”

Actions:
- retry
- increase `APIFY_TASK_TIMEOUT_MS`
- check Apify task run in Apify UI

#### Paralon model unavailable

Symptoms:
- sentiment returns “Model not found or not available”

Actions:
- set `PARALON_MODEL` to a model listed by `GET /v1/models` (often `qwen3-8b`)

