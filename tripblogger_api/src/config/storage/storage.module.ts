import { Global, Logger, Module, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalObjectStorage, OBJECT_STORAGE, S3ObjectStorage, type ObjectStorage } from './object-storage';
import { MediaUploadService } from './media-upload.service';

@Global()
@Module({
  providers: [
    {
      provide: OBJECT_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ObjectStorage => {
        if (config.get<string>('STORAGE_DRIVER') !== 's3') return new LocalObjectStorage();
        return new S3ObjectStorage({
          endpoint: config.getOrThrow<string>('S3_ENDPOINT'),
          region: config.get<string>('S3_REGION') ?? 'us-east-1',
          bucket: config.get<string>('S3_BUCKET') ?? 'uploads',
          accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY'),
          secretAccessKey: config.getOrThrow<string>('S3_SECRET_KEY'),
        });
      },
    },
    MediaUploadService,
  ],
  exports: [OBJECT_STORAGE, MediaUploadService],
})
export class StorageModule implements OnModuleInit {
  private readonly logger = new Logger(StorageModule.name);

  constructor(@Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage) {}

  async onModuleInit() {
    for (let attempt = 1; attempt <= 10; attempt++) {
      try {
        await this.storage.ensureReady();
        this.logger.log(`Object storage ready (driver=${this.storage.driver})`);
        return;
      } catch (err) {
        this.logger.warn(`Object storage not ready (attempt ${attempt}): ${err instanceof Error ? err.message : err}`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    throw new Error('Object storage unavailable');
  }
}
