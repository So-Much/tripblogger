import { createReadStream, existsSync, mkdirSync, statSync } from 'fs';
import { writeFile } from 'fs/promises';
import { dirname, join, normalize, sep } from 'path';
import type { Readable } from 'stream';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

export const OBJECT_STORAGE = 'OBJECT_STORAGE';

/** Public URL prefix. Traefik routes it to the storage backend, so stored URLs never change. */
export const UPLOADS_PREFIX = '/uploads/';

export type StoredObject = { body: Readable; contentType?: string; contentLength?: number };

export interface ObjectStorage {
  readonly driver: 'local' | 's3';
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  exists(key: string): Promise<boolean>;
  /** Cheap check usable while serializing lists; S3 answers `true` instead of one HEAD per item. */
  probablyExists(key: string): boolean;
  ensureReady(): Promise<void>;
}

/** `/uploads/posts/a.jpg` or `http://host/uploads/posts/a.jpg` → `posts/a.jpg`. */
export function keyFromUploadPath(pathOrUrl: string | undefined | null): string | null {
  if (!pathOrUrl) return null;
  let path = pathOrUrl;
  if (!path.startsWith('/')) {
    try {
      path = new URL(pathOrUrl).pathname;
    } catch {
      return null;
    }
  }
  if (!path.startsWith(UPLOADS_PREFIX)) return null;
  const key = path.slice(UPLOADS_PREFIX.length);
  if (!key || key.split('/').some((part) => part === '..' || part === '')) return null;
  return key;
}

export function uploadPathFromKey(key: string): string {
  return `${UPLOADS_PREFIX}${key}`;
}

export class LocalObjectStorage implements ObjectStorage {
  readonly driver = 'local' as const;

  constructor(private readonly root = join(process.cwd(), 'uploads')) {}

  private resolve(key: string): string {
    const full = normalize(join(this.root, key));
    if (!full.startsWith(normalize(this.root) + sep)) throw new Error('invalid object key');
    return full;
  }

  async ensureReady() {
    mkdirSync(this.root, { recursive: true });
  }

  async put(key: string, body: Buffer, _contentType?: string) {
    const full = this.resolve(key);
    mkdirSync(dirname(full), { recursive: true });
    await writeFile(full, body);
  }

  async get(key: string): Promise<StoredObject | null> {
    const full = this.resolve(key);
    if (!existsSync(full)) return null;
    return { body: createReadStream(full), contentLength: statSync(full).size };
  }

  async exists(key: string) {
    return existsSync(this.resolve(key));
  }

  probablyExists(key: string) {
    return existsSync(this.resolve(key));
  }
}

export type S3StorageOptions = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

/** Any S3-compatible store; in compose this is a self-hosted SeaweedFS container. */
export class S3ObjectStorage implements ObjectStorage {
  readonly driver = 's3' as const;
  private readonly client: S3Client;

  constructor(private readonly opts: S3StorageOptions) {
    this.client = new S3Client({
      endpoint: opts.endpoint,
      region: opts.region,
      forcePathStyle: true,
      credentials: { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey },
    });
  }

  async ensureReady() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.opts.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.opts.bucket }));
    }
  }

  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.opts.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Keys are random and never overwritten, so clients may cache forever.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.opts.bucket, Key: key }));
      return {
        body: res.Body as Readable,
        contentType: res.ContentType,
        contentLength: res.ContentLength,
      };
    } catch (err) {
      if ((err as { name?: string }).name === 'NoSuchKey') return null;
      throw err;
    }
  }

  async exists(key: string) {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.opts.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  probablyExists() {
    return true;
  }
}
