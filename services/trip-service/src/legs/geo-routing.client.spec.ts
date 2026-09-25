import { Logger } from '@nestjs/common';
import { GeoRoutingClient } from './geo-routing.client';

function mockConfig() {
  return {
    get: (key: string) => (key === 'GEO_BASE_URL' ? 'http://geo.test' : 'token-token-token'),
  } as never;
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('GeoRoutingClient retry', () => {
  const originalFetch = global.fetch;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('succeeds after two 503 responses then 200', async () => {
    jest.useFakeTimers();
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, {}))
      .mockResolvedValueOnce(jsonResponse(503, {}))
      .mockResolvedValueOnce(jsonResponse(200, { legs: [{ durationS: 120, distanceM: 500 }] }));
    global.fetch = fetchMock;

    const client = new GeoRoutingClient(mockConfig());
    const promise = client.tableLegs(
      [
        { lat: 16, lng: 108 },
        { lat: 16.1, lng: 108.1 },
      ],
      'car',
    );

    await jest.runAllTimersAsync();
    const legs = await promise;

    expect(legs).toEqual([{ durationS: 120, distanceM: 500 }]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('fails immediately on 400 without retry', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(400, {}));
    global.fetch = fetchMock;

    const client = new GeoRoutingClient(mockConfig());

    await expect(
      client.tableLegs(
        [
          { lat: 16, lng: 108 },
          { lat: 16.1, lng: 108.1 },
        ],
        'car',
      ),
    ).rejects.toThrow('geo 400');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('logs retry attempts', async () => {
    jest.useFakeTimers();
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, {}))
      .mockResolvedValueOnce(jsonResponse(200, { legs: [{ durationS: 60, distanceM: 100 }] }));
    global.fetch = fetchMock;

    const client = new GeoRoutingClient(mockConfig());
    const promise = client.tableLegs([{ lat: 16, lng: 108 }, { lat: 16.1, lng: 108.1 }], 'car');

    await jest.runAllTimersAsync();
    await promise;

    expect(logSpy).toHaveBeenCalledWith('Retry attempt 2 for Geo routing');
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
