import OpenAI from 'openai';
import { env } from '../env.js';

export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export type SentimentResult = {
  label: SentimentLabel;
  confidence: number; // 0..1
  language: string; // BCP-47-ish, best effort
  rationale: string;
};

const client = new OpenAI({
  apiKey: env.PARALON_API_KEY,
  baseURL: env.PARALON_BASE_URL
});

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export async function classifySentiment(text: string): Promise<{ result: SentimentResult; rawJson: unknown }> {
  // ParalonCloud is OpenAI-compatible (see screenshot); use chat.completions.
  // We force a strict JSON-only response for reliable parsing.
  const prompt = [
    'You are a sentiment classifier for CoinMarketCap community posts.',
    'Classify the overall sentiment expressed in the text (multilingual).',
    'Return STRICT JSON only (no markdown) matching this schema:',
    '{',
    '  "label": "positive" | "neutral" | "negative",',
    '  "confidence": number between 0 and 1,',
    '  "language": string (detected language code, e.g. "en", "es", "zh"),',
    '  "rationale": string (brief, 1-2 sentences)',
    '}',
    'Be conservative: if mixed or unclear, choose "neutral".'
  ].join('\n');

  const resp = await client.chat.completions.create({
    model: env.PARALON_MODEL,
    temperature: 0,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: text }
    ]
  });

  const content = resp.choices?.[0]?.message?.content ?? '';
  let rawJson: unknown;
  try {
    rawJson = JSON.parse(content);
  } catch {
    // Try to salvage by extracting the first JSON object.
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('LLM did not return valid JSON');
    rawJson = JSON.parse(match[0]);
  }

  const obj = rawJson as any;
  const label = obj?.label as SentimentLabel;
  const confidence = clamp01(Number(obj?.confidence));
  const language = typeof obj?.language === 'string' && obj.language.length > 0 ? obj.language : 'unknown';
  const rationale = typeof obj?.rationale === 'string' ? obj.rationale : '';

  if (label !== 'positive' && label !== 'neutral' && label !== 'negative') {
    throw new Error('LLM returned invalid label');
  }

  return {
    result: { label, confidence, language, rationale },
    rawJson
  };
}

