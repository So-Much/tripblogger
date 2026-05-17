import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env/env.schema';
import { typeOrmOptionsFactory } from './config/db/typeorm.options';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { PostsModule } from './modules/posts/posts.module';
import { CompositionsModule } from './modules/compositions/compositions.module';
import { CommerceModule } from './modules/commerce/commerce.module';
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
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
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
  ],
})
export class AppModule {}
