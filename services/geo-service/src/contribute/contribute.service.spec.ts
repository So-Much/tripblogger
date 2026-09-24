import { ContributeService } from './contribute.service';

describe('ContributeService reputation', () => {
  it('auto-approves when the user already has 3 approved contributions', async () => {
    const places = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 'p1', ...x })),
    };
    const contributions = {
      count: jest.fn().mockResolvedValue(3),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 'c1', ...x })),
    };
    const typesense = { upsertPlaces: jest.fn().mockResolvedValue(undefined) };
    const svc = new ContributeService(places as never, contributions as never, typesense as never);
    const result = await svc.createPlace('user-1', { name: 'Quán mới', lat: 16.05, lng: 108.22 });
    expect(result.pending).toBe(false);
    expect(places.save).toHaveBeenCalled();
    expect(typesense.upsertPlaces).toHaveBeenCalled();
  });

  it('keeps pending when reputation is below 3', async () => {
    const places = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 'p1', ...x })),
    };
    const contributions = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 'c1', ...x })),
    };
    const typesense = { upsertPlaces: jest.fn() };
    const svc = new ContributeService(places as never, contributions as never, typesense as never);
    const result = await svc.createPlace('user-1', { name: 'Quán mới', lat: 16.05, lng: 108.22 });
    expect(result.pending).toBe(true);
    expect(typesense.upsertPlaces).not.toHaveBeenCalled();
  });
});
