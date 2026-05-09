import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue, Worker } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { PostEntity } from './entities/post.entity';
import { Repository } from 'typeorm';
import { IMAGE_QUEUE } from '../../config/queue/queue.module';
import { normalizePostMediaItem, PostMediaItem } from './media.types';

@Injectable()
export class MediaMigrationWorker implements OnModuleInit {
  private readonly logger = new Logger(MediaMigrationWorker.name);
  private worker?: Worker;

  constructor(
    @InjectRepository(PostEntity) private readonly postsRepo: Repository<PostEntity>,
    @Inject(IMAGE_QUEUE) private readonly imageQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const connection = {
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT'),
    };
    this.worker = new Worker(
      'image-processing',
      async (job) => {
        if (job.name !== 'migrate-local-media') return;
        await this.migratePostMedia(job.data.postId as string);
      },
      { connection },
    );
  }

  async enqueuePostMediaMigration(postId: string) {
    await this.imageQueue.add('migrate-local-media', { postId }, { removeOnComplete: 1000, removeOnFail: 1000 });
  }

  private async migratePostMedia(postId: string) {
    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post?.mediaJson) return;
    const rawItems = JSON.parse(post.mediaJson) as Array<Record<string, unknown>>;
    const media = rawItems.map((item) => normalizePostMediaItem(item));
    const cloudRoot = join(process.cwd(), 'uploads', 'cloud-posts');
    if (!existsSync(cloudRoot)) mkdirSync(cloudRoot, { recursive: true });

    let changed = false;
    const migrated: PostMediaItem[] = media.map((item) => {
      if (item.storage === 'cloud' || !item.sourcePath) return item;
      const sourceAbsolute = join(process.cwd(), item.sourcePath.startsWith('/') ? item.sourcePath.slice(1) : item.sourcePath);
      if (!existsSync(sourceAbsolute)) return item;
      const baseName = sourceAbsolute.split(/[\\/]/).pop() ?? `media-${Date.now()}.bin`;
      const targetAbsolute = join(cloudRoot, baseName);
      copyFileSync(sourceAbsolute, targetAbsolute);
      changed = true;
      return {
        ...item,
        storage: 'cloud',
        migratedAt: new Date().toISOString(),
        sourcePath: `/uploads/cloud-posts/${baseName}`,
        originalUrl: `/uploads/cloud-posts/${baseName}`,
        url: `/uploads/cloud-posts/${baseName}`,
      };
    });

    if (changed) {
      post.mediaJson = JSON.stringify(migrated);
      await this.postsRepo.save(post);
      this.logger.log(`Migrated media for post ${postId}`);
    }
  }
}
