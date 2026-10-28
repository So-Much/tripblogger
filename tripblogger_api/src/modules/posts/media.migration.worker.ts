import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue, Worker } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { PostEntity } from './entities/post.entity';
import { PostMediaEntity } from './entities/post-media.entity';
import { MediaEntity } from '../media/entities/media.entity';
import { Repository } from 'typeorm';
import { IMAGE_QUEUE } from '../../config/queue/queue.module';
import { keyFromUploadPath, OBJECT_STORAGE, type ObjectStorage } from '../../config/storage/object-storage';

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
};

/**
 * Moves media written to the container disk (before object storage existed) into the bucket.
 * Keys stay identical, so the stored `/uploads/...` URLs keep working through Traefik.
 */
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
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
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

  private async uploadIfOnDisk(path: string | null | undefined): Promise<boolean> {
    const key = keyFromUploadPath(path);
    if (!key) return false;
    const absolute = join(process.cwd(), 'uploads', key);
    if (!existsSync(absolute)) return false;
    if (await this.storage.exists(key)) return true;
    const ext = key.split('.').pop()?.toLowerCase() ?? '';
    await this.storage.put(key, await readFile(absolute), MIME_BY_EXT[ext] ?? 'application/octet-stream');
    return true;
  }

  private async migratePostMedia(postId: string) {
    if (this.storage.driver !== 's3') return;
    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post) return;

    const links = await this.postMediaRepo.find({
      where: { postId },
      relations: ['media'],
      order: { position: 'ASC' },
    });

    const changed: MediaEntity[] = [];
    for (const link of links) {
      const row = link.media;
      if (!row || row.storage === 'cloud') continue;
      const moved = await this.uploadIfOnDisk(row.sourcePath ?? row.originalUrl ?? row.url);
      await this.uploadIfOnDisk(row.previewUrl);
      await this.uploadIfOnDisk(row.thumbnailUrl);
      if (moved) {
        row.storage = 'cloud';
        changed.push(row);
      }
    }

    if (changed.length) {
      await this.mediaRepo.save(changed);
      this.logger.log(`Moved ${changed.length} media file(s) of post ${postId} to object storage`);
    }
  }
}
