import 'dotenv/config';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { TripEntity } from '../trips/entities/trip.entity';
import { TripDayEntity } from '../trips/entities/trip-day.entity';
import { TripStopEntity } from '../trips/entities/trip-stop.entity';
import { TripStopTagEntity } from '../trips/entities/trip-stop-tag.entity';
import { UserTravelBudgetEntity } from '../budget/user-travel-budget.entity';
import { migrations } from './migrations';

export const tripEntities = [TripEntity, TripDayEntity, TripStopEntity, TripStopTagEntity, UserTravelBudgetEntity];

type Env = Record<string, string | undefined>;

/** Schema is owned by migrations; `synchronize` stays off in every environment. */
export function tripDataSourceOptions(env: Env = process.env): DataSourceOptions {
  return {
    type: 'mssql',
    host: env.DB_HOST ?? '127.0.0.1',
    port: Number(env.DB_PORT ?? 1433),
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME ?? 'tripblogger_trips',
    options: { encrypt: false, trustServerCertificate: true, useUTC: true },
    entities: tripEntities,
    migrations,
    migrationsTableName: 'typeorm_migrations',
    migrationsRun: env.DB_MIGRATE_ON_BOOT !== '0',
    synchronize: false,
  };
}

export default new DataSource(tripDataSourceOptions());
