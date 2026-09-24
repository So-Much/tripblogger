import { haversineM, REVERSE_SNAP_RADIUS_M, SearchService } from './search.service';
import type { PlaceEntity } from '../entities/place.entity';

function place(partial: Partial<PlaceEntity> & Pick<PlaceEntity, 'id' | 'name' | 'lat' | 'lng'>): PlaceEntity {
  return {
    osmType: null,
    osmId: null,
    normalizedName: partial.name.toLowerCase(),
    aliases: null,
    category: 'restaurant',
    subcategory: null,
    address: null,
    phone: '+84901234567',
    website: 'https://example.com',
    openingHoursRaw: 'Mo-Fr 08:00-17:00',
    wikidataId: null,
    imageUrl: 'https://cdn.example/p.jpg',
    descriptionVi: null,
    descriptionEn: null,
    source: 'osm',
    status: 'active',
    ratingAvg: '4.5',
    reviewCount: 3,
    popularity: '1',
    version: 1,
    createdByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  } as PlaceEntity;
}

describe('SearchService.toDto enrichment', () => {
  it('includes phone, website, imageUrl', () => {
    const svc = new SearchService({} as any, {} as any, {} as any);
    const dto = svc.toDto(place({ id: 'p1', name: 'Phở Cỏ', lat: '21.03', lng: '105.85' }));
    expect(dto.phone).toBe('+84901234567');
    expect(dto.website).toBe('https://example.com');
    expect(dto.imageUrl).toBe('https://cdn.example/p.jpg');
    expect(dto.openingHours).toBe('Mo-Fr 08:00-17:00');
  });
});

describe('SearchService.nearestWithin', () => {
  it('prefers a POI within 50m over farther candidates', async () => {
    const near = place({ id: 'near', name: 'Near Cafe', lat: '21.0001', lng: '105.0000' });
    const far = place({ id: 'far', name: 'Far Cafe', lat: '21.0100', lng: '105.0100' });
    const placesRepo = {
      find: jest.fn(async () => [far, near]),
    };
    const typesense = {
      nearbyIdsAnyCategory: jest.fn(async () => {
        throw new Error('typesense_unavailable');
      }),
    };
    const svc = new SearchService(placesRepo as any, {} as any, typesense as any);
    const hit = await svc.nearestWithin(21, 105, REVERSE_SNAP_RADIUS_M);
    expect(hit?.id).toBe('near');
    expect(hit!.distanceM!).toBeLessThanOrEqual(REVERSE_SNAP_RADIUS_M);
  });

  it('returns null when nothing is within radius', async () => {
    const far = place({ id: 'far', name: 'Far Cafe', lat: '21.0100', lng: '105.0100' });
    const placesRepo = { find: jest.fn(async () => [far]) };
    const typesense = {
      nearbyIdsAnyCategory: jest.fn(async () => {
        throw new Error('down');
      }),
    };
    const svc = new SearchService(placesRepo as any, {} as any, typesense as any);
    const hit = await svc.nearestWithin(21, 105, 50);
    expect(hit).toBeNull();
  });
});

describe('SearchService.getDetail', () => {
  it('returns reviews and isOpenNow', async () => {
    const row = place({ id: 'p1', name: 'Phở', lat: '21', lng: '105', openingHoursRaw: '24/7' });
    const placesRepo = {
      findOne: jest.fn(async () => row),
    };
    const reviewsRepo = {
      find: jest.fn(async () => [
        {
          id: 'r1',
          rating: 5,
          body: 'Ngon',
          createdAt: new Date('2026-09-01T00:00:00.000Z'),
        },
      ]),
    };
    const svc = new SearchService(placesRepo as any, reviewsRepo as any, {} as any);
    const detail = await svc.getDetail('p1');
    expect(detail?.reviews).toHaveLength(1);
    expect(detail?.reviews[0].body).toBe('Ngon');
    expect(detail?.isOpenNow).toBe(true);
    expect(detail?.phone).toBe('+84901234567');
  });
});

describe('haversineM', () => {
  it('is ~0 for same point', () => {
    expect(haversineM(21, 105, 21, 105)).toBeLessThan(1);
  });
});
