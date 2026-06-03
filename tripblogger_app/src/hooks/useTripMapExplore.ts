import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { locationsService } from '@/src/services/api/locations.service';
import type { MapCheckpoint, MapExplorePin } from '@/src/types/trip-map';
import type { TripPlannerFilters } from '@/src/types/trip-planner';
import { formatApiError } from '@/src/utils/format-api-error';

type Coords = { lat: number; lng: number };

export function useTripMapExplore(filters?: TripPlannerFilters) {
  const [userCoords, setUserCoords] = useState<Coords | null>(null);
  const [checkpoint, setCheckpoint] = useState<MapCheckpoint | null>(null);
  const [nearbyResults, setNearbyResults] = useState<MapExplorePin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNearby = useCallback(async (center: Coords) => {
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
  }, [filters?.sort, filters?.typeCodes?.join(',')]);

  const initLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== Location.PermissionStatus.GRANTED) {
        setError('Cần quyền vị trí để gợi ý địa điểm xung quanh.');
        setLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserCoords(coords);
      await loadNearby(coords);
    } catch (e) {
      setError(formatApiError(e, 'Không lấy được vị trí hiện tại'));
      setLoading(false);
    }
  }, [loadNearby]);

  useEffect(() => {
    void initLocation();
  }, [initLocation]);

  useEffect(() => {
    const center = checkpoint ?? userCoords;
    if (center) void loadNearby(center);
  }, [filters?.sort, filters?.typeCodes?.join(','), checkpoint, userCoords, loadNearby]);

  const selectCheckpoint = useCallback(
    async (next: MapCheckpoint) => {
      setCheckpoint(next);
      await loadNearby({ lat: next.lat, lng: next.lng });
    },
    [loadNearby],
  );

  const clearCheckpoint = useCallback(async () => {
    setCheckpoint(null);
    if (userCoords) {
      await loadNearby(userCoords);
    }
  }, [loadNearby, userCoords]);

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
    reloadNearby: initLocation,
  };
}
