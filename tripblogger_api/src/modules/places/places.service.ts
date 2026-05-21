import { BadGatewayException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PlaceResultDto, PlaceSource } from './dto/place.dto';

const USER_AGENT = 'TripBlogger/1.0 (contact: support@tripblogger.app)';
const PHOTON_BASE = 'https://photon.komoot.io';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

type CacheEntry = { expiresAt: number; data: PlaceResultDto[] };

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private lastNominatimAt = 0;
  private photonBurst = 0;
  private photonBurstResetAt = 0;

  async search(q: string, lat?: number, lng?: number, limit = 10): Promise<PlaceResultDto[]> {
    const key = `search:${q.toLowerCase()}:${lat ?? ''}:${lng ?? ''}:${limit}`;
    const cached = this.getCache(key, 24 * 60 * 60 * 1000);
    if (cached) return cached;

    const params = new URLSearchParams({ q, limit: String(limit), lang: 'vi' });
    if (lat != null && lng != null) {
      params.set('lat', String(lat));
      params.set('lon', String(lng));
    }
    const url = `${PHOTON_BASE}/api/?${params.toString()}`;
    const results = await this.fetchPhotonFeatures(url, 'photon');
    this.setCache(key, results, 24 * 60 * 60 * 1000);
    return results;
  }

  async nearby(lat: number, lng: number, limit = 10): Promise<PlaceResultDto[]> {
    const key = `nearby:${lat.toFixed(4)}:${lng.toFixed(4)}:${limit}`;
    const cached = this.getCache(key, 24 * 60 * 60 * 1000);
    if (cached) return cached;

    const params = new URLSearchParams({ lat: String(lat), lon: String(lng), limit: String(limit), lang: 'vi' });
    const url = `${PHOTON_BASE}/reverse?${params.toString()}`;
    let results = await this.fetchPhotonFeatures(url, 'photon');
    if (!results.length) {
      results = await this.reverseNominatim(lat, lng);
    }
    this.setCache(key, results, 24 * 60 * 60 * 1000);
    return results;
  }

  async reverse(lat: number, lng: number): Promise<PlaceResultDto[]> {
    const key = `reverse:${lat.toFixed(4)}:${lng.toFixed(4)}`;
    const cached = this.getCache(key, 60 * 60 * 1000);
    if (cached) return cached;

    const results = await this.reverseNominatim(lat, lng);
    this.setCache(key, results, 60 * 60 * 1000);
    return results;
  }

  private async fetchPhotonFeatures(url: string, source: PlaceSource): Promise<PlaceResultDto[]> {
    this.throttlePhoton();
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (res.status === 429) throw new HttpException('Places rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
      if (!res.ok) {
        this.logger.warn(`Photon ${res.status} for ${url}`);
        throw new BadGatewayException('Places search unavailable');
      }
      const body = (await res.json()) as {
        features?: Array<{
          properties?: Record<string, unknown>;
          geometry?: { coordinates?: [number, number] };
        }>;
      };
      return (body.features ?? [])
        .map((f) => this.photonFeatureToPlace(f, source))
        .filter((p): p is PlaceResultDto => p != null);
    } catch (e) {
      if (e instanceof HttpException) throw e;
      this.logger.error('Photon request failed', e);
      throw new BadGatewayException('Places search unavailable');
    }
  }

  private photonFeatureToPlace(
    feature: {
      properties?: Record<string, unknown>;
      geometry?: { coordinates?: [number, number] };
    },
    source: PlaceSource,
  ): PlaceResultDto | null {
    const coords = feature.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;
    const [lng, lat] = coords;
    const props = feature.properties ?? {};
    const name =
      (typeof props.name === 'string' && props.name) ||
      (typeof props.city === 'string' && props.city) ||
      (typeof props.country === 'string' && props.country) ||
      null;
    if (!name) return null;
    const osmType = typeof props.osm_type === 'string' ? props.osm_type : 'X';
    const osmId = props.osm_id != null ? String(props.osm_id) : `${lat},${lng}`;
    const parts = [props.street, props.city, props.state, props.country].filter((p) => typeof p === 'string' && p) as string[];
    const address = parts.length ? parts.join(', ') : undefined;
    return {
      id: `${source}:${osmType}:${osmId}`,
      name,
      address,
      lat,
      lng,
      source,
    };
  }

  private async reverseNominatim(lat: number, lng: number): Promise<PlaceResultDto[]> {
    await this.throttleNominatim();
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'json',
      'accept-language': 'vi',
    });
    const url = `${NOMINATIM_BASE}/reverse?${params.toString()}`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (res.status === 429) throw new HttpException('Places rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
      if (!res.ok) throw new BadGatewayException('Reverse geocode unavailable');
      const body = (await res.json()) as {
        place_id?: number;
        lat?: string;
        lon?: string;
        display_name?: string;
        address?: Record<string, string>;
        name?: string;
      };
      const name =
        body.name ||
        body.address?.city ||
        body.address?.town ||
        body.address?.village ||
        body.address?.state ||
        body.display_name?.split(',')[0];
      if (!name) return [];
      const parsedLat = body.lat != null ? parseFloat(body.lat) : lat;
      const parsedLng = body.lon != null ? parseFloat(body.lon) : lng;
      return [
        {
          id: `nominatim:${body.place_id ?? `${parsedLat},${parsedLng}`}`,
          name,
          address: body.display_name,
          lat: parsedLat,
          lng: parsedLng,
          source: 'nominatim',
        },
      ];
    } catch (e) {
      if (e instanceof HttpException) throw e;
      this.logger.error('Nominatim reverse failed', e);
      throw new BadGatewayException('Reverse geocode unavailable');
    }
  }

  private throttleNominatim(): Promise<void> {
    const now = Date.now();
    const wait = Math.max(0, 1000 - (now - this.lastNominatimAt));
    this.lastNominatimAt = now + wait;
    return wait > 0 ? new Promise((r) => setTimeout(r, wait)) : Promise.resolve();
  }

  private throttlePhoton(): void {
    const now = Date.now();
    if (now > this.photonBurstResetAt) {
      this.photonBurst = 0;
      this.photonBurstResetAt = now + 1000;
    }
    this.photonBurst += 1;
    if (this.photonBurst > 5) {
      throw new HttpException('Places rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private getCache(key: string, ttlMs: number): PlaceResultDto[] | null {
    const hit = this.cache.get(key);
    if (!hit || hit.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return hit.data;
  }

  private setCache(key: string, data: PlaceResultDto[], ttlMs: number): void {
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
    if (this.cache.size > 500) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
  }
}
