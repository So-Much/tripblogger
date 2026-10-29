import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { mapService } from '../services/map.service';
import type { PlanTravelMode, TripDayDto } from '../types/plan';
import { buildDayChains, visibleDayChains } from './plan-day-chains';
import {
  applyRouteGeometries,
  collectPlanRouteLegs,
  fetchPlanRouteGeometries,
  readCachedRouteGeometries,
} from './plan-route-geometry';

type Args = {
  days: TripDayDto[] | undefined;
  defaultTravelMode: PlanTravelMode | undefined;
  sheetKind: 'day' | 'ideas' | 'overview';
  selectedDayId: string | null;
  enabled: boolean;
};

/**
 * Visible Plan day-chains with live OSRM route geometry overlaid.
 * Times stay on stored table-leg seconds; this only replaces crow-fly shapes.
 */
export function usePlanRouteChains({
  days,
  defaultTravelMode,
  sheetKind,
  selectedDayId,
  enabled,
}: Args) {
  const selection = useMemo(
    () => ({ sheetKind, selectedDayId }),
    [sheetKind, selectedDayId],
  );

  const base = useMemo(() => {
    if (!enabled || !days) return [];
    return visibleDayChains(buildDayChains(days), selection);
  }, [days, enabled, selection]);

  const legs = useMemo(() => {
    if (!enabled || !days || !defaultTravelMode) return [];
    return collectPlanRouteLegs(days, defaultTravelMode, selection);
  }, [days, defaultTravelMode, enabled, selection]);

  const cacheKey = useMemo(
    () => legs.map((leg) => `${leg.dayId}:${leg.segmentIndex}:${leg.cacheKey}`).join('|'),
    [legs],
  );

  const query = useQuery({
    queryKey: ['plan', 'route-geometry', cacheKey],
    queryFn: ({ signal }) =>
      fetchPlanRouteGeometries(
        legs,
        (params) => mapService.route(params),
        signal,
      ),
    enabled: enabled && legs.length > 0,
    staleTime: 10 * 60_000,
  });

  const cached = useMemo(
    () => readCachedRouteGeometries(legs),
    // Re-read when a fetch lands so cached legs paint immediately on tab switch.
    [legs, query.data],
  );

  return useMemo(
    () => applyRouteGeometries(base, query.data ?? cached),
    [base, cached, query.data],
  );
}
