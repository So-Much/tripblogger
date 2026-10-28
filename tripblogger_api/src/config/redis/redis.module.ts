import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { IDEMPOTENCY_STORE } from '@tripblogger/observability';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new Redis({
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
          maxRetriesPerRequest: null,
        }),
    },
    { provide: IDEMPOTENCY_STORE, useExisting: REDIS_CLIENT },
  ],
  exports: [REDIS_CLIENT, IDEMPOTENCY_STORE],
})
export class RedisModule {}
