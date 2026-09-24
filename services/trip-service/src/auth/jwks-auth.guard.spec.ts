import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwksAuthGuard } from './jwks-auth.guard';
import type { Jwks } from '@tripblogger/auth';

const CACHED_JWKS: Jwks = {
  keys: [{ kty: 'RSA', kid: 'cached-key', n: 'n', e: 'AQAB' }],
};

function makeGuard(url = 'http://core.local/.well-known/jwks.json'): JwksAuthGuard {
  const config = {
    get: jest.fn((key: string) => (key === 'CORE_JWKS_URL' ? url : undefined)),
  } as unknown as ConfigService;
  return new JwksAuthGuard(config);
}

function seedExpiredCache(guard: JwksAuthGuard, jwks: Jwks = CACHED_JWKS): void {
  (guard as any).cachedJwks = jwks;
  (guard as any).cachedAt = Date.now() - 11 * 60 * 1000;
}

describe('JwksAuthGuard loadJwks timeout and logging', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('returns cached JWKS within 3s when fetch hangs, and logs a timeout warning', async () => {
    jest.useFakeTimers();
    const guard = makeGuard();
    seedExpiredCache(guard);
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    global.fetch = jest.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
        });
      });
    }) as typeof fetch;

    const loadPromise = (guard as any).loadJwks() as Promise<Jwks | null>;
    expect(global.fetch).toHaveBeenCalledWith(
      'http://core.local/.well-known/jwks.json',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    await jest.advanceTimersByTimeAsync(3000);
    const result = await loadPromise;

    expect(result).toEqual(CACHED_JWKS);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/JWKS fetch failed/i));
  });

  it('logs success when JWKS loads', async () => {
    const guard = makeGuard();
    const fresh: Jwks = { keys: [{ kty: 'RSA', kid: 'fresh', n: 'n', e: 'AQAB' }] };
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => fresh,
    })) as unknown as typeof fetch;

    const result = await (guard as any).loadJwks();

    expect(result).toEqual(fresh);
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/JWKS loaded/i));
  });

  it('logs a warning and returns cached JWKS when fetch returns non-OK', async () => {
    const guard = makeGuard();
    seedExpiredCache(guard);
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 503,
    })) as unknown as typeof fetch;

    const result = await (guard as any).loadJwks();

    expect(result).toEqual(CACHED_JWKS);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/JWKS fetch returned 503/i));
  });
});
