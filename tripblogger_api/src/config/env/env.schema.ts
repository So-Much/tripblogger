import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  ADMIN_SECRET: z.string().min(16),
  GOOGLE_OAUTH_AUDIENCES: z.string().min(1),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().optional(),
  DB_INSTANCE: z.string().optional(),
  DB_USERNAME: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.coerce.number().default(6379),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  LOG_HTTP_PRETTY: z.string().optional(),
  LOG_HTTP_INCLUDE_HEADERS: z.string().optional(),
  LOG_HTTP_INCLUDE_PARAMS: z.string().optional(),
  LOG_HTTP_INCLUDE_CONTENT_TYPE: z.string().optional(),
  LOG_HTTP_INCLUDE_COOKIE: z.string().optional(),
  LOG_HTTP_INCLUDE_REQUEST: z.string().optional(),
  LOG_HTTP_INCLUDE_RESPONSE: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): AppEnv {
  return envSchema.parse(config);
}
