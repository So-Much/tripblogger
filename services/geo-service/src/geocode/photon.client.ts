import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MapPlaceDto } from '@tripblogger/contracts';

@Injectable()
export class PhotonClient {
  constructor(private readonly config: ConfigService) {}

  async reverse(lat: number, lng: number, lang: 'vi' | 'en'): Promise<MapPlaceDto> {
    const base = this.config.get<string>('PHOTON_URL') ?? 'http://127.0.0.1:2322';
    const url = `${base.replace(/\/$/, '')}/reverse?lat=${lat}&lon=${lng}&lang=${lang}`;
    let res: Response;
    try {
      res = await fetch(url, { headers: { 'User-Agent': 'TripBlogger-Geo/1.0' } });
    } catch {
      throw new ServiceUnavailableException({ error: 'photon_unavailable' });
    }
    if (!res.ok) throw new ServiceUnavailableException({ error: 'photon_unavailable' });
    const body = (await res.json()) as {
      features?: Array<{
        properties?: { name?: string; street?: string; city?: string; country?: string; osm_id?: number };
        geometry?: { coordinates?: [number, number] };
      }>;
    };
    const f = body.features?.[0];
    if (!f) {
      return {
        id: `photon:${lat},${lng}`,
        name: lang === 'en' ? 'Dropped pin' : 'Điểm đã thả',
        address: null,
        lat,
        lng,
        category: null,
        source: 'photon',
        distanceM: 0,
        rating: null,
        reviewCount: null,
        openingHours: null,
        phone: null,
        website: null,
        imageUrl: null,
      };
    }
    const [lon, la] = f.geometry?.coordinates ?? [lng, lat];
    const name = f.properties?.name ?? [f.properties?.street, f.properties?.city].filter(Boolean).join(', ');
    return {
      id: `photon:${f.properties?.osm_id ?? `${lat},${lng}`}`,
      name: name || (lang === 'en' ? 'Dropped pin' : 'Điểm đã thả'),
      address: [f.properties?.street, f.properties?.city, f.properties?.country].filter(Boolean).join(', ') || null,
      lat: la,
      lng: lon,
      category: null,
      source: 'photon',
      distanceM: 0,
      rating: null,
      reviewCount: null,
      openingHours: null,
      phone: null,
      website: null,
      imageUrl: null,
    };
  }

  async healthCheck(): Promise<void> {
    const base = this.config.get<string>('PHOTON_URL') ?? 'http://127.0.0.1:2322';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2000);
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/api`, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`Photon health ${res.status}`);
    } finally {
      clearTimeout(timer);
    }
  }
}
