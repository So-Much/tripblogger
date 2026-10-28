import {
  decodePolyline,
  summarizeReviews,
  toCheckinItem,
  toDrivingRouteDto,
  toPersistedLocation,
  toReviewPage,
  toSavedGroups,
} from './app-contract';

describe('app contract mappers', () => {
  it('decodes a precision-5 polyline into lat/lng', () => {
    const points = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5);
    expect(points[0].latitude).toBeCloseTo(38.5, 1);
    expect(points[0].longitude).toBeCloseTo(-120.2, 1);
    expect(points).toHaveLength(3);
  });

  it('maps a map place onto the location DTO the app already reads', () => {
    const dto = toPersistedLocation({
      id: 'p1',
      name: 'Cafe',
      address: '1 Pho Co',
      lat: 10.1,
      lng: 106.2,
      category: 'cafe',
      rating: 4.5,
      reviewCount: 3,
      distanceM: 1500,
    });
    expect(dto).toMatchObject({
      id: 'p1',
      latitude: 10.1,
      longitude: 106.2,
      status: 'ACTIVE',
      avgRating: 4.5,
      totalReview: 3,
      locationType: { code: 'cafe' },
      distanceKm: 1.5,
    });
  });

  it('groups saved rows the way PlaceDetailSheet flatMaps them', () => {
    const groups = toSavedGroups([
      { id: 's1', placeId: 'p1', collectionName: 'Mặc định', note: null },
      { id: 's2', placeId: 'p2', collectionName: null, note: 'later' },
    ]);
    expect(groups).toEqual([
      {
        collectionName: 'Mặc định',
        locations: [
          { id: 's1', locationId: 'p1', note: null },
          { id: 's2', locationId: 'p2', note: 'later' },
        ],
      },
    ]);
  });

  it('returns a reviews page and a summary distribution', () => {
    const rows = [
      { id: 'r1', placeId: 'p1', userId: 'u1', rating: 5, body: 'ok', tagsJson: '["view"]', createdAt: new Date('2026-01-02T00:00:00Z') },
      { id: 'r2', placeId: 'p1', userId: 'u2', rating: 3, body: null, tagsJson: null, createdAt: new Date('2026-01-01T00:00:00Z') },
    ];
    const page = toReviewPage(rows, 1, 10, 2);
    expect(page.items[0]).toMatchObject({
      locationId: 'p1',
      rating: 5,
      content: 'ok',
      tags: ['view'],
      author: { displayName: 'Member', avatarUrl: null },
    });
    expect(page.hasMore).toBe(false);
    expect(summarizeReviews(rows)).toMatchObject({
      total: 2,
      avgRating: 4,
      distribution: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 1 },
      tags: [{ tag: 'view', count: 1 }],
    });
  });

  it('shapes a check-in like the app list', () => {
    const item = toCheckinItem(
      {
        id: 'c1',
        placeId: 'p1',
        lat: '10.5',
        lng: '106.5',
        privacyLevel: 'PUBLIC',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      { id: 'p1', name: 'Cafe', address: null },
    );
    expect(item).toMatchObject({
      id: 'c1',
      locationId: 'p1',
      latitude: 10.5,
      longitude: 106.5,
      privacyLevel: 'PUBLIC',
      location: { id: 'p1', name: 'Cafe', address: null },
    });
  });

  it('uses the first OSRM leg, and a straight line when routing is empty', () => {
    const routed = toDrivingRouteDto(
      [{ distanceM: 100, durationS: 20, geometry: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' }],
      { lat: 0, lng: 0 },
      { lat: 1, lng: 1 },
    );
    expect(routed.distanceM).toBe(100);
    expect(routed.coordinates.length).toBeGreaterThan(0);

    const fallback = toDrivingRouteDto([], { lat: 10, lng: 106 }, { lat: 10.1, lng: 106.1 });
    expect(fallback.coordinates[0]).toEqual({ latitude: 10, longitude: 106 });
    expect(fallback.coordinates[fallback.coordinates.length - 1]).toEqual({ latitude: 10.1, longitude: 106.1 });
    expect(fallback.distanceM).toBeGreaterThan(0);
  });
});
