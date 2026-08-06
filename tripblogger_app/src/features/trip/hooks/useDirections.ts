import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { mapService } from '../services/map.service';
import { useMapStore } from '../store/map.store';

export function useDirections() {
  const origin = useMapStore((s) => s.directionsOrigin);
  const destination = useMapStore((s) => s.directionsDestination);
  const mode = useMapStore((s) => s.travelMode);
  const setRouteResult = useMapStore((s) => s.setRouteResult);
  const activeSheet = useMapStore((s) => s.activeSheet);

  const enabled =
    activeSheet === 'directions' &&
    !!origin &&
    !!destination &&
    Number.isFinite(origin.lat) &&
    Number.isFinite(destination.lat);

  const query = useQuery({
    queryKey: [
      'map',
      'route',
      mode,
      origin?.lat,
      origin?.lng,
      destination?.lat,
      destination?.lng,
    ],
    enabled,
    queryFn: () =>
      mapService.route({
        fromLat: origin!.lat,
        fromLng: origin!.lng,
        toLat: destination!.lat,
        toLng: destination!.lng,
        mode,
        alternatives: true,
      }),
    staleTime: 2 * 60_000,
  });

  useEffect(() => {
    if (query.data) setRouteResult(query.data);
  }, [query.data, setRouteResult]);

  return query;
}
