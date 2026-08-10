import { MapService } from './map.service';

type AnyRepo = { createQueryBuilder: jest.Mock };

function makeService(dbRows: any[], externalPlaces: any[]) {
  const qb: any = {
    leftJoinAndSelect: () => qb,
    where: () => qb,
    andWhere: () => qb,
    take: () => qb,
    getMany: async () => dbRows,
  };
  const repo: AnyRepo = { createQueryBuilder: jest.fn(() => qb) };
  const places = { search: jest.fn(async () => externalPlaces) };
  const overpass = {} as any;
  const osrm = { tableDistances: jest.fn(async (_la: number, _ln: number, pts: any[]) => pts.map(() => null)) };
  const store = new Map<string, string>();
  const redis = {
    get: jest.fn(async (k: string) => store.get(k) ?? null),
    set: jest.fn(async (k: string, v: string) => void store.set(k, v)),
  };
  const svc = new MapService(repo as any, places as any, overpass, osrm as any, redis as any);
  return { svc, places, redis };
}

describe('MapService.search ranking', () => {
  it('ranks a prefix match above a merely-nearby external result', async () => {
    const dbRows = [
      {
        id: 'db-pho', name: 'Phở Thìn', address: 'Lò Đúc',
        latitude: '21.500', longitude: '105.500', locationType: { code: 'restaurant' },
        avgRating: '0', totalReview: 0,
      },
    ];
    const external = [
      { id: 'ph-near', name: 'Bún Chả', address: null, lat: 21.001, lng: 105.001, source: 'photon' },
    ];
    const { svc } = makeService(dbRows, external);
    const res = await svc.search('pho', 21, 105, 15, 21, 105);
    expect(res[0].id).toBe('db-pho');
  });

  it('caches results under a v5 bias-aware key', async () => {
    const { svc, redis } = makeService([], []);
    await svc.search('pho', undefined, undefined, 15, 21, 105);
    const key = (redis.set as jest.Mock).mock.calls[0][0] as string;
    expect(key).toContain('map:search:v5:');
  });
});
