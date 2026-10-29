import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MapPlaceDto } from '@tripblogger/contracts';
import { REDIS_CLIENT } from '../redis.tokens';

type PhotonFeature = {
  properties?: { name?: string; street?: string; housenumber?: string; city?: string; district?: string; country?: string; osm_id?: number };
  geometry?: { coordinates?: [number, number] };
};

type Cache = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'EX', seconds: number): Promise<unknown>;
};

const CACHE_TTL_S = 7 * 24 * 3600;
const LOCAL_TIMEOUT_MS = 1500;
/** The free public instance often needs >4 s on a cold connection (DNS + TLS from the container). */
const PUBLIC_TIMEOUT_MS = 8000;
/** How long a failed base is skipped, so an absent local Photon does not add its timeout to every request. */
export const PHOTON_COOLDOWN_MS = 60_000;

export type PhotonHealth = 'ok' | 'fallback' | 'fail';

@Injectable()
export class PhotonClient {
  private readonly logger = new Logger(PhotonClient.name);
  private readonly downUntil = new Map<string, number>();

  constructor(
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly cache: Cache,
  ) {}

  private bases(): Array<{ url: string; timeoutMs: number }> {
    const local = this.config.get<string>('PHOTON_URL');
    const fallback = this.config.get<string>('PHOTON_FALLBACK_URL');
    return [
      ...(local ? [{ url: local, timeoutMs: LOCAL_TIMEOUT_MS }] : []),
      ...(fallback ? [{ url: fallback, timeoutMs: PUBLIC_TIMEOUT_MS }] : []),
    ].map((b) => ({ ...b, url: b.url.replace(/\/$/, '') }));
  }

  private async fetchJson(url: string, timeoutMs: number): Promise<unknown> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'TripBlogger-Geo/1.0 (personal project)' },
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`photon ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async reverse(lat: number, lng: number, lang: 'vi' | 'en'): Promise<MapPlaceDto> {
    const cacheKey = `geo:reverse:${lang}:${lat.toFixed(4)}:${lng.toFixed(4)}`;
    const cached = await this.cache.get(cacheKey).catch(() => null);
    if (cached) return JSON.parse(cached) as MapPlaceDto;

    // Photon has no 'vi' language; it falls back to the local name, which is Vietnamese here.
    const photonLang = lang === 'en' ? 'en' : 'default';
    let body: { features?: PhotonFeature[] } | null = null;
    const bases = this.bases();
    const live = bases.filter((b) => (this.downUntil.get(b.url) ?? 0) <= Date.now());
    for (const base of live.length ? live : bases) {
      try {
        body = (await this.fetchJson(
          `${base.url}/reverse?lat=${lat}&lon=${lng}&lang=${photonLang}&limit=1`,
          base.timeoutMs,
        )) as { features?: PhotonFeature[] };
        this.downUntil.delete(base.url);
        break;
      } catch (err) {
        this.downUntil.set(base.url, Date.now() + PHOTON_COOLDOWN_MS);
        this.logger.warn(`reverse via ${base.url} failed: ${err instanceof Error ? err.message : err}`);
      }
    }
    if (!body) throw new ServiceUnavailableException({ error: 'photon_unavailable' });

    const dto = toPlace(body.features?.[0], lat, lng, lang);
    await this.cache.set(cacheKey, JSON.stringify(dto), 'EX', CACHE_TTL_S).catch(() => undefined);
    return dto;
  }

  /** 'fallback' = local index down/importing, public Photon answers. */
  async health(): Promise<PhotonHealth> {
    const [local, ...rest] = this.bases();
    const probe = async (b?: { url: string; timeoutMs: number }) => {
      if (!b) return false;
      try {
        await this.fetchJson(`${b.url}/reverse?lat=16.0544&lon=108.2022&limit=1`, Math.min(b.timeoutMs, 2000));
        return true;
      } catch {
        return false;
      }
    };
    if (this.config.get<string>('PHOTON_URL') && (await probe(local))) return 'ok';
    for (const b of rest) if (await probe(b)) return 'fallback';
    return 'fail';
  }
}

function toPlace(f: PhotonFeature | undefined, lat: number, lng: number, lang: 'vi' | 'en'): MapPlaceDto {
  const dropped = lang === 'en' ? 'Dropped pin' : 'Điểm đã thả';
  const base = {
    category: null,
    source: 'photon' as const,
    distanceM: 0,
    rating: null,
    reviewCount: null,
    openingHours: null,
    phone: null,
    website: null,
    imageUrl: null,
  };
  if (!f) return { id: `photon:${lat},${lng}`, name: dropped, address: null, lat, lng, ...base };
  const p = f.properties ?? {};
  const [lon, la] = f.geometry?.coordinates ?? [lng, lat];
  const street = [p.housenumber, p.street].filter(Boolean).join(' ');
  const name = p.name ?? [street, p.city].filter(Boolean).join(', ');
  return {
    id: `photon:${p.osm_id ?? `${lat},${lng}`}`,
    name: name || dropped,
    address: [street, p.district, p.city, p.country].filter(Boolean).join(', ') || null,
    lat: la,
    lng: lon,
    ...base,
  };
}
