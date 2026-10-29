import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type TravelMode = 'car' | 'bike' | 'foot';

const PROFILE: Record<TravelMode, string> = {
  car: 'routed-car',
  bike: 'routed-bike',
  foot: 'routed-foot',
};

@Injectable()
export class OsrmRoutingProvider {
  private readonly logger = new Logger(OsrmRoutingProvider.name);

  constructor(private readonly config: ConfigService) {}

  private base(): string {
    return (this.config.get<string>('OSRM_BASE_URL') ?? 'https://routing.openstreetmap.de').replace(/\/$/, '');
  }

  async route(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
    mode: TravelMode,
    alternatives = true,
  ) {
    const profile = PROFILE[mode];
    const coords = `${fromLng},${fromLat};${toLng},${toLat}`;
    const url = `${this.base()}/${profile}/route/v1/driving/${coords}?overview=full&geometries=polyline6&steps=true&alternatives=${alternatives}`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'TripBlogger-Geo/1.0' } });
      if (!res.ok) return [];
      const body = (await res.json()) as { routes?: Array<{ distance: number; duration: number; geometry: string }> };
      return (body.routes ?? []).map((r) => ({
        distanceM: r.distance,
        durationS: r.duration,
        geometry: r.geometry,
        steps: [],
      }));
    } catch (err) {
      this.logger.warn(`OSRM route failed: ${err instanceof Error ? err.message : err}`);
      return [];
    }
  }

  async tableLegs(
    points: Array<{ lat: number; lng: number }>,
    mode: TravelMode,
  ): Promise<Array<{ durationS: number | null; distanceM: number | null }>> {
    if (points.length < 2) return [];
    const profile = PROFILE[mode];
    const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
    const url = `${this.base()}/${profile}/table/v1/driving/${coords}?annotations=duration,distance`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'TripBlogger-Geo/1.0' } });
      if (!res.ok) return points.slice(1).map(() => ({ durationS: null, distanceM: null }));
      const body = (await res.json()) as { durations?: number[][]; distances?: number[][] };
      const legs: Array<{ durationS: number | null; distanceM: number | null }> = [];
      for (let i = 0; i < points.length - 1; i++) {
        const durationS = body.durations?.[i]?.[i + 1] ?? null;
        const distanceM = body.distances?.[i]?.[i + 1] ?? null;
        legs.push({ durationS, distanceM });
      }
      return legs;
    } catch (err) {
      this.logger.warn(`OSRM table failed: ${err instanceof Error ? err.message : err}`);
      return points.slice(1).map(() => ({ durationS: null, distanceM: null }));
    }
  }
}
