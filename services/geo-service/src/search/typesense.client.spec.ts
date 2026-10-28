import { TypesensePlaces } from './typesense.client';

function withFakeClient(search: jest.Mock) {
  const svc = new TypesensePlaces({ get: () => undefined } as any);
  const collection = {
    retrieve: jest.fn(async () => ({})),
    documents: () => ({ search }),
  };
  (svc as any).client = { collections: () => collection };
  return svc;
}

describe('TypesensePlaces circuit', () => {
  afterEach(() => jest.useRealTimers());

  it('skips Typesense for a while after a connection failure', async () => {
    jest.useFakeTimers({ now: 1_000_000 });
    const search = jest.fn(async () => {
      throw Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
    });
    const svc = withFakeClient(search);

    await expect(svc.searchIds('pho', null, 10)).rejects.toThrow('ECONNREFUSED');
    await expect(svc.searchIds('pho', null, 10)).rejects.toThrow('typesense_circuit_open');
    expect(search).toHaveBeenCalledTimes(1);

    jest.setSystemTime(1_000_000 + 31_000);
    search.mockResolvedValueOnce({ hits: [{ document: { id: 'p1' } }] } as never);
    await expect(svc.searchIds('pho', null, 10)).resolves.toEqual(['p1']);
  });

  it('keeps the circuit closed for HTTP errors from a live server', async () => {
    const search = jest.fn(async () => {
      throw Object.assign(new Error('bad filter'), { httpStatus: 400 });
    });
    const svc = withFakeClient(search);

    await expect(svc.searchIds('pho', null, 10)).rejects.toThrow('bad filter');
    await expect(svc.searchIds('pho', null, 10)).rejects.toThrow('bad filter');
    expect(search).toHaveBeenCalledTimes(2);
  });
});
