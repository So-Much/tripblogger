import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env/env.schema';
import { THROTTLE_DEFAULT } from './config/http-security';
import { typeOrmOptionsFactory } from './config/db/typeorm.options';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { PostsModule } from './modules/posts/posts.module';
import { CompositionsModule } from './modules/compositions/compositions.module';
import { CommerceModule } from './modules/commerce/commerce.module';
import { PlacesModule } from './modules/places/places.module';
import { LocationsModule } from './modules/locations/locations.module';
import { MapModule } from './modules/map/map.module';
import { TripsModule } from './modules/trips/trips.module';
import { RedisModule } from './config/redis/redis.module';
import { QueueModule } from './config/queue/queue.module';
import { OtelModule } from './config/otel/otel.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot({
      throttlers: [THROTTLE_DEFAULT],
    }),
    TypeOrmModule.forRootAsync(typeOrmOptionsFactory),
    RedisModule,
    QueueModule,
    OtelModule,
    HealthModule,
    UsersModule,
    AuthModule,
    PostsModule,
    CompositionsModule,
    CommerceModule,
    PlacesModule,
    LocationsModule,
    MapModule,
    TripsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
