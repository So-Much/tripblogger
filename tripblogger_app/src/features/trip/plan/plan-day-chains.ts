import { decodePolyline6 } from '../utils/geo';
import { planDayColor } from './plan-day-color';

export type DayChainStop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  position: number;
};

export type ChainPoint = {
  latitude: number;
  longitude: number;
};

export type DayChain = {
  dayId: string;
  dayIndex: number;
  color: string;
  stops: DayChainStop[];
  /** One segment per consecutive pair; never spans days. */
  polylines: ChainPoint[][];
};

export type DayChainStopInput = DayChainStop & {
  /** Optional OSRM polyline6 for the leg *to* this stop. */
  travelGeometry?: string | null;
};

export type DayChainInput = {
  id: string;
  dayIndex: number;
  stops: DayChainStopInput[];
};

function segmentForLeg(prev: DayChainStop, cur: DayChainStopInput): ChainPoint[] {
  const encoded = cur.travelGeometry?.trim();
  if (encoded) {
    const decoded = decodePolyline6(encoded)
      .filter(([lng, lat]) => Number.isFinite(lat) && Number.isFinite(lng))
      .map(([longitude, latitude]) => ({ latitude, longitude }));
    if (decoded.length > 1) return decoded;
  }
  return [
    { latitude: prev.lat, longitude: prev.lng },
    { latitude: cur.lat, longitude: cur.lng },
  ];
}

export type DayChainMapSelection = {
  sheetKind: 'day' | 'ideas' | 'overview';
  selectedDayId: string | null;
};

/**
 * Map overlay for the selected Plan sheet tab:
 * - a specific day → that day's markers + polyline only
 * - Overview → every day's chain, colored per day
 * - Ideas → no day chains (ideas have no geo route)
 * Never default to "all days" when the day tab has no id yet.
 */
export function visibleDayChains(
  chains: DayChain[],
  selection: DayChainMapSelection,
): DayChain[] {
  if (selection.sheetKind === 'overview') return chains;
  if (selection.sheetKind === 'ideas') return [];
  if (selection.selectedDayId == null) return [];
  return chains.filter((c) => c.dayId === selection.selectedDayId);
}

/** Per-day stop chains for map polylines and the Overview sheet. */
export function buildDayChains(days: DayChainInput[]): DayChain[] {
  return [...days]
    .sort((a, b) => a.dayIndex - b.dayIndex)
    .map((day) => {
      const stops = [...day.stops]
        .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
        .sort((a, b) => a.position - b.position)
        .map((s) => ({
          id: s.id,
          name: s.name,
          lat: s.lat,
          lng: s.lng,
          position: s.position,
          travelGeometry: s.travelGeometry,
        }));

      const polylines: ChainPoint[][] = [];
      for (let i = 1; i < stops.length; i++) {
        polylines.push(segmentForLeg(stops[i - 1], stops[i]));
      }

      return {
        dayId: day.id,
        dayIndex: day.dayIndex,
        color: planDayColor(day.dayIndex),
        stops: stops.map(({ travelGeometry: _g, ...stop }) => stop),
        polylines,
      };
    });
}
