import { PlaceSyncService } from './place-sync.service';

function qbMock(affected: number) {
  const calls: Record<string, unknown[]> = {};
  const qb: Record<string, (...args: unknown[]) => unknown> = {};
  for (const m of ['update', 'set', 'where', 'andWhere']) {
    qb[m] = (...args: unknown[]) => {
      calls[m] = args;
      return qb;
    };
  }
  qb.execute = async () => ({ affected });
  return { qb, calls };
}

const payload = {
  placeId: 'p1',
  version: 4,
  name: 'Bà Nà Hills',
  category: 'attraction',
  address: 'Hòa Vang',
  lat: 15.99,
  lng: 107.99,
  openingHoursRaw: null,
};

describe('PlaceSyncService', () => {
  it('updates stops for the place and guards on version', async () => {
    const { qb, calls } = qbMock(2);
    const svc = new PlaceSyncService({ createQueryBuilder: () => qb } as never);
    const n = await svc.apply({ id: 'e1', type: 'place.updated', occurredAt: '', payload });
    expect(n).toBe(2);
    expect(calls.set[0]).toMatchObject({ name: 'Bà Nà Hills', placeVersion: 4, lat: '15.99' });
    expect(calls.andWhere[1]).toEqual({ version: 4 });
  });

  it('ignores unrelated event types', async () => {
    const svc = new PlaceSyncService({ createQueryBuilder: () => qbMock(0).qb } as never);
    await expect(svc.apply({ id: 'e', type: 'trip.created', occurredAt: '', payload: {} })).resolves.toBe(0);
  });

  it('rejects malformed payloads so they reach the DLQ', async () => {
    const svc = new PlaceSyncService({ createQueryBuilder: () => qbMock(0).qb } as never);
    await expect(
      svc.apply({ id: 'e', type: 'place.updated', occurredAt: '', payload: { placeId: 'p1' } }),
    ).rejects.toThrow('invalid');
  });
});
