import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { locationsService } from '@/src/services/api/locations.service';
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

  const userCoordsRef = useRef<Coords | null>(null);
  userCoordsRef.current = userCoords;

  const typeCodesKey = filters?.typeCodes?.join(',') ?? '';
  const checkpointKey = checkpoint
    ? `${checkpoint.lat.toFixed(5)}:${checkpoint.lng.toFixed(5)}:${checkpoint.name}`
    : '';

  const loadNearby = useCallback(
    async (center: Coords) => {
      setLoading(true);
      setError(null);
      try {
        const items = await locationsService.nearby({
          lat: center.lat,
          lng: center.lng,
          sort: filters?.sort ?? 'rating',
          typeCodes: filters?.typeCodes,
          radiusKm: 10,
          limit: 30,
        });
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
        setError(formatApiError(e, 'Không tải được địa điểm gần bạn'));
        setNearbyResults([]);
      } finally {
        setLoading(false);
      }
    },
    [filters?.sort, filters?.typeCodes],
  );

  const loadNearbyRef = useRef(loadNearby);
  loadNearbyRef.current = loadNearby;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      setNearbyResults([]);
      setCheckpoint(null);
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
            setError('Cần quyền vị trí để gợi ý địa điểm xung quanh.');
            setLoading(false);
          }
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (cancelled) return;
        setUserCoords(coords);
        await loadNearbyRef.current(coords);
      } catch (e) {
        if (!cancelled) {
          setError(formatApiError(e, 'Không lấy được vị trí hiện tại'));
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
    const center = checkpoint ?? userCoordsRef.current;
    if (!center) return;
    void loadNearbyRef.current(center);
  }, [enabled, filters?.sort, typeCodesKey, checkpointKey, checkpoint]);

  const selectCheckpoint = useCallback(async (next: MapCheckpoint) => {
    if (!enabled) return;
    setCheckpoint(next);
    await loadNearbyRef.current({ lat: next.lat, lng: next.lng });
  }, [enabled]);

  const clearCheckpoint = useCallback(async () => {
    if (!enabled) return;
    setCheckpoint(null);
    const coords = userCoordsRef.current;
    if (coords) {
      await loadNearbyRef.current(coords);
    }
  }, [enabled]);

  const reloadNearby = useCallback(async () => {
    if (!enabled) return;
    const center = checkpoint ?? userCoordsRef.current;
    if (!center) return;
    await loadNearbyRef.current(center);
  }, [enabled, checkpoint]);

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
