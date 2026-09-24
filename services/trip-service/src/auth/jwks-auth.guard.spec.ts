import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwksAuthGuard } from './jwks-auth.guard';
import type { Jwks } from '@tripblogger/auth';

const JWKS_URL = 'http://core/.well-known/jwks.json';

describe('JwksAuthGuard loadJwks', () => {
  let guard: JwksAuthGuard;
  let config: Pick<ConfigService, 'get'>;
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    config = {
      get: jest.fn((key: string) => (key === 'CORE_JWKS_URL' ? JWKS_URL : undefined)),
    };
    guard = new JwksAuthGuard(config as ConfigService);

    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns cached JWKS within 3s when fetch is slow', async () => {
    const cachedJwks: Jwks = { keys: [{ kty: 'RSA', kid: 'cached' }] as Jwks['keys'] };
    (guard as any).cachedJwks = cachedJwks;
    (guard as any).cachedAt = 0;

    fetchMock.mockImplementation((_url: string, opts?: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        const timer = setTimeout(
          () =>
            _resolve({
              ok: true,
              json: async () => ({ keys: [{ kty: 'RSA', kid: 'fresh' }] }),
            }),
          5000,
        );
        opts?.signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(Object.assign(new Error('This operation was aborted'), { name: 'AbortError' }));
        });
      });
    });

    const start = Date.now();
    const result = await (guard as any).loadJwks();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(4000);
    expect(result).toBe(cachedJwks);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/JWKS fetch failed:/));
  });

  it('logs success on successful fetch', async () => {
    const freshJwks: Jwks = { keys: [{ kty: 'RSA', kid: 'new' }] as Jwks['keys'] };
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => freshJwks,
    });

    const result = await (guard as any).loadJwks();

    expect(result).toEqual(freshJwks);
    expect(logSpy).toHaveBeenCalledWith(`JWKS loaded from ${JWKS_URL}`);
  });

  it('logs warn and returns cache on non-ok response', async () => {
    const cachedJwks: Jwks = { keys: [{ kty: 'RSA', kid: 'cached' }] as Jwks['keys'] };
    (guard as any).cachedJwks = cachedJwks;
    (guard as any).cachedAt = 0;

    fetchMock.mockResolvedValue({ ok: false, status: 503 });

    const result = await (guard as any).loadJwks();

    expect(result).toBe(cachedJwks);
    expect(warnSpy).toHaveBeenCalledWith(`JWKS fetch returned 503 from ${JWKS_URL}`);
  });
});
