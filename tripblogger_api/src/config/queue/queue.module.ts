import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

export const EMAIL_QUEUE = 'EMAIL_QUEUE';
export const IMAGE_QUEUE = 'IMAGE_QUEUE';

@Global()
@Module({
  providers: [
    {
      provide: EMAIL_QUEUE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new Queue('email', {
          connection: {
            host: configService.get<string>('REDIS_HOST'),
            port: configService.get<number>('REDIS_PORT'),
          },
        }),
    },
    {
      provide: IMAGE_QUEUE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new Queue('image-processing', {
          connection: {
            host: configService.get<string>('REDIS_HOST'),
            port: configService.get<number>('REDIS_PORT'),
          },
        }),
    },
  ],
  exports: [EMAIL_QUEUE, IMAGE_QUEUE],
})
export class QueueModule {}
