import 'dotenv/config';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { PlaceEntity } from '../entities/place.entity';
import { PlaceContributionEntity } from '../entities/place-contribution.entity';
import { PlaceOutboxEntity } from '../entities/place-outbox.entity';
import { PlaceReviewEntity } from '../entities/place-review.entity';
import { SavedPlaceEntity } from '../entities/saved-place.entity';
import { CheckinEntity } from '../entities/checkin.entity';
import { migrations } from './migrations';

export const geoEntities = [
  PlaceEntity,
  PlaceContributionEntity,
  PlaceOutboxEntity,
  PlaceReviewEntity,
  SavedPlaceEntity,
  CheckinEntity,
];

type Env = Record<string, string | undefined>;

/** Schema is owned by migrations; `synchronize` stays off in every environment. */
export function geoDataSourceOptions(env: Env = process.env): DataSourceOptions {
  return {
    type: 'mssql',
    host: env.DB_HOST ?? '127.0.0.1',
    port: Number(env.DB_PORT ?? 1433),
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME ?? 'tripblogger_geo',
    options: { encrypt: false, trustServerCertificate: true, useUTC: true },
    entities: geoEntities,
    migrations,
    migrationsTableName: 'typeorm_migrations',
    migrationsRun: env.DB_MIGRATE_ON_BOOT !== '0',
    synchronize: false,
  };
}

export default new DataSource(geoDataSourceOptions());
