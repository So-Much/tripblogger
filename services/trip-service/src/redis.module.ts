import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { IDEMPOTENCY_STORE } from '@tripblogger/observability';
import { REDIS_CLIENT } from './health/health.controller';

@Global()
@Module({
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
    { provide: IDEMPOTENCY_STORE, useExisting: REDIS_CLIENT },
  ],
  exports: [REDIS_CLIENT, IDEMPOTENCY_STORE],
})
export class RedisModule {}
