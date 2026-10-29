import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { keyFromUploadPath, LocalObjectStorage, uploadPathFromKey } from './object-storage';

describe('keyFromUploadPath', () => {
  it('accepts relative and absolute upload URLs', () => {
    expect(keyFromUploadPath('/uploads/posts/a.jpg')).toBe('posts/a.jpg');
    expect(keyFromUploadPath('http://localhost:3000/uploads/posts/variants/a.webp')).toBe('posts/variants/a.webp');
    expect(uploadPathFromKey('avatars/x.png')).toBe('/uploads/avatars/x.png');
  });

  it('rejects traversal and foreign paths', () => {
    expect(keyFromUploadPath('/uploads/../secrets.pem')).toBeNull();
    expect(keyFromUploadPath('/api/posts')).toBeNull();
    expect(keyFromUploadPath('https://cdn.example.com/x.jpg')).toBeNull();
    expect(keyFromUploadPath(undefined)).toBeNull();
  });
});

describe('LocalObjectStorage', () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'tb-storage-'));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('round-trips an object', async () => {
    const storage = new LocalObjectStorage(root);
    await storage.put('posts/variants/a.webp', Buffer.from('hello'), 'image/webp');
    expect(await storage.exists('posts/variants/a.webp')).toBe(true);
    expect(storage.probablyExists('posts/variants/a.webp')).toBe(true);
    const obj = await storage.get('posts/variants/a.webp');
    const chunks: Buffer[] = [];
    for await (const c of obj!.body) chunks.push(c as Buffer);
    expect(Buffer.concat(chunks).toString()).toBe('hello');
    expect(await storage.get('missing.jpg')).toBeNull();
  });
});
