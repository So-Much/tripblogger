import { z } from 'zod';

export function validateEnv(config: Record<string, unknown>) {
  return z
    .object({
      NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
      PORT: z.coerce.number().default(3002),
      DB_HOST: z.string(),
      DB_PORT: z.coerce.number().default(1433),
      DB_USERNAME: z.string(),
      DB_PASSWORD: z.string(),
      DB_NAME: z.string().default('tripblogger_trips'),
      DB_SYNC: z.string().optional(),
      REDIS_HOST: z.string().default('127.0.0.1'),
      REDIS_PORT: z.coerce.number().default(6379),
      CORE_JWKS_URL: z.string().optional(),
      JWT_ACCESS_SECRET: z.string().min(16),
      GEO_BASE_URL: z.string().default('http://127.0.0.1:3003'),
      GEO_INTERNAL_TOKEN: z.string().min(8),
    })
    .parse(config);
}
