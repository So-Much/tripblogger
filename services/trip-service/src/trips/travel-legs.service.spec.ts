import { GeoRoutingClient } from '../legs/geo-routing.client';

describe('GeoRoutingClient circuit', () => {
  it('returns null legs when circuit is open', async () => {
    const client = new GeoRoutingClient({
      get: (key: string) => (key === 'GEO_BASE_URL' ? 'http://127.0.0.1:9' : 'token-token-token'),
    } as never);
    (client as unknown as { openedAt: number }).openedAt = Date.now();
    const legs = await client.tableLegs(
      [
        { lat: 16, lng: 108 },
        { lat: 16.1, lng: 108.1 },
      ],
      'car',
    );
    expect(legs).toEqual([{ durationS: null, distanceM: null }]);
  });
});
