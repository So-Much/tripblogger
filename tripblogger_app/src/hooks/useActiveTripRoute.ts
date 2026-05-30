import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tripsService } from '@/src/services/api/trips.service';
import type { TripDto } from '@/src/types/trip';
import type { MapRouteStop } from '@/src/types/trip-map';

function flattenStops(trip: TripDto): MapRouteStop[] {
  const days = [...(trip.days ?? [])].sort((a, b) => a.dayNumber - b.dayNumber);
  const out: MapRouteStop[] = [];

  for (const day of days) {
    const stops = [...(day.stops ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);
    for (const stop of stops) {
      const lat = stop.location?.latitude ?? stop.customLatitude ?? null;
      const lng = stop.location?.longitude ?? stop.customLongitude ?? null;
      if (lat == null || lng == null) continue;
      out.push({
        id: stop.id,
        name: stop.location?.name ?? stop.customName ?? 'Điểm dừng',
        latitude: lat,
        longitude: lng,
        status: stop.status,
        orderIndex: stop.orderIndex,
        dayNumber: day.dayNumber,
      });
    }
  }

  return out;
}

function pickNextStop(stops: MapRouteStop[]): MapRouteStop | null {
  const visiting = stops.find((s) => s.status === 'VISITING');
  if (visiting) return visiting;
  return stops.find((s) => s.status === 'PLANNED') ?? null;
}

export function useActiveTripRoute(enabled = true) {
  const listQuery = useQuery({
    queryKey: ['trips', 'active-or-planning'],
    queryFn: async () => {
      const active = await tripsService.listMine({ status: 'ACTIVE', limit: 1 });
      if (active.items.length > 0) return active.items[0];
      const planning = await tripsService.listMine({ status: 'PLANNING', limit: 1 });
      return planning.items[0] ?? null;
    },
    enabled,
  });

  const tripId = listQuery.data?.id;

  const detailQuery = useQuery({
    queryKey: ['trips', 'route', tripId],
    queryFn: () => tripsService.getById(String(tripId)),
    enabled: enabled && Boolean(tripId),
  });

  const routeStops = useMemo(() => {
    if (!detailQuery.data) return [];
    return flattenStops(detailQuery.data);
  }, [detailQuery.data]);

  const polylineCoords = useMemo(
    () => routeStops.map((s) => ({ latitude: s.latitude, longitude: s.longitude })),
    [routeStops],
  );

  const nextStop = useMemo(() => pickNextStop(routeStops), [routeStops]);

  const visitingIndex = useMemo(
    () => routeStops.findIndex((s) => s.status === 'VISITING'),
    [routeStops],
  );

  const upcomingPolyline = useMemo(() => {
    if (visitingIndex >= 0) {
      return routeStops.slice(visitingIndex).map((s) => ({ latitude: s.latitude, longitude: s.longitude }));
    }
    const firstPlanned = routeStops.findIndex((s) => s.status === 'PLANNED');
    if (firstPlanned >= 0) {
      return routeStops.slice(firstPlanned).map((s) => ({ latitude: s.latitude, longitude: s.longitude }));
    }
    return polylineCoords;
  }, [polylineCoords, routeStops, visitingIndex]);

  return {
    trip: detailQuery.data ?? null,
    routeStops,
    polylineCoords,
    upcomingPolyline,
    nextStop,
    isLoading: listQuery.isLoading || detailQuery.isLoading,
  };
}
