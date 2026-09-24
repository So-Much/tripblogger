import { Logger } from '@nestjs/common';
import { JwksAuthGuard } from './jwks-auth.guard';

const SAMPLE_JWKS = {
  keys: [{ kid: 'k1', kty: 'RSA', alg: 'RS256', use: 'sig', n: 'x', e: 'AQAB' }],
};

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
      get: jest.fn((key: string) => (key === 'CORE_JWKS_URL' ? 'http://core.test/jwks' : undefined)),
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
});
