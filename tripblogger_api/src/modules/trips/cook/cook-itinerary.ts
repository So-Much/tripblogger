import { haversineKm } from '../utils/haversine';

export type CookSlotType = 'POI' | 'FOOD' | 'STAY' | 'CUSTOM';
export type CookBlockSource = 'TEMPLATE' | 'PICK' | 'SWAP' | 'MANUAL';

export type CookLocationInput = {
  locationId: string;
  lat: number;
  lng: number;
  slotType: CookSlotType;
  defaultDurationMin: number | null;
  source: CookBlockSource;
};

export type CookDoneBlock = {
  id: string;
  locationId: string | null;
  tripDayId: string | null;
  orderIndex: number;
};

export type CookDayInput = {
  id: string;
  dayNumber: number;
  date: string;
};

export type CookInput = {
  days: CookDayInput[];
  picks: CookLocationInput[];
  anchor: { lat: number; lng: number };
  /** Existing DONE blocks — preserved as-is */
  doneBlocks?: CookDoneBlock[];
  /** Location IDs already represented by DONE blocks (excluded from new packing) */
  clusterThresholdKm?: number;
  dayCapacityMin?: number;
};

export type CookBlockOutput = {
  tripDayId: string | null;
  orderIndex: number;
  locationId: string;
  slotType: CookSlotType;
  source: CookBlockSource;
  plannedDurationMin: number;
  status: 'PLANNED';
};

export type CookResult = {
  blocks: CookBlockOutput[];
  unscheduled: CookBlockOutput[];
  emptyPlan: boolean;
};

const DURATION_DEFAULTS: Record<CookSlotType, number> = {
  POI: 90,
  FOOD: 60,
  STAY: 0,
  CUSTOM: 60,
};

export function durationFor(slotType: CookSlotType, defaultDurationMin: number | null): number {
  if (defaultDurationMin != null && defaultDurationMin >= 0) return defaultDurationMin;
  return DURATION_DEFAULTS[slotType] ?? 60;
}

function nearestNeighborOrder(
  items: CookLocationInput[],
  start: { lat: number; lng: number },
): CookLocationInput[] {
  const remaining = [...items];
  const ordered: CookLocationInput[] = [];
  let cur = start;
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(cur.lat, cur.lng, remaining[i].lat, remaining[i].lng);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    cur = { lat: next.lat, lng: next.lng };
  }
  return ordered;
}

/**
 * Geo-cluster + duration packing per spec §6.
 * STAY picks are skipped from day packing (accommodation entity separate).
 */
export function cookItinerary(input: CookInput): CookResult {
  const thresholdKm = input.clusterThresholdKm ?? 8;
  const dayCapacity = input.dayCapacityMin ?? 480;
  const days = [...input.days].sort((a, b) => a.dayNumber - b.dayNumber);

  const doneLocationIds = new Set(
    (input.doneBlocks ?? []).map((b) => b.locationId).filter((id): id is string => !!id),
  );

  const packable = input.picks.filter(
    (p) => p.slotType !== 'STAY' && !doneLocationIds.has(p.locationId),
  );

  if (!days.length) {
    return { blocks: [], unscheduled: [], emptyPlan: true };
  }

  if (!packable.length) {
    return { blocks: [], unscheduled: [], emptyPlan: true };
  }

  const dayBuckets: CookLocationInput[][] = days.map(() => []);
  const dayUsedMin: number[] = days.map(() => 0);
  const unscheduledLocs: CookLocationInput[] = [];

  const ordered = nearestNeighborOrder(packable, input.anchor);

  for (const loc of ordered) {
    const dur = durationFor(loc.slotType, loc.defaultDurationMin);
    let placed = false;

    // Prefer a day that already has nearby points and capacity
    for (let di = 0; di < days.length; di++) {
      const bucket = dayBuckets[di];
      if (dayUsedMin[di] + dur > dayCapacity && bucket.length > 0) continue;

      if (bucket.length === 0) {
        // Prefer empty day only if no earlier day with nearby + capacity
        let betterEarlier = false;
        for (let ej = 0; ej < di; ej++) {
          if (dayBuckets[ej].length === 0) continue;
          if (dayUsedMin[ej] + dur > dayCapacity) continue;
          const last = dayBuckets[ej][dayBuckets[ej].length - 1];
          if (haversineKm(last.lat, last.lng, loc.lat, loc.lng) <= thresholdKm) {
            betterEarlier = true;
            break;
          }
        }
        if (betterEarlier) continue;
        dayBuckets[di].push(loc);
        dayUsedMin[di] += dur;
        placed = true;
        break;
      }

      const ref = bucket[bucket.length - 1];
      const dist = haversineKm(ref.lat, ref.lng, loc.lat, loc.lng);
      if (dist <= thresholdKm && dayUsedMin[di] + dur <= dayCapacity) {
        dayBuckets[di].push(loc);
        dayUsedMin[di] += dur;
        placed = true;
        break;
      }
    }

    if (!placed) {
      // Fill any day with remaining capacity (geo soft)
      for (let di = 0; di < days.length; di++) {
        if (dayUsedMin[di] + dur <= dayCapacity) {
          dayBuckets[di].push(loc);
          dayUsedMin[di] += dur;
          placed = true;
          break;
        }
      }
    }

    if (!placed) unscheduledLocs.push(loc);
  }

  const blocks: CookBlockOutput[] = [];
  for (let di = 0; di < days.length; di++) {
    const dayOrdered = nearestNeighborOrder(dayBuckets[di], input.anchor);
    dayOrdered.forEach((loc, orderIndex) => {
      blocks.push({
        tripDayId: days[di].id,
        orderIndex,
        locationId: loc.locationId,
        slotType: loc.slotType,
        source: loc.source,
        plannedDurationMin: durationFor(loc.slotType, loc.defaultDurationMin),
        status: 'PLANNED',
      });
    });
  }

  const unscheduled: CookBlockOutput[] = unscheduledLocs.map((loc, orderIndex) => ({
    tripDayId: null,
    orderIndex,
    locationId: loc.locationId,
    slotType: loc.slotType,
    source: loc.source,
    plannedDurationMin: durationFor(loc.slotType, loc.defaultDurationMin),
    status: 'PLANNED' as const,
  }));

  return {
    blocks: [...blocks, ...unscheduled],
    unscheduled,
    emptyPlan: blocks.length === 0 && unscheduled.length === 0,
  };
}
