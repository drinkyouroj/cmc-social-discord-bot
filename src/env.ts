import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const EnvSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1).optional(),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  APIFY_TOKEN: z.string().min(1),
  APIFY_TASK_ID: z.string().min(1),
  APIFY_TASK_TIMEOUT_MS: z.coerce.number().int().positive().default(90_000),

  PARALON_BASE_URL: z.string().url().default('https://paraloncloud.com/v1'),
  PARALON_API_KEY: z.string().min(1),
  // Note: availability depends on ParalonCloud API key; we default to a commonly-available model.
  PARALON_MODEL: z.string().min(1).default('qwen3-8b'),

  DEFAULT_MAX_POST_AGE_DAYS: z.coerce.number().int().positive().default(7),
  DEFAULT_SENTIMENT_MIN_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.65),

  // Seed admin allowlist on first guild config creation (useful for initial bootstrap).
  DEFAULT_ADMIN_DISCORD_USER_ID: z.string().min(1).default('426250619435614208'),

  LOG_LEVEL: z.string().default('info')
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);

