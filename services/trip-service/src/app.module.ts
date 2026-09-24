import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { validateEnv } from './config/env.schema';
import { TripsModule } from './trips/trips.module';
import { HealthController, REDIS_CLIENT } from './health/health.controller';
import { TripEntity } from './trips/entities/trip.entity';
import { TripDayEntity } from './trips/entities/trip-day.entity';
import { TripStopEntity } from './trips/entities/trip-stop.entity';
import { TripStopTagEntity } from './trips/entities/trip-stop-tag.entity';
import { UserTravelBudgetEntity } from './budget/user-travel-budget.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env', validate: validateEnv }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mssql' as const,
        host: config.getOrThrow<string>('DB_HOST'),
        port: config.get<number>('DB_PORT') ?? 1433,
        username: config.getOrThrow<string>('DB_USERNAME'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.getOrThrow<string>('DB_NAME'),
        options: { encrypt: false, trustServerCertificate: true, useUTC: true },
        entities: [TripEntity, TripDayEntity, TripStopEntity, TripStopTagEntity, UserTravelBudgetEntity],
        synchronize: config.get('DB_SYNC') === '1' || config.get('NODE_ENV') !== 'production',
      }),
    }),
    TripsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis({
          host: config.get('REDIS_HOST'),
          port: config.get('REDIS_PORT'),
          maxRetriesPerRequest: null,
        }),
    },
  ],
})
export class AppModule {}
