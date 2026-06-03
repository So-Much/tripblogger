import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTripMapStore } from '@/src/store/trip-map.store';
import { tripsService } from '@/src/services/api/trips.service';
import type { TripDto } from '@/src/types/trip';
import type { MapRouteStop } from '@/src/types/trip-map';
import { useTripsInProgress } from '@/src/hooks/useTripsInProgress';

function flattenStops(trip: TripDto): MapRouteStop[] {
  const days = [...(trip.days ?? [])].sort((a, b) => a.dayNumber - b.dayNumber);
  const out: MapRouteStop[] = [];
  let seq = 0;

  for (const day of days) {
    const stops = [...(day.stops ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);
    for (const stop of stops) {
      const lat = stop.location?.latitude ?? stop.customLatitude ?? null;
      const lng = stop.location?.longitude ?? stop.customLongitude ?? null;
      if (lat == null || lng == null) continue;
      seq += 1;
      out.push({
        id: stop.id,
        name: stop.location?.name ?? stop.customName ?? 'Điểm dừng',
        latitude: lat,
        longitude: lng,
        status: stop.status,
        orderIndex: stop.orderIndex,
        dayNumber: day.dayNumber,
        sequenceIndex: seq,
        locationId: stop.location?.id,
        visitedAt: stop.visitedAt ?? null,
        locationType: stop.location?.locationType
          ? {
              code: stop.location.locationType.code,
              name: stop.location.locationType.name,
              icon: stop.location.locationType.icon,
            }
          : stop.customName
            ? { code: 'other', name: 'Tùy chỉnh' }
            : null,
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
  const selectedTripId = useTripMapStore((s) => s.selectedTripId);
  const inProgress = useTripsInProgress(enabled);

  const tripId = useMemo(() => {
    if (!inProgress.trips.length) return null;
    if (selectedTripId && inProgress.trips.some((t) => t.id === selectedTripId)) {
      return selectedTripId;
    }
    const active = inProgress.trips.find((t) => t.status === 'ACTIVE');
    if (active) return active.id;
    return inProgress.trips[0]?.id ?? null;
  }, [inProgress.trips, selectedTripId]);

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

  const completedPolyline = useMemo(() => {
    if (visitingIndex <= 0) return [];
    return routeStops
      .slice(0, visitingIndex + 1)
      .map((s) => ({ latitude: s.latitude, longitude: s.longitude }));
  }, [routeStops, visitingIndex]);

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

  const visitedCount = useMemo(
    () => routeStops.filter((s) => s.status === 'VISITED').length,
    [routeStops],
  );

  return {
    trip: detailQuery.data ?? null,
    routeStops,
    polylineCoords,
    completedPolyline,
    upcomingPolyline,
    nextStop,
    visitedCount,
    isLoading: inProgress.isLoading || detailQuery.isLoading,
    inProgress,
  };
}
