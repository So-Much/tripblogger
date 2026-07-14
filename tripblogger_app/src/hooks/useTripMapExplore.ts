import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { translate } from '@/src/i18n';
import { locationsService } from '@/src/services/api/locations.service';
import { useSettingsStore } from '@/src/store/settings.store';
import type { MapCheckpoint, MapExplorePin } from '@/src/types/trip-map';
import type { TripPlannerFilters } from '@/src/types/trip-planner';
import { formatApiError } from '@/src/utils/format-api-error';

type Coords = { lat: number; lng: number };

export function useTripMapExplore(filters?: TripPlannerFilters, enabled = true) {
  const [userCoords, setUserCoords] = useState<Coords | null>(null);
  const [checkpoint, setCheckpoint] = useState<MapCheckpoint | null>(null);
  const [nearbyResults, setNearbyResults] = useState<MapExplorePin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const typeCodesKey = filters?.typeCodes?.join(',') ?? '';
  const checkpointKey = checkpoint
    ? `${checkpoint.lat.toFixed(5)}:${checkpoint.lng.toFixed(5)}:${checkpoint.name}`
    : '';

  const loadNearby = useCallback(
    async (center: Coords) => {
      const reqId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const items = await locationsService.nearby({
          lat: center.lat,
          lng: center.lng,
          sort: filters?.sort ?? 'rating',
          typeCodes: filters?.typeCodes,
          radiusKm: filters?.radiusKm ?? 10,
          minRating: filters?.minRating,
          q: filters?.keyword?.trim() || undefined,
          limit: 30,
        });
        if (reqId !== requestIdRef.current) return;
        setNearbyResults(
          items.map((item) => ({
            id: item.id,
            name: item.name,
            address: item.address,
            latitude: item.latitude,
            longitude: item.longitude,
            avgRating: item.avgRating ?? 0,
            totalReview: item.totalReview ?? 0,
            distanceKm: item.distanceKm,
            locationType: item.locationType
              ? {
                  code: item.locationType.code,
                  name: item.locationType.name,
                  icon: item.locationType.icon,
                }
              : null,
          })),
        );
      } catch (e) {
        if (reqId !== requestIdRef.current) return;
        const language = useSettingsStore.getState().language;
        setError(formatApiError(e, translate(language, 'tripExploreNearbyFailed')));
        setNearbyResults([]);
      } finally {
        if (reqId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [filters?.keyword, filters?.minRating, filters?.radiusKm, filters?.sort, filters?.typeCodes],
  );

  useEffect(() => {
    if (!enabled) {
      requestIdRef.current += 1;
      setLoading(false);
      setError(null);
      setNearbyResults([]);
      setCheckpoint(null);
      setUserCoords(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== Location.PermissionStatus.GRANTED) {
          if (!cancelled) {
            const language = useSettingsStore.getState().language;
            setError(translate(language, 'tripLocationPermissionExplore'));
            setLoading(false);
          }
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
      } catch (e) {
        if (!cancelled) {
          const language = useSettingsStore.getState().language;
          setError(formatApiError(e, translate(language, 'tripCurrentLocationFailed')));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const center = checkpoint ?? userCoords;
    if (!center) return;
    void loadNearby(center);
  }, [enabled, userCoords, filters?.sort, typeCodesKey, checkpointKey, checkpoint, loadNearby]);

  const selectCheckpoint = useCallback((next: MapCheckpoint) => {
    if (!enabled) return;
    setCheckpoint(next);
  }, [enabled]);

  const clearCheckpoint = useCallback(() => {
    if (!enabled) return;
    setCheckpoint(null);
  }, [enabled]);

  const reloadNearby = useCallback(async () => {
    if (!enabled) return;
    const center = checkpoint ?? userCoords;
    if (!center) return;
    await loadNearby(center);
  }, [enabled, checkpoint, userCoords, loadNearby]);

  const exploreCenter = checkpoint ?? userCoords;

  return {
    userCoords,
    checkpoint,
    nearbyResults,
    loading,
    error,
    exploreCenter,
    selectCheckpoint,
    clearCheckpoint,
    reloadNearby,
  };
}
