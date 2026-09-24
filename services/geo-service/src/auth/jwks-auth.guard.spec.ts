import { generateKeyPairSync } from 'crypto';
import { UnauthorizedException, Logger } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { JwksAuthGuard } from './jwks-auth.guard';

const SAMPLE_JWKS = {
  keys: [{ kid: 'k1', kty: 'RSA', alg: 'RS256', use: 'sig', n: 'x', e: 'AQAB' }],
};
const HS_SECRET = 'test-hs-secret-at-least-16-chars';

function mockContext(token: string | null) {
  const req: { headers: { authorization?: string }; user?: unknown } = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
  return {
    req,
    context: {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as any,
  };
}

describe('JwksAuthGuard cache strategy', () => {
  let guard: JwksAuthGuard;
  let fetchMock: jest.Mock;
  let now: number;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    now = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    const config = {
      get: jest.fn((key: string) => {
        if (key === 'CORE_JWKS_URL') return 'http://core.test/jwks';
        if (key === 'JWT_ACCESS_SECRET') return HS_SECRET;
        return undefined;
      }),
    };
    guard = new JwksAuthGuard(config as any);

    fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function loadJwks() {
    return (guard as any).loadJwks();
  }

  it('uses fresh cache within 10 minutes without refetching', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => SAMPLE_JWKS,
    });

    const first = await loadJwks();
    expect(first).toEqual(SAMPLE_JWKS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('JWKS loaded'));

    now += 5 * 60 * 1000;
    const second = await loadJwks();
    expect(second).toEqual(SAMPLE_JWKS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns stale cache within the 30-minute stale window when Core is unreachable', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_JWKS,
    });
    await loadJwks();

    now += 15 * 60 * 1000;
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await loadJwks();
    expect(result).toEqual(SAMPLE_JWKS);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('JWKS fetch failed'));
    expect(warnSpy).toHaveBeenCalledWith('Using stale JWKS cache');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('fails closed when cache is older than 30 minutes and Core is down', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_JWKS,
    });
    await loadJwks();

    now += 35 * 60 * 1000;
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await loadJwks();
    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      'JWKS cache too old and Core unreachable - failing auth',
    );
  });

  it('fails closed on HTTP errors when there is no usable cache', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    const result = await loadJwks();
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('JWKS fetch returned 503'));
    expect(errorSpy).toHaveBeenCalledWith(
      'JWKS cache too old and Core unreachable - failing auth',
    );
  });

  it('skips refresh attempts during the cooldown after a failed refresh', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_JWKS,
    });
    await loadJwks();

    now += 15 * 60 * 1000;
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await loadJwks();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockClear();
    now += 10 * 1000; // still inside 30s cooldown
    const cooled = await loadJwks();
    expect(cooled).toEqual(SAMPLE_JWKS);
    expect(fetchMock).not.toHaveBeenCalled();

    now += 25 * 1000; // past cooldown
    fetchMock.mockRejectedValueOnce(new Error('still down'));
    await loadJwks();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shares a single in-flight refresh across concurrent callers', async () => {
    let resolveFetch!: (value: { ok: boolean; json: () => Promise<typeof SAMPLE_JWKS> }) => void;
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const p1 = loadJwks();
    const p2 = loadJwks();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch({ ok: true, json: async () => SAMPLE_JWKS });
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual(SAMPLE_JWKS);
    expect(r2).toEqual(SAMPLE_JWKS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('JwksAuthGuard canActivate auth modes', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function buildGuard(env: Record<string, string | undefined>) {
    const config = {
      get: jest.fn((key: string) => env[key]),
    };
    return new JwksAuthGuard(config as any);
  }

  it('rejects with 401 when CORE_JWKS_URL is set but JWKS is unavailable (no HS fallback)', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 }) as any;

    const guard = buildGuard({
      CORE_JWKS_URL: 'http://core.test/jwks',
      JWT_ACCESS_SECRET: HS_SECRET,
    });

    const hsToken = jwt.sign(
      { sub: 'user-1', role: 'MEMBER', statuses: ['ACTIVE'] },
      HS_SECRET,
      { algorithm: 'HS256', expiresIn: '15m' },
    );
    const { context } = mockContext(hsToken);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts HS256 tokens only when CORE_JWKS_URL is not configured (legacy/dev)', async () => {
    const guard = buildGuard({
      JWT_ACCESS_SECRET: HS_SECRET,
    });

    const hsToken = jwt.sign(
      { sub: 'user-1', role: 'MEMBER', statuses: ['ACTIVE'] },
      HS_SECRET,
      { algorithm: 'HS256', expiresIn: '15m' },
    );
    const { req, context } = mockContext(hsToken);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(req.user).toMatchObject({ sub: 'user-1', role: 'MEMBER' });
  });

  it('rejects HS256 tokens when JWKS keys are present (no algorithm confusion)', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = publicKey.export({ format: 'jwk' });
    const jwks = {
      keys: [
        {
          kty: 'RSA',
          kid: 'core-test',
          n: jwk.n as string,
          e: jwk.e as string,
          alg: 'RS256',
          use: 'sig',
        },
      ],
    };

    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => jwks,
    }) as any;

    const guard = buildGuard({
      CORE_JWKS_URL: 'http://core.test/jwks',
      JWT_ACCESS_SECRET: HS_SECRET,
    });

    const hsToken = jwt.sign(
      { sub: 'attacker', role: 'ADMIN', statuses: ['ACTIVE'], iss: 'tripblogger-core' },
      HS_SECRET,
      { algorithm: 'HS256', expiresIn: '15m' },
    );
    const { context: hsContext } = mockContext(hsToken);
    await expect(guard.canActivate(hsContext)).rejects.toBeInstanceOf(UnauthorizedException);

    const rsToken = jwt.sign(
      { sub: 'user-2', role: 'GUEST', statuses: ['ACTIVE'], iss: 'tripblogger-core' },
      privateKey,
      { algorithm: 'RS256', keyid: 'core-test', expiresIn: '15m' },
    );
    const { req, context: rsContext } = mockContext(rsToken);
    await expect(guard.canActivate(rsContext)).resolves.toBe(true);
    expect(req.user).toMatchObject({ sub: 'user-2', role: 'GUEST' });
  });
});
