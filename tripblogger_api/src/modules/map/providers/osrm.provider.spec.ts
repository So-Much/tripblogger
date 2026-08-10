import { OsrmProvider } from './osrm.provider';

describe('OsrmProvider.tableDistances', () => {
  const provider = new OsrmProvider();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns rounded road meters from OSRM table response', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 'Ok',
        distances: [[0, 1432.3, 1526.8]],
      }),
    } as Response);

    const distances = await provider.tableDistances(21.0285, 105.8542, [
      { lat: 21.03, lng: 105.86 },
      { lat: 21.025, lng: 105.85 },
    ]);

    expect(distances).toEqual([1432, 1527]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/routed-car/table/v1/driving/');
    expect(url).toContain('annotations=distance');
    expect(url).toContain('sources=0');
  });

  it('falls back to nulls when OSRM fails', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    const distances = await provider.tableDistances(21, 105, [
      { lat: 21.01, lng: 105.01 },
    ]);

    expect(distances).toEqual([null]);
  });

  it('returns empty array for no destinations', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    await expect(provider.tableDistances(21, 105, [])).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
