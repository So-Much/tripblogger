import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadAccessPrivateKey, loadAccessPublicKey } from './jwt-keys';

describe('jwt-keys', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('returns undefined when no key is configured', () => {
    delete process.env.JWT_ACCESS_PRIVATE_KEY;
    delete process.env.JWT_ACCESS_PRIVATE_KEY_PATH;
    expect(loadAccessPrivateKey()).toBeUndefined();
  });

  it('reads the key from the configured path', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'jwt-')), 'public.pem');
    writeFileSync(file, 'PEM');
    delete process.env.JWT_ACCESS_PUBLIC_KEY;
    process.env.JWT_ACCESS_PUBLIC_KEY_PATH = file;
    expect(loadAccessPublicKey()).toBe('PEM');
  });

  it('throws instead of silently falling back to HS256 when the path is unreadable', () => {
    delete process.env.JWT_ACCESS_PRIVATE_KEY;
    process.env.JWT_ACCESS_PRIVATE_KEY_PATH = join(tmpdir(), 'does-not-exist', 'private.pem');
    expect(() => loadAccessPrivateKey()).toThrow(/JWT_ACCESS_PRIVATE_KEY_PATH=.*cannot be read/);
  });
});
