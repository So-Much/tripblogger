import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { validateEnv } from './config/env.schema';
import { PlaceEntity } from './entities/place.entity';
import { PlaceContributionEntity } from './entities/place-contribution.entity';
import { PlaceOutboxEntity } from './entities/place-outbox.entity';
import { PlaceReviewEntity } from './entities/place-review.entity';
import { SavedPlaceEntity } from './entities/saved-place.entity';
import { CheckinEntity } from './entities/checkin.entity';
import { HealthController, REDIS_CLIENT } from './health/health.controller';
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

const entities = [
  PlaceEntity,
  PlaceContributionEntity,
  PlaceOutboxEntity,
  PlaceReviewEntity,
  SavedPlaceEntity,
  CheckinEntity,
];

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
        entities,
        synchronize: config.get('DB_SYNC') === '1' || config.get('NODE_ENV') !== 'production',
      }),
    }),
    TypeOrmModule.forFeature(entities),
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
    SearchService,
    TypesensePlaces,
    PhotonClient,
    OsrmRoutingProvider,
    ContributeService,
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
  ],
})
export class AppModule {}
