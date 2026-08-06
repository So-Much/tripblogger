import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { mapService } from '../services/map.service';
import { useMapStore } from '../store/map.store';
import type { PoiCategoryId } from '../types/map';

export function useNearbyPlaces(
  center: { lat: number; lng: number } | null,
  category: PoiCategoryId | null,
) {
  const setNearbyPlaces = useMapStore((s) => s.setNearbyPlaces);

  const query = useQuery({
    queryKey: ['map', 'nearby', category, center?.lat.toFixed(4), center?.lng.toFixed(4)],
    enabled: !!center && !!category,
    queryFn: () =>
      mapService.nearby({
        lat: center!.lat,
        lng: center!.lng,
        category: category!,
        radius: 2000,
        limit: 50,
      }),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (query.data) setNearbyPlaces(query.data);
    if (!category) setNearbyPlaces([]);
  }, [query.data, category, setNearbyPlaces]);

  return query;
}
