import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';

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
    {
      provide: 'QUEUE_WORKERS',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const connection = {
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
        };
        const imageWorker = new Worker(
          'image-processing',
          async (job) => ({ ...job.data, processed: true }),
          { connection },
        );
        const emailWorker = new Worker(
          'email',
          async (job) => ({ ...job.data, sent: true }),
          { connection },
        );
        return [imageWorker, emailWorker];
      },
    },
  ],
  exports: [EMAIL_QUEUE, IMAGE_QUEUE],
})
export class QueueModule {}
