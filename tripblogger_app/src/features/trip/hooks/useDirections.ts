import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { mapService } from '../services/map.service';
import { useMapStore } from '../store/map.store';

export function useDirections() {
  const origin = useMapStore((s) => s.directionsOrigin);
  const destination = useMapStore((s) => s.directionsDestination);
  const mode = useMapStore((s) => s.travelMode);
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
    queryFn: ({ signal }) =>
      mapService.route({
        fromLat: origin!.lat,
        fromLng: origin!.lng,
        toLat: destination!.lat,
        toLng: destination!.lng,
        mode,
        alternatives: true,
        signal,
      }),
    staleTime: 2 * 60_000,
  });

  useEffect(() => {
    if (!query.data) return;
    // Ignore late responses after the user closed directions / changed destination.
    // (RQ already aborts the HTTP call via `signal` when the query key / enabled flips.)
    const state = useMapStore.getState();
    if (state.activeSheet !== 'directions' || !state.directionsDestination) return;
    if (
      state.directionsDestination.lat !== destination?.lat ||
      state.directionsDestination.lng !== destination?.lng
    ) {
      return;
    }
    state.setRouteResult(query.data);
  }, [query.data, destination?.lat, destination?.lng]);

  return query;
}
