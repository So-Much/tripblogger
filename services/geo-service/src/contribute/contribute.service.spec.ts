import { ContributeService } from './contribute.service';
import { PlaceEntity } from '../entities/place.entity';
import { PlaceContributionEntity } from '../entities/place-contribution.entity';
function setup(approved: number) {
  const repoMock = (idPrefix: string) => ({
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: `${idPrefix}1`, version: 1, ...x })),
    findOne: jest.fn(),
  });
  const placeRepo = repoMock('p');
  const contributionRepo = repoMock('c');
  const outboxRepo = repoMock('o');
  const em = {
    getRepository: (entity: unknown) =>
      entity === PlaceEntity ? placeRepo : entity === PlaceContributionEntity ? contributionRepo : outboxRepo,
  };
  const places = { manager: { transaction: jest.fn(async (fn: (e: typeof em) => unknown) => fn(em)) } };
  const contributions = { count: jest.fn().mockResolvedValue(approved) };
  const typesense = { upsertPlaces: jest.fn().mockResolvedValue(undefined) };
  const svc = new ContributeService(places as never, contributions as never, typesense as never);
  return { svc, placeRepo, outboxRepo, typesense, places };
}

describe('ContributeService reputation', () => {
  it('auto-approves, writes the outbox row in the same transaction, then indexes', async () => {
    const { svc, placeRepo, outboxRepo, typesense, places } = setup(3);
    const result = await svc.createPlace('user-1', { name: 'Quán mới', lat: 16.05, lng: 108.22 });
    expect(result.pending).toBe(false);
    expect(places.manager.transaction).toHaveBeenCalledTimes(1);
    expect(placeRepo.save).toHaveBeenCalled();
    expect(outboxRepo.save).toHaveBeenCalledTimes(1);
    const saved = outboxRepo.save.mock.calls[0][0] as { eventType: string; payloadJson: string };
    expect(saved.eventType).toBe('place.created');
    expect(JSON.parse(saved.payloadJson).payload).toMatchObject({ name: 'Quán mới', lat: 16.05, lng: 108.22 });
    expect(typesense.upsertPlaces).toHaveBeenCalled();
  });

  it('keeps pending when reputation is below 3 and emits no event', async () => {
    const { svc, outboxRepo, typesense } = setup(0);
    const result = await svc.createPlace('user-1', { name: 'Quán mới', lat: 16.05, lng: 108.22 });
    expect(result.pending).toBe(true);
    expect(outboxRepo.save).not.toHaveBeenCalled();
    expect(typesense.upsertPlaces).not.toHaveBeenCalled();
  });

  it('does not fail the request when the search index is down', async () => {
    const { svc, typesense } = setup(3);
    typesense.upsertPlaces.mockRejectedValue(new Error('typesense_unavailable'));
    await expect(svc.createPlace('user-1', { name: 'X', lat: 1, lng: 2 })).resolves.toMatchObject({
      pending: false,
    });
  });
});