import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3003),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().default(1433),
  DB_USERNAME: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string().default('tripblogger_geo'),
  DB_SYNC: z.string().optional(),
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.coerce.number().default(6379),
  TYPESENSE_HOST: z.string().default('127.0.0.1'),
  TYPESENSE_PORT: z.coerce.number().default(8108),
  TYPESENSE_API_KEY: z.string().default('xyz'),
  PHOTON_URL: z.string().default('http://127.0.0.1:2322'),
  OSRM_BASE_URL: z.string().default('https://routing.openstreetmap.de'),
  CORE_JWKS_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(16),
  GEO_INTERNAL_TOKEN: z.string().min(8),
  ADMIN_SECRET: z.string().min(16),
});

export type GeoEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): GeoEnv {
  return envSchema.parse(config);
}
