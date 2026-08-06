import { Injectable, Logger } from '@nestjs/common';

export type TravelMode = 'car' | 'bike' | 'foot';

export type RouteStep = {
  distanceM: number;
  durationS: number;
  instruction: string;
  name: string;
  maneuverType: string;
  modifier?: string;
  location: { lat: number; lng: number };
};

export type RouteAlternative = {
  distanceM: number;
  durationS: number;
  /** Encoded polyline6 geometry string */
  geometry: string;
  steps: RouteStep[];
};

const PROFILE: Record<TravelMode, string> = {
  car: 'routed-car',
  bike: 'routed-bike',
  foot: 'routed-foot',
};

const OSRM_BASE = 'https://routing.openstreetmap.de';
const USER_AGENT = 'TripBlogger/1.0 (map; contact: support@tripblogger.app)';

const MANEUVER_VI: Record<string, string> = {
  'depart': 'Bắt đầu',
  'arrive': 'Đến nơi',
  'turn': 'Rẽ',
  'new name': 'Tiếp tục',
  'merge': 'Nhập làn',
  'on ramp': 'Vào đường dẫn',
  'off ramp': 'Ra đường dẫn',
  'fork': 'Rẽ nhánh',
  'end of road': 'Cuối đường',
  'continue': 'Đi thẳng',
  'roundabout': 'Vào vòng xuyến',
  'rotary': 'Vào vòng xuyến',
  'roundabout turn': 'Rẽ trong vòng xuyến',
  'notification': 'Chú ý',
  'exit roundabout': 'Ra khỏi vòng xuyến',
  'exit rotary': 'Ra khỏi vòng xuyến',
};

const MODIFIER_VI: Record<string, string> = {
  left: 'trái',
  right: 'phải',
  'sharp left': 'trái gắt',
  'sharp right': 'phải gắt',
  'slight left': 'trái nhẹ',
  'slight right': 'phải nhẹ',
  straight: 'thẳng',
  uturn: 'quay đầu',
};

@Injectable()
export class OsrmProvider {
  private readonly logger = new Logger(OsrmProvider.name);

  async route(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
    mode: TravelMode,
    alternatives = true,
  ): Promise<RouteAlternative[]> {
    const profile = PROFILE[mode];
    const coords = `${fromLng},${fromLat};${toLng},${toLat}`;
    const params = new URLSearchParams({
      overview: 'full',
      geometries: 'polyline6',
      steps: 'true',
      alternatives: alternatives ? 'true' : 'false',
    });
    const url = `${OSRM_BASE}/${profile}/route/v1/driving/${coords}?${params.toString()}`;

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
      });
      if (!res.ok) {
        this.logger.warn(`OSRM HTTP ${res.status}`);
        return [];
      }
      const body = (await res.json()) as {
        code?: string;
        routes?: Array<{
          distance: number;
          duration: number;
          geometry: string;
          legs?: Array<{
            steps?: Array<{
              distance: number;
              duration: number;
              name?: string;
              maneuver?: {
                type?: string;
                modifier?: string;
                location?: [number, number];
                instruction?: string;
              };
            }>;
          }>;
        }>;
      };
      if (body.code !== 'Ok' || !body.routes?.length) return [];

      return body.routes.slice(0, 3).map((r) => ({
        distanceM: Math.round(r.distance),
        durationS: Math.round(r.duration),
        geometry: r.geometry,
        steps: (r.legs ?? []).flatMap((leg) =>
          (leg.steps ?? []).map((step) => {
            const type = step.maneuver?.type ?? 'continue';
            const modifier = step.maneuver?.modifier;
            const [lng, lat] = step.maneuver?.location ?? [fromLng, fromLat];
            return {
              distanceM: Math.round(step.distance),
              durationS: Math.round(step.duration),
              instruction: this.viInstruction(type, modifier, step.name),
              name: step.name ?? '',
              maneuverType: type,
              modifier,
              location: { lat, lng },
            };
          }),
        ),
      }));
    } catch (err) {
      this.logger.warn(`OSRM failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  private viInstruction(type: string, modifier?: string, roadName?: string): string {
    const base = MANEUVER_VI[type] ?? type;
    const mod = modifier ? MODIFIER_VI[modifier] ?? modifier : '';
    const road = roadName?.trim() ? ` vào ${roadName}` : '';
    if (type === 'arrive') return 'Bạn đã đến nơi';
    if (type === 'depart') return `Bắt đầu${road}`;
    if (mod) return `${base} ${mod}${road}`;
    return `${base}${road}`;
  }
}
