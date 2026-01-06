import { ApifyClient } from 'apify-client';
import { env } from '../env.js';
import { logger } from '../logger.js';

export type ApifyPostItem = {
  platform?: string;
  stableId?: string;
  text?: string;
  source?: { url?: string };
  raw?: any;
};

type ApifyTaskRun = {
  id: string;
  status: string;
  defaultDatasetId?: string;
};

const client = new ApifyClient({ token: env.APIFY_TOKEN });

export async function fetchCmcPostViaTask(postIdOrUrl: string): Promise<{
  runId: string;
  datasetId: string;
  item: ApifyPostItem;
}> {
  // The Task is preconfigured; we only need to override the nested postIdOrUrl field.
  // We keep the rest of the structure identical to the user-provided template.
  const input = {
    caseInsensitive: true,
    debug: { maxItemsPerDataset: 1000 },
    dedupe: { enabled: true, maxSeenIdsPerPlatform: 5000 },
    match: { symbols: ['DGRAM'], caseInsensitive: true, useWordBoundaries: false },
    notify: { webhookUrl: '' },
    platformRuns: [
      {
        name: 'coinmarketcap-community',
        actorId: 'cmc/community-post',
        input: {
          postIdOrUrl,
          includeComments: true,
          maxComments: 50
        }
      }
    ],
    symbols: ['DGRAM', 'Datagram Network'],
    useWordBoundaries: false
  };

  logger.info({ postIdOrUrl }, 'Apify: starting task run');
  const run = (await client.task(env.APIFY_TASK_ID).call(input)) as unknown as ApifyTaskRun;
  const runId = run.id;
  const datasetId = run.defaultDatasetId;
  if (!datasetId) {
    throw new Error('Apify run did not return defaultDatasetId');
  }

  const startedAt = Date.now();
  const timeoutMs = env.APIFY_TASK_TIMEOUT_MS;
  const pollEveryMs = 2_000;

  while (true) {
    const elapsed = Date.now() - startedAt;
    if (elapsed > timeoutMs) {
      throw new Error(`Timed out waiting for Apify dataset items after ${timeoutMs}ms (runId=${runId})`);
    }

    const list = await client.dataset(datasetId).listItems({ limit: 1, clean: true });
    const items = (list.items ?? []) as ApifyPostItem[];
    if (items.length > 0) {
      logger.info({ runId, datasetId, elapsedMs: elapsed }, 'Apify: got dataset item');
      return { runId, datasetId, item: items[0] };
    }

    await new Promise((r) => setTimeout(r, pollEveryMs));
  }
}

