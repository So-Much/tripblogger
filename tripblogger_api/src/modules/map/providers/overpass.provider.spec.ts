import { OverpassProvider } from './overpass.provider';
import { POI_CATEGORIES } from '../constants/poi-categories';

describe('OverpassProvider.nearby', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('throws when every endpoint fails (so callers can retry)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('This operation was aborted'));
    const provider = new OverpassProvider();
    await expect(
      provider.nearby(10.75, 106.72, 2000, POI_CATEGORIES.hospital, 10),
    ).rejects.toThrow(/All Overpass endpoints failed/);
  });

  it('returns mapped elements when an endpoint succeeds', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [
          {
            type: 'node',
            id: 1,
            lat: 10.75,
            lon: 106.72,
            tags: { name: 'Bệnh viện Test' },
          },
        ],
      }),
    });
    const provider = new OverpassProvider();
    const places = await provider.nearby(10.75, 106.72, 2000, POI_CATEGORIES.hospital, 10);
    expect(places).toHaveLength(1);
    expect(places[0].name).toBe('Bệnh viện Test');
    expect(places[0].source).toBe('overpass');
  });

  it('keeps OSM opening_hours as openingHours', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [
          {
            type: 'node',
            id: 2,
            lat: 10.75,
            lon: 106.72,
            tags: {
              name: 'Cafe Hours',
              opening_hours: 'Mo-Fr 08:00-17:00',
            },
          },
        ],
      }),
    });
    const provider = new OverpassProvider();
    const places = await provider.nearby(10.75, 106.72, 2000, POI_CATEGORIES.cafe, 10);
    expect(places).toHaveLength(1);
    expect(places[0].openingHours).toBe('Mo-Fr 08:00-17:00');
  });
});
