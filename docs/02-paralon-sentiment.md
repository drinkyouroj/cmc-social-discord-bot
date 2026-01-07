### ParalonCloud sentiment classification

The bot uses ParalonCloud as an **OpenAI-compatible** inference provider to classify multilingual sentiment.

- Base URL: `https://paraloncloud.com/v1`
- Reference page: `https://paraloncloud.com/inference`

### Endpoints used

- `POST /v1/chat/completions` – performs classification
- `GET /v1/models` – used to detect available models and fallback if a configured model is unavailable

### Model selection behavior

Environment variables:

- `PARALON_BASE_URL` (default `https://paraloncloud.com/v1`)
- `PARALON_API_KEY`
- `PARALON_MODEL` (default `qwen3-8b`)

At runtime the bot:

1. Attempts to call with `PARALON_MODEL`
2. If the provider returns “model not found / not available”, the bot:
   - fetches `/v1/models`
   - prefers `qwen3-8b` if present, otherwise uses the first available model

This avoids hard failures when a model shown in UI is not accessible to a particular API key.

Implementation: `src/services/paralon.ts`

### Prompt + JSON contract

The classifier is prompted to return **strict JSON**:

```json
{
  "label": "positive|neutral|negative",
  "confidence": 0.0,
  "language": "en",
  "rationale": "..."
}
```

The bot stores:
- the raw JSON (`Submission.llmRawJson`)
- derived fields (`llmLabel`, `llmConfidence`, `llmLanguage`)

### Approval logic

For submissions:
- `bullish === false` → reject
- `bullish === undefined` → pending review (but still runs the LLM and stores results)
- `bullish === true`:
  - auto-approve if `label === "positive"` AND `confidence >= sentimentMinConfidence`
  - otherwise pending review

The `sentimentMinConfidence` value is:
- configured per guild in `GuildConfig.sentimentMinConfidence`
- defaulted from env `DEFAULT_SENTIMENT_MIN_CONFIDENCE`

### Troubleshooting

#### “Model not found or not available”

Actions:
- Set `PARALON_MODEL` to an available model from `GET /v1/models` (e.g. `qwen3-8b`).
- Or rely on the bot’s fallback behavior (ensure you’re on a recent image).

#### JSON parsing failures

If the model returns non-JSON output, the bot attempts to salvage the first JSON object from the response.
If failures persist, reduce temperature (already `0`) or choose a more instruction-following model.

