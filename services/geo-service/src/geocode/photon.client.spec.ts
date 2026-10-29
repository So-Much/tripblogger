import { PhotonClient } from './photon.client';

const FEATURE = {
  features: [
    {
      properties: { name: 'Phở 24', street: 'Lê Thánh Tôn', city: 'Hồ Chí Minh', country: 'Việt Nam', osm_id: 1 },
      geometry: { coordinates: [106.7, 10.77] },
    },
  ],
};

function setup(env: Record<string, string>) {
  const store = new Map<string, string>();
  const cache = {
    get: jest.fn(async (k: string) => store.get(k) ?? null),
    set: jest.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
  };
  const client = new PhotonClient({ get: (k: string) => env[k] } as any, cache);
  return { client, cache };
}

describe('PhotonClient.reverse', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('falls back to the public instance, then skips the dead local one', async () => {
    const calls: string[] = [];
    global.fetch = jest.fn(async (url: string) => {
      calls.push(new URL(url).host);
      if (url.startsWith('http://photon:2322')) throw new Error('getaddrinfo ENOTFOUND');
      return { ok: true, json: async () => FEATURE } as Response;
    }) as any;
    const { client } = setup({ PHOTON_URL: 'http://photon:2322', PHOTON_FALLBACK_URL: 'https://photon.komoot.io' });

    const first = await client.reverse(10.77, 106.7, 'vi');
    expect(first.name).toBe('Phở 24');
    await client.reverse(10.78, 106.71, 'vi');

    expect(calls).toEqual(['photon:2322', 'photon.komoot.io', 'photon.komoot.io']);
  });

  it('serves repeated lookups from the cache', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => FEATURE }) as Response) as any;
    const { client } = setup({ PHOTON_FALLBACK_URL: 'https://photon.komoot.io' });

    await client.reverse(10.77, 106.7, 'vi');
    await client.reverse(10.77001, 106.70001, 'vi');

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('skips the local instance entirely when PHOTON_URL is empty', async () => {
    const hosts: string[] = [];
    global.fetch = jest.fn(async (url: string) => {
      hosts.push(new URL(url).host);
      return { ok: true, json: async () => FEATURE } as Response;
    }) as any;
    const { client } = setup({ PHOTON_URL: '', PHOTON_FALLBACK_URL: 'https://photon.komoot.io' });

    await client.reverse(10.77, 106.7, 'en');

    expect(hosts).toEqual(['photon.komoot.io']);
  });
});
