import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import Redis from 'ioredis';
import { IDEMPOTENCY_STORE } from '@tripblogger/observability';
import { validateEnv } from './config/env.schema';
import { geoDataSourceOptions, geoEntities } from './database/data-source';
import { HealthController } from './health/health.controller';
import { REDIS_CLIENT } from './redis.tokens';
import { SearchService } from './search/search.service';
import { TypesensePlaces } from './search/typesense.client';
import { MapController } from './map/map.controller';
import { PhotonClient } from './geocode/photon.client';
import { OsrmRoutingProvider } from './routing/osrm.routing.provider';
import { ContributeService } from './contribute/contribute.service';
import { ContributeController } from './contribute/contribute.controller';
import { PlacesReadController } from './places/places.controller';
import { InternalController } from './internal/internal.controller';
import { CompatController } from './aliases/compat.controller';
import { JwksAuthGuard } from './auth/jwks-auth.guard';
import { ClaimStatusesGuard, RolesGuard } from './auth/claim-statuses.guard';
import { OutboxPollerService } from './outbox/outbox-poller.service';

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
      useFactory: () => geoDataSourceOptions(),
    }),
    TypeOrmModule.forFeature(geoEntities),
  ],
  controllers: [
    HealthController,
    MapController,
    ContributeController,
    PlacesReadController,
    InternalController,
    CompatController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    SearchService,
    TypesensePlaces,
    PhotonClient,
    OsrmRoutingProvider,
    ContributeService,
    OutboxPollerService,
    JwksAuthGuard,
    ClaimStatusesGuard,
    RolesGuard,
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
    { provide: IDEMPOTENCY_STORE, useExisting: REDIS_CLIENT },
  ],
})
export class AppModule {}
