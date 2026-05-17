import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue, Worker } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { PostEntity } from './entities/post.entity';
import { PostMediaEntity } from './entities/post-media.entity';
import { MediaEntity } from '../media/entities/media.entity';
import { Repository } from 'typeorm';
import { IMAGE_QUEUE } from '../../config/queue/queue.module';

@Injectable()
export class MediaMigrationWorker implements OnModuleInit {
  private readonly logger = new Logger(MediaMigrationWorker.name);
  private worker?: Worker;

  constructor(
    @InjectRepository(PostEntity) private readonly postsRepo: Repository<PostEntity>,
    @InjectRepository(PostMediaEntity) private readonly postMediaRepo: Repository<PostMediaEntity>,
    @InjectRepository(MediaEntity) private readonly mediaRepo: Repository<MediaEntity>,
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
    if (!post) return;

    const links = await this.postMediaRepo.find({
      where: { postId },
      relations: ['media'],
      order: { position: 'ASC' },
    });
    if (!links.length) return;

    const cloudRoot = join(process.cwd(), 'uploads', 'cloud-posts');
    if (!existsSync(cloudRoot)) mkdirSync(cloudRoot, { recursive: true });

    let changed = false;
    for (const link of links) {
      const row = link.media;
      if (!row || row.storage === 'cloud' || !row.sourcePath) continue;
      const sourceAbsolute = join(
        process.cwd(),
        row.sourcePath.startsWith('/') ? row.sourcePath.slice(1) : row.sourcePath,
      );
      if (!existsSync(sourceAbsolute)) continue;
      const baseName = sourceAbsolute.split(/[\\/]/).pop() ?? `media-${Date.now()}.bin`;
      const targetAbsolute = join(cloudRoot, baseName);
      copyFileSync(sourceAbsolute, targetAbsolute);
      const cloudPath = `/uploads/cloud-posts/${baseName}`;
      row.storage = 'cloud';
      row.sourcePath = cloudPath;
      row.originalUrl = cloudPath;
      row.url = cloudPath;
      changed = true;
    }

    if (changed) {
      await this.mediaRepo.save(links.map((l) => l.media).filter(Boolean) as MediaEntity[]);
      this.logger.log(`Migrated media for post ${postId}`);
    }
  }
}
