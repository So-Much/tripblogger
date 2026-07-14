import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTripMapStore } from '@/src/store/trip-map.store';
import { tripsService } from '@/src/services/api/trips.service';
import type { TripDto } from '@/src/types/trip';
import type { MapRouteStop } from '@/src/types/trip-map';
import { useTripsInProgress } from '@/src/hooks/useTripsInProgress';
import { useTripRoutePolylines } from '@/src/hooks/useTripRoutePolylines';

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
  const plannerStops = useMemo(
    () =>
      routeStops.map((s, index) => ({
        clientId: s.id,
        locationId: s.locationId,
        name: s.name,
        lat: s.latitude,
        lng: s.longitude,
        locationType: s.locationType ?? null,
        role: (index === 0 ? 'start' : 'stop') as 'start' | 'stop',
      })),
    [routeStops],
  );
  const routed = useTripRoutePolylines(plannerStops);

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
  const stopCoords = useMemo(
    () =>
      routeStops.map((s) => ({
        id: s.id,
        latitude: s.latitude,
        longitude: s.longitude,
      })),
    [routeStops],
  );
  const completedPolylineRoute = useMemo(() => {
    if (visitingIndex <= 0 || routed.polylineCoords.length < 2) return completedPolyline;
    const cutoff = stopCoords[Math.min(visitingIndex, stopCoords.length - 1)];
    const idx = routed.polylineCoords.findIndex(
      (p) =>
        p.latitude.toFixed(5) === cutoff.latitude.toFixed(5) &&
        p.longitude.toFixed(5) === cutoff.longitude.toFixed(5),
    );
    if (idx < 0) return completedPolyline;
    return routed.polylineCoords.slice(0, idx + 1);
  }, [completedPolyline, routed.polylineCoords, stopCoords, visitingIndex]);

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
  const upcomingPolylineRoute = useMemo(() => {
    if (routed.polylineCoords.length < 2) return upcomingPolyline;
    if (visitingIndex >= 0) {
      const from = stopCoords[Math.min(visitingIndex, stopCoords.length - 1)];
      const startIdx = routed.polylineCoords.findIndex(
        (p) =>
          p.latitude.toFixed(5) === from.latitude.toFixed(5) &&
          p.longitude.toFixed(5) === from.longitude.toFixed(5),
      );
      return startIdx >= 0 ? routed.polylineCoords.slice(startIdx) : upcomingPolyline;
    }
    return routed.polylineCoords;
  }, [routed.polylineCoords, stopCoords, upcomingPolyline, visitingIndex]);

  const visitedCount = useMemo(
    () => routeStops.filter((s) => s.status === 'VISITED').length,
    [routeStops],
  );

  return {
    trip: detailQuery.data ?? null,
    routeStops,
    polylineCoords,
    completedPolyline,
    completedPolylineRoute,
    upcomingPolyline,
    upcomingPolylineRoute,
    nextStop,
    visitedCount,
    isLoading: inProgress.isLoading || detailQuery.isLoading,
    inProgress,
  };
}
