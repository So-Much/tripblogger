import { decodePolyline6 } from '../utils/geo';
import type { ChainPoint, DayChain, DayChainMapSelection } from './plan-day-chains';

export type PlanRouteOsrmMode = 'car' | 'bike' | 'foot';
export type PlanRoutePlanMode = 'motorbike' | 'car' | 'foot' | 'bike';

export type PlanRouteLeg = {
  cacheKey: string;
  dayId: string;
  segmentIndex: number;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  osrmMode: PlanRouteOsrmMode;
};

export type PlanRouteFetcher = (params: {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  mode: PlanRouteOsrmMode;
  alternatives: boolean;
  signal?: AbortSignal;
}) => Promise<{ routes: Array<{ geometry?: string }> }>;

type PlanRouteDayInput = {
  id: string;
  stops: Array<{
    lat: number;
    lng: number;
    position: number;
    travelModeOverride: PlanRoutePlanMode | null;
  }>;
};

const routeGeometryCache = new Map<string, string>();

function round4(n: number): string {
  return (Math.round(n * 10000) / 10000).toFixed(4);
}

export function osrmModeForPlanMode(mode: PlanRoutePlanMode): PlanRouteOsrmMode {
  return mode === 'motorbike' ? 'car' : mode;
}

export function planRouteCacheKey(
  planMode: PlanRoutePlanMode,
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): string {
  const osrmMode = osrmModeForPlanMode(planMode);
  return `plan-route:${osrmMode}:${round4(from.lat)},${round4(from.lng)}:${round4(to.lat)},${round4(to.lng)}`;
}

export function planRouteSegmentKey(dayId: string, segmentIndex: number): string {
  return `${dayId}:${segmentIndex}`;
}

export function encodedGeometryToChainPoints(encoded: string): ChainPoint[] {
  const raw = encoded.trim();
  if (!raw) return [];
  return decodePolyline6(raw)
    .filter(([lng, lat]) => Number.isFinite(lat) && Number.isFinite(lng))
    .map(([longitude, latitude]) => ({ latitude, longitude }));
}

function visibleRouteDays<T extends { id: string }>(
  days: T[],
  selection: DayChainMapSelection,
): T[] {
  if (selection.sheetKind === 'ideas') return [];
  if (selection.sheetKind === 'overview') return days;
  if (selection.selectedDayId == null) return [];
  return days.filter((d) => d.id === selection.selectedDayId);
}

/** Consecutive stop pairs for the visible Plan map tab. */
export function collectPlanRouteLegs(
  days: PlanRouteDayInput[],
  defaultTravelMode: PlanRoutePlanMode,
  selection: DayChainMapSelection,
): PlanRouteLeg[] {
  const out: PlanRouteLeg[] = [];
  for (const day of visibleRouteDays(days, selection)) {
    const stops = [...day.stops]
      .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
      .sort((a, b) => a.position - b.position);
    for (let i = 1; i < stops.length; i++) {
      const prev = stops[i - 1];
      const cur = stops[i];
      const planMode = cur.travelModeOverride ?? defaultTravelMode;
      const from = { lat: prev.lat, lng: prev.lng };
      const to = { lat: cur.lat, lng: cur.lng };
      out.push({
        cacheKey: planRouteCacheKey(planMode, from, to),
        dayId: day.id,
        segmentIndex: i - 1,
        from,
        to,
        osrmMode: osrmModeForPlanMode(planMode),
      });
    }
  }
  return out;
}

export function applyRouteGeometries(
  chains: DayChain[],
  geometryByDaySegment: ReadonlyMap<string, ChainPoint[]>,
): DayChain[] {
  return chains.map((chain) => ({
    ...chain,
    polylines: chain.polylines.map((straight, i) => {
      const routed = geometryByDaySegment.get(planRouteSegmentKey(chain.dayId, i));
      return routed && routed.length > 1 ? routed : straight;
    }),
  }));
}

export function readCachedRouteGeometries(
  legs: PlanRouteLeg[],
  decode: (encoded: string) => ChainPoint[] = encodedGeometryToChainPoints,
): Map<string, ChainPoint[]> {
  const out = new Map<string, ChainPoint[]>();
  for (const leg of legs) {
    const encoded = routeGeometryCache.get(leg.cacheKey);
    if (!encoded) continue;
    const pts = decode(encoded);
    if (pts.length > 1) {
      out.set(planRouteSegmentKey(leg.dayId, leg.segmentIndex), pts);
    }
  }
  return out;
}

const FETCH_CONCURRENCY = 3;

export async function fetchPlanRouteGeometries(
  legs: PlanRouteLeg[],
  routeFn: PlanRouteFetcher,
  signal?: AbortSignal,
  opts?: { decode?: (encoded: string) => ChainPoint[] },
): Promise<Map<string, ChainPoint[]>> {
  const decode = opts?.decode ?? encodedGeometryToChainPoints;
  const missing = legs.filter((leg) => !routeGeometryCache.has(leg.cacheKey));

  let cursor = 0;
  const worker = async () => {
    while (cursor < missing.length) {
      if (signal?.aborted) return;
      const index = cursor;
      cursor += 1;
      const leg = missing[index];
      try {
        const res = await routeFn({
          fromLat: leg.from.lat,
          fromLng: leg.from.lng,
          toLat: leg.to.lat,
          toLng: leg.to.lng,
          mode: leg.osrmMode,
          alternatives: false,
          signal,
        });
        const geometry = res.routes[0]?.geometry?.trim();
        if (geometry) routeGeometryCache.set(leg.cacheKey, geometry);
      } catch {
        if (signal?.aborted) return;
      }
    }
  };

  const workers = Math.min(FETCH_CONCURRENCY, missing.length);
  if (workers > 0) {
    await Promise.all(Array.from({ length: workers }, () => worker()));
  }

  return readCachedRouteGeometries(legs, decode);
}

export function clearPlanRouteGeometryCache(): void {
  routeGeometryCache.clear();
}
