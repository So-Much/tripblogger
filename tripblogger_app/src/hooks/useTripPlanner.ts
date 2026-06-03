import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { useTripPlannerStore } from '@/src/store/trip-planner.store';
import type { MapCheckpoint } from '@/src/types/trip-map';
import type { PlannerStop, TripPlannerFilters } from '@/src/types/trip-planner';
import { sameTripPlannerFilters } from '@/src/utils/trip-planner-filters';

const DEFAULT_FILTERS: TripPlannerFilters = { sort: 'rating' };

function checkpointToStart(cp: MapCheckpoint): PlannerStop {
  return {
    clientId: 'start',
    locationId: cp.locationId,
    name: cp.name,
    lat: cp.lat,
    lng: cp.lng,
    locationType: cp.locationType,
    role: 'start',
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pinToStop(pin: {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  locationId?: string;
  locationType?: PlannerStop['locationType'];
}): PlannerStop {
  const idStr = typeof pin.id === 'string' ? pin.id : '';
  return {
    clientId: Crypto.randomUUID(),
    locationId: pin.locationId ?? (UUID_RE.test(idStr) ? idStr : undefined),
    name: pin.name,
    lat: pin.latitude,
    lng: pin.longitude,
    locationType: pin.locationType,
    role: 'stop',
  };
}

function sameCheckpoint(a: MapCheckpoint | null, b: MapCheckpoint | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.lat.toFixed(5) === b.lat.toFixed(5) &&
    a.lng.toFixed(5) === b.lng.toFixed(5) &&
    a.name === b.name &&
    a.locationId === b.locationId
  );
}

function sameExtraStops(a: PlannerStop[], b: PlannerStop[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((stop, i) => stop.clientId === b[i].clientId);
}

type UseTripPlannerOptions = {
  /** Hydrate / persist draft between map tab and create screen */
  sharedDraft?: boolean;
};

export function useTripPlanner(initialPrimary?: MapCheckpoint | null, options?: UseTripPlannerOptions) {
  const sharedDraft = options?.sharedDraft ?? false;
  const clearStore = useTripPlannerStore((s) => s.clear);

  const [primary, setPrimaryState] = useState<MapCheckpoint | null>(() => {
    if (initialPrimary) return initialPrimary;
    if (sharedDraft) return useTripPlannerStore.getState().primary;
    return null;
  });
  const [extraStops, setExtraStops] = useState<PlannerStop[]>(() => {
    if (sharedDraft && !initialPrimary) return useTripPlannerStore.getState().extraStops;
    return [];
  });
  const [filters, setFiltersState] = useState<TripPlannerFilters>(() =>
    sharedDraft ? useTripPlannerStore.getState().filters : DEFAULT_FILTERS,
  );
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  useEffect(() => {
    if (!sharedDraft) return;
    const current = useTripPlannerStore.getState();
    if (
      sameCheckpoint(current.primary, primary) &&
      sameExtraStops(current.extraStops, extraStops) &&
      sameTripPlannerFilters(current.filters, filters)
    ) {
      return;
    }
    useTripPlannerStore.setState({ primary, extraStops, filters });
  }, [sharedDraft, primary, extraStops, filters]);

  const stops = useMemo((): PlannerStop[] => {
    if (!primary) return extraStops;
    return [checkpointToStart(primary), ...extraStops];
  }, [primary, extraStops]);

  const setPrimary = useCallback(
    (cp: MapCheckpoint | null) => {
      setPrimaryState(cp);
      if (!cp) return;
      setExtraStops((prev) =>
        prev.filter(
          (s) => s.lat.toFixed(5) !== cp.lat.toFixed(5) || s.lng.toFixed(5) !== cp.lng.toFixed(5),
        ),
      );
    },
    [],
  );

  const appendStop = useCallback(
    (pin: Parameters<typeof pinToStop>[0]) => {
      if (!primary) return false;
      const next = pinToStop(pin);
      const dup = stops.some(
        (s) => s.lat.toFixed(5) === next.lat.toFixed(5) && s.lng.toFixed(5) === next.lng.toFixed(5),
      );
      if (dup) return false;
      setExtraStops((prev) => [...prev, next]);
      return true;
    },
    [primary, stops],
  );

  const removeStop = useCallback((clientId: string) => {
    if (clientId === 'start') {
      setPrimaryState(null);
      return;
    }
    setExtraStops((prev) => prev.filter((s) => s.clientId !== clientId));
  }, []);

  const reorderStops = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!primary || fromIndex === 0 || toIndex === 0) return;
      setExtraStops((prev) => {
        const next = [...prev];
        const fromExtra = fromIndex - 1;
        const toExtra = toIndex - 1;
        if (fromExtra < 0 || toExtra < 0 || fromExtra >= next.length || toExtra >= next.length) {
          return prev;
        }
        const [item] = next.splice(fromExtra, 1);
        next.splice(toExtra, 0, item);
        return next;
      });
    },
    [primary],
  );

  const moveStopUp = useCallback(
    (clientId: string) => {
      const idx = stops.findIndex((s) => s.clientId === clientId);
      if (idx > 1) reorderStops(idx, idx - 1);
    },
    [stops, reorderStops],
  );

  const moveStopDown = useCallback(
    (clientId: string) => {
      const idx = stops.findIndex((s) => s.clientId === clientId);
      if (idx >= 1 && idx < stops.length - 1) reorderStops(idx, idx + 1);
    },
    [stops, reorderStops],
  );

  const findStopIndex = useCallback(
    (clientId: string) => stops.findIndex((s) => s.clientId === clientId),
    [stops],
  );

  const clear = useCallback(() => {
    setPrimaryState(null);
    setExtraStops([]);
    setSelectedPinId(null);
    setFiltersState(DEFAULT_FILTERS);
    if (sharedDraft) clearStore();
  }, [sharedDraft, clearStore]);

  const setFilters = useCallback((f: TripPlannerFilters) => setFiltersState(f), []);

  return {
    primary,
    stops,
    filters,
    selectedPinId,
    setPrimary,
    appendStop,
    removeStop,
    reorderStops,
    moveStopUp,
    moveStopDown,
    findStopIndex,
    setFilters,
    setSelectedPinId,
    clear,
    hasPrimary: Boolean(primary),
    hasAnchor: Boolean(primary),
    stopCount: stops.length,
  };
}
