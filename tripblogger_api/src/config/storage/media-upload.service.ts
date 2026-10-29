import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import sharp from 'sharp';
import { OBJECT_STORAGE, uploadPathFromKey, type ObjectStorage } from './object-storage';

export type UploadedBuffer = { buffer: Buffer; mimetype: string; originalname?: string; size: number };

export type StoredUpload = {
  originalPath: string;
  previewPath?: string;
  thumbnailPath?: string;
  width?: number;
  height?: number;
  placeholder?: string;
};

@Injectable()
export class MediaUploadService {
  constructor(@Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage) {}

  get driver(): ObjectStorage['driver'] {
    return this.storage.driver;
  }

  private newName(file: UploadedBuffer, fallbackExt: string): string {
    const ext = extname(file.originalname ?? '').toLowerCase() || fallbackExt;
    return `${Date.now()}-${randomUUID()}${ext}`;
  }

  /** Original + webp preview/thumbnail + tiny inline placeholder (images only). */
  async storeMedia(folder: 'posts' | 'commerce', file: UploadedBuffer, kind: 'image' | 'video'): Promise<StoredUpload> {
    const name = this.newName(file, '.bin');
    const originalKey = `${folder}/${name}`;
    await this.storage.put(originalKey, file.buffer, file.mimetype);
    if (kind !== 'image') return { originalPath: uploadPathFromKey(originalKey) };

    const oriented = sharp(file.buffer).rotate();
    const meta = await oriented.metadata();
    const [thumb, preview, tiny] = await Promise.all([
      oriented.clone().resize(320, 320, { fit: 'inside' }).webp({ quality: 72 }).toBuffer(),
      oriented.clone().resize(1280, 1280, { fit: 'inside' }).webp({ quality: 82 }).toBuffer(),
      oriented.clone().resize(24, 24, { fit: 'inside' }).webp({ quality: 35 }).toBuffer(),
    ]);
    const thumbKey = `${folder}/variants/${name}-thumb.webp`;
    const previewKey = `${folder}/variants/${name}-preview.webp`;
    await Promise.all([
      this.storage.put(thumbKey, thumb, 'image/webp'),
      this.storage.put(previewKey, preview, 'image/webp'),
    ]);
    return {
      originalPath: uploadPathFromKey(originalKey),
      thumbnailPath: uploadPathFromKey(thumbKey),
      previewPath: uploadPathFromKey(previewKey),
      width: meta.width,
      height: meta.height,
      placeholder: `data:image/webp;base64,${tiny.toString('base64')}`,
    };
  }

  async storeAvatar(file: UploadedBuffer): Promise<string> {
    const key = `avatars/${this.newName(file, '.jpg')}`;
    await this.storage.put(key, file.buffer, file.mimetype);
    return uploadPathFromKey(key);
  }
}
