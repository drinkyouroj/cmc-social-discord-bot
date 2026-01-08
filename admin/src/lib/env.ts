import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DISCORD_TOKEN: z.string().min(1), // bot token (used for role checks)
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_OAUTH_CLIENT_SECRET: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),

  DEFAULT_ADMIN_DISCORD_USER_ID: z.string().min(1).default('426250619435614208')
});

export const env = EnvSchema.parse(process.env);

