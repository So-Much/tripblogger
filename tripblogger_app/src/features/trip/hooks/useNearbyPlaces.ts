import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { mapService } from '../services/map.service';
import { useMapStore } from '../store/map.store';
import type { PoiCategoryId } from '../types/map';
import { mapListRetryDelay, shouldRetryMapListQuery } from './map-query-retry';

const CATEGORY_DEBOUNCE_MS = 200;

/**
 * Nearby POI lifecycle (cancel + ignore):
 *
 * 1. Tag / area invalidation bumps `nearbyEpoch` and closes any open place.
 *    Marker pins are **kept** until the new response arrives (empty→full remount
 *    of react-native-maps custom Markers crashes on tag switch).
 * 2. While the chip debounce is in flight, the query is **disabled** so React Query
 *    aborts any in-flight HTTP request for the previous key (`signal`).
 * 3. `nearbyEpoch` is part of the query key — a newer generation cannot be overwritten
 *    by a response that belonged to an older one.
 * 4. Before writing Zustand, we re-check that the user still has the same category
 *    and epoch (belt-and-suspenders if the sheet/store moved on).
 */
export function useNearbyPlaces(
  center: { lat: number; lng: number } | null,
  category: PoiCategoryId | null,
) {
  const setNearbyPlaces = useMapStore((s) => s.setNearbyPlaces);
  const nearbyEpoch = useMapStore((s) => s.nearbyEpoch);
  const [debouncedCategory, setDebouncedCategory] = useState(category);

  useEffect(() => {
    if (category == null) {
      setDebouncedCategory(null);
      return;
    }
    const t = setTimeout(() => setDebouncedCategory(category), CATEGORY_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [category]);

  const categorySettled = category != null && category === debouncedCategory;
  /** Freeze the epoch into the key only while this category is the active fetch target. */
  const fetchEpoch = categorySettled ? nearbyEpoch : -1;

  const query = useQuery({
    queryKey: [
      'map',
      'nearby',
      debouncedCategory,
      center?.lat.toFixed(4),
      center?.lng.toFixed(4),
      fetchEpoch,
    ],
    // Disabled while debouncing → RQ aborts the previous nearby request immediately.
    enabled: !!center && categorySettled,
    queryFn: ({ signal }) =>
      mapService.nearby(
        {
          lat: center!.lat,
          lng: center!.lng,
          category: debouncedCategory!,
          radius: 2000,
          limit: 50,
        },
        signal,
      ),
    // Empty `[]` is success — RQ only retries thrown/network/5xx failures.
    retry: shouldRetryMapListQuery,
    retryDelay: mapListRetryDelay,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!category) {
      setNearbyPlaces([]);
      return;
    }

    // Chip moved ahead of the debounced fetch — keep prior pins/list until settled.
    if (!categorySettled) {
      return;
    }

    const state = useMapStore.getState();
    if (state.selectedCategory !== category) return;
    if (state.nearbyEpoch !== fetchEpoch) return;

    if (query.data) {
      setNearbyPlaces(query.data);
      return;
    }

    // Still retrying / first load — keep previous markers/list painted.
    // Do not wipe to [] here; that remounts native map pins and crashes on tag switch.
    // Sheet shows loading via isFetching; exhausted error keeps previous or empty.
    if (!query.isFetching && query.isError) {
      setNearbyPlaces([]);
    }
  }, [
    query.data,
    query.isFetching,
    query.isError,
    category,
    categorySettled,
    fetchEpoch,
    setNearbyPlaces,
  ]);

  const awaitingDebounce = category != null && category !== debouncedCategory;
  const isFetching = query.isFetching || awaitingDebounce;

  return {
    ...query,
    isFetching,
    isPending: query.isPending || awaitingDebounce,
    /** Soft error only after retries are exhausted (and not mid-fetch). */
    showError: query.isError && !isFetching,
  };
}
