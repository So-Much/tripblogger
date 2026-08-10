import { Injectable, Logger } from '@nestjs/common';
import { PoiCategory, OsmTagFilter } from '../constants/poi-categories';

const USER_AGENT = 'TripBlogger/1.0 (map; contact: support@tripblogger.app)';
const OVERPASS_TIMEOUT_S = 25;
const FETCH_TIMEOUT_MS = 28_000;

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

export type OverpassPoi = {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  categoryHint?: string;
  source: 'overpass';
};

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

@Injectable()
export class OverpassProvider {
  private readonly logger = new Logger(OverpassProvider.name);
  private lastCallAt = 0;

  async nearby(
    lat: number,
    lng: number,
    radiusM: number,
    category: PoiCategory,
    limit = 40,
  ): Promise<OverpassPoi[]> {
    const query = this.buildQuery(lat, lng, radiusM, category.osm);
    await this.throttle();

    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const elements = await this.fetchElements(endpoint, query);
        return this.mapElements(elements, category.id).slice(0, limit);
      } catch (err) {
        this.logger.warn(
          `Overpass ${endpoint} failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Fail hard so callers can retry. Soft-failing as [] was cached as a real
    // empty nearby result and left the UI showing "no places" when data exists.
    this.logger.warn('All Overpass endpoints failed');
    throw new Error('All Overpass endpoints failed');
  }

  private buildQuery(lat: number, lng: number, radiusM: number, filters: OsmTagFilter[]): string {
    const parts = filters.flatMap((f) =>
      f.values.map(
        (v) =>
          `node["${f.key}"="${v}"](around:${Math.round(radiusM)},${lat},${lng});` +
          `way["${f.key}"="${v}"](around:${Math.round(radiusM)},${lat},${lng});`,
      ),
    );
    return `
[out:json][timeout:${OVERPASS_TIMEOUT_S}];
(
  ${parts.join('\n  ')}
);
out center tags ${Math.min(60, filters.length * 20)};
`.trim();
  }

  private async fetchElements(endpoint: string, query: string): Promise<OverpassElement[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const body = (await res.json()) as { elements?: OverpassElement[] };
      return body.elements ?? [];
    } finally {
      clearTimeout(timer);
    }
  }

  private mapElements(elements: OverpassElement[], categoryId: string): OverpassPoi[] {
    const out: OverpassPoi[] = [];
    for (const el of elements) {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (lat == null || lng == null) continue;
      const name = el.tags?.name || el.tags?.['name:vi'] || el.tags?.brand;
      if (!name) continue;
      const addressParts = [
        el.tags?.['addr:housenumber'],
        el.tags?.['addr:street'],
        el.tags?.['addr:city'] ?? el.tags?.['addr:district'],
      ].filter(Boolean);
      out.push({
        id: `overpass:${el.type}:${el.id}`,
        name,
        address: addressParts.length ? addressParts.join(' ') : undefined,
        lat,
        lng,
        categoryHint: categoryId,
        source: 'overpass',
      });
    }
    return out;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const wait = Math.max(0, 1100 - (now - this.lastCallAt));
    this.lastCallAt = now + wait;
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
}
