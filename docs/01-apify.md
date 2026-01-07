### Apify integration

The bot relies on an Apify **Task** that returns exactly **one** dataset item for a given CoinMarketCap post URL/ID.

### Inventory

- **Actor (project)**: `dgram_justin/cmc-social-monitor-actor`
- **Task ID (used by the bot)**: `J28Ta2lp3OdssRi57`
- **Token env var**: `APIFY_TOKEN`

### How the bot calls Apify

The bot uses the Apify API client to:

1. Start a Task run with an override input containing `postIdOrUrl`
2. Poll the run’s default dataset until the first item appears or timeout is reached

Key settings:
- **Timeout**: `APIFY_TASK_TIMEOUT_MS` (default 90s)
- **Polling interval**: 2s

### Task input template

The bot overrides only:

- `platformRuns[0].input.postIdOrUrl`

Everything else matches the task defaults.

Example task input:

```json
{
  "caseInsensitive": true,
  "debug": { "maxItemsPerDataset": 1000 },
  "dedupe": { "enabled": true, "maxSeenIdsPerPlatform": 5000 },
  "match": {
    "symbols": ["DGRAM"],
    "caseInsensitive": true,
    "useWordBoundaries": false
  },
  "notify": { "webhookUrl": "" },
  "platformRuns": [
    {
      "name": "coinmarketcap-community",
      "actorId": "cmc/community-post",
      "input": {
        "postIdOrUrl": "ENTER_POST_ID_URL",
        "includeComments": true,
        "maxComments": 50
      }
    }
  ],
  "symbols": ["DGRAM", "Datagram Network"],
  "useWordBoundaries": false
}
```

### Expected output shape

The bot normalizes a “post” out of the dataset item by reading fields like:

- `stableId`
- `source.url`
- `raw.raw.owner.handle`
- `raw.raw.textContent`
- `raw.raw.postTime` (milliseconds since epoch as a string)
- `raw.raw.raw.bullish` (boolean; may be missing)

See `src/services/cmcPost.ts`.

### Troubleshooting

#### Timeout fetching post

Symptoms:
- `/verify` or `/submit` returns “Timed out waiting for Apify dataset items …”

Actions:
- Confirm the input `postIdOrUrl` is valid (a numeric ID or a valid CMC post URL).
- Try increasing `APIFY_TASK_TIMEOUT_MS` (e.g. 120000).
- Check Apify run logs/dataset in the Apify UI to confirm the Task is producing an item.

#### Output shape changes

If Apify changes the output schema, update `normalizeCmcPost()` in `src/services/cmcPost.ts` and re-deploy.

