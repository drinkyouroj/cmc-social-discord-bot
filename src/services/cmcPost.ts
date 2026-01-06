import type { ApifyPostItem } from './apify.js';

export type NormalizedCmcPost = {
  stableId: string;
  url: string;
  ownerHandle: string;
  textContent: string;
  postTimeMs: bigint;
  bullish?: boolean;
};

function mustString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Missing ${field}`);
  return value;
}

export function normalizeCmcPost(item: ApifyPostItem): NormalizedCmcPost {
  const id = item?.raw?.id ?? item?.raw?.raw?.gravityId ?? item?.raw?.raw?.raw?.gravityId;
  const stableId =
    typeof item.stableId === 'string' && item.stableId.length > 0
      ? item.stableId
      : typeof id === 'string' && id.length > 0
        ? `cmc-community:post:${id}`
        : mustString(undefined, 'stableId');

  const url = mustString(item?.source?.url ?? item?.raw?.url ?? item?.raw?.raw?.url, 'url');
  const ownerHandle = mustString(item?.raw?.raw?.owner?.handle, 'owner.handle');
  const textContent = mustString(item?.raw?.raw?.textContent ?? item?.text, 'textContent');

  const postTimeRaw = item?.raw?.raw?.postTime;
  const postTimeMs = BigInt(mustString(postTimeRaw, 'postTime'));

  const bullishRaw = item?.raw?.raw?.raw?.bullish ?? item?.raw?.raw?.bullish;
  const bullish = typeof bullishRaw === 'boolean' ? bullishRaw : undefined;

  return {
    stableId,
    url,
    ownerHandle,
    textContent,
    postTimeMs,
    bullish
  };
}

export function extractCmcPostIdOrUrl(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/coinmarketcap\.com\/community\/post\/(\d+)/i);
  if (match) return match[1];
  return trimmed;
}

