import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.schema';
import { tripDataSourceOptions } from './database/data-source';
import { TripsModule } from './trips/trips.module';
import { HealthController } from './health/health.controller';
import { TripStopEntity } from './trips/entities/trip-stop.entity';
import { PlaceSyncService } from './events/place-sync.service';
import { PlaceEventsConsumer } from './events/place-events.consumer';
import { RedisModule } from './redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env', validate: validateEnv }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ ttl: 60_000, limit: config.get<number>('THROTTLE_LIMIT') ?? 300 }],
      }),
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => tripDataSourceOptions(),
    }),
    TypeOrmModule.forFeature([TripStopEntity]),
    RedisModule,
    TripsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }, PlaceSyncService, PlaceEventsConsumer],
})
export class AppModule {}

