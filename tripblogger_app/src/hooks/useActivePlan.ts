import { useMemo } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '@/src/i18n';
import { formatApiError } from '@/src/utils/format-api-error';
import { useTripMapStore } from '@/src/store/trip-map.store';
import { tripsService } from '@/src/services/api/trips.service';
import type { TripDto, TripStopDto } from '@/src/types/trip';
import type { MapExplorePin, MapRouteStop } from '@/src/types/trip-map';
import { useTripsInProgress } from '@/src/hooks/useTripsInProgress';
import { pickTripDayForNewStop } from '@/src/utils/pick-trip-day';

type AddNodeInput = {
  pin: MapExplorePin;
  dayId?: string;
};

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultTripTitle(name: string): string {
  const trimmed = name.trim();
  return trimmed ? `Chuyến đi ${trimmed}` : 'Chuyến đi mới';
}

function flattenStops(trip: TripDto): MapRouteStop[] {
  const days = [...(trip.days ?? [])].sort((a, b) => a.dayNumber - b.dayNumber);
  const out: MapRouteStop[] = [];
  let seq = 0;
  for (const day of days) {
    const stops = [...(day.stops ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);
    for (const stop of stops) {
      const latitude = stop.location?.latitude ?? stop.customLatitude ?? null;
      const longitude = stop.location?.longitude ?? stop.customLongitude ?? null;
      if (latitude == null || longitude == null) continue;
      seq += 1;
      out.push({
        id: stop.id,
        name: stop.location?.name ?? stop.customName ?? 'Điểm dừng',
        latitude,
        longitude,
        status: stop.status,
        orderIndex: stop.orderIndex,
        dayNumber: day.dayNumber,
        sequenceIndex: seq,
        locationId: stop.location?.id,
        visitedAt: stop.visitedAt ?? null,
        locationType: stop.location?.locationType ?? (stop.customName ? { code: 'other', name: 'Tùy chỉnh' } : null),
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

function addStopPayload(pin: MapExplorePin) {
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pin.id);
  return uuidLike
    ? { locationId: pin.id }
    : {
        customName: pin.name,
        customAddress: pin.address ?? undefined,
        lat: pin.latitude,
        lng: pin.longitude,
      };
}

function patchStopInTrip(trip: TripDto, updatedStop: TripStopDto): TripDto {
  const days = (trip.days ?? []).map((day) => ({
    ...day,
    stops: (day.stops ?? []).map((stop) => (stop.id === updatedStop.id ? updatedStop : stop)),
  }));
  return { ...trip, days };
}

export function useActivePlan(enabled = true) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const selectedTripId = useTripMapStore((s) => s.selectedTripId);
  const setSelectedTripId = useTripMapStore((s) => s.setSelectedTripId);
  const inProgress = useTripsInProgress(enabled);

  const tripId = useMemo(() => {
    if (!inProgress.trips.length) return null;
    if (selectedTripId && inProgress.trips.some((t) => t.id === selectedTripId)) return selectedTripId;
    const active = inProgress.trips.find((t) => t.status === 'ACTIVE');
    return active?.id ?? inProgress.trips[0]?.id ?? null;
  }, [inProgress.trips, selectedTripId]);

  const trip = useMemo(
    () => (tripId ? inProgress.trips.find((t) => t.id === tripId) ?? null : null),
    [inProgress.trips, tripId],
  );
  const routeStops = useMemo(() => (trip ? flattenStops(trip) : []), [trip]);
  const nextStop = useMemo(() => pickNextStop(routeStops), [routeStops]);

  const addNode = useMutation({
    mutationFn: async ({ pin, dayId }: AddNodeInput) => {
      let currentTrip = trip;
      if (!currentTrip) {
        const today = isoToday();
        currentTrip = await tripsService.create({
          title: defaultTripTitle(pin.name),
          destinationName: pin.name,
          startDate: today,
          endDate: today,
        });
        await tripsService.bootstrapItinerary(currentTrip.id);
        currentTrip = await tripsService.getById(currentTrip.id);
        setSelectedTripId(currentTrip.id);
      }
      const targetDay =
        dayId ? currentTrip.days?.find((d) => d.id === dayId) ?? null : pickTripDayForNewStop(currentTrip);
      if (!targetDay) throw new Error('NO_DAY');
      await tripsService.addStop(currentTrip.id, targetDay.id, addStopPayload(pin));
      return currentTrip.id;
    },
    onSuccess: (newTripId) => {
      void qc.invalidateQueries({ queryKey: ['trips', 'in-progress'] });
      void qc.invalidateQueries({ queryKey: ['trips', newTripId] });
      setSelectedTripId(newTripId);
    },
    onError: (e) => Alert.alert(t('tripAddStopFailedTitle'), formatApiError(e, t('tripAddStopFailedMessage'))),
  });

  const removeStop = useMutation({
    mutationFn: async (stopId: string) => {
      if (!tripId) throw new Error('NO_TRIP');
      await tripsService.deleteStop(tripId, stopId);
      return tripId;
    },
    onSuccess: (id) => {
      void qc.invalidateQueries({ queryKey: ['trips', 'in-progress'] });
      void qc.invalidateQueries({ queryKey: ['trips', id] });
    },
  });

  const reorderStops = useMutation({
    mutationFn: async (stops: { id: string; orderIndex: number }[]) => {
      if (!tripId) throw new Error('NO_TRIP');
      await tripsService.reorderStops(tripId, stops);
      return tripId;
    },
    onSuccess: (id) => {
      void qc.invalidateQueries({ queryKey: ['trips', 'in-progress'] });
      void qc.invalidateQueries({ queryKey: ['trips', id] });
    },
  });

  const patchStop = useMutation({
    mutationFn: async (args: {
      stopId: string;
      body: {
        status?: 'PLANNED' | 'VISITING' | 'VISITED' | 'SKIPPED';
        orderIndex?: number;
        arrivalTime?: string | null;
        durationMinutes?: number | null;
        budgetEstimate?: number | null;
        actualSpent?: number | null;
        notes?: string | null;
        tripDayId?: string;
      };
    }) => {
      if (!tripId) throw new Error('NO_TRIP');
      return tripsService.patchStop(tripId, args.stopId, args.body);
    },
    onMutate: async ({ stopId, body }) => {
      if (!tripId) return null;
      const key = ['trips', 'in-progress'] as const;
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<TripDto[]>(key);
      if (previous) {
        const nextItems = previous.map((t) => {
          if (t.id !== tripId) return t;
          const days = (t.days ?? []).map((day) => ({
            ...day,
            stops: day.stops.map((stop) => (stop.id === stopId ? { ...stop, ...body } : stop)),
          }));
          return { ...t, days };
        });
        qc.setQueryData(key, nextItems);
      }
      return { previous, key };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.key, ctx.previous);
    },
    onSuccess: (updated) => {
      if (!tripId) return;
      const key = ['trips', 'in-progress'] as const;
      const current = qc.getQueryData<TripDto[]>(key);
      if (current) {
        qc.setQueryData(
          key,
          current.map((t) => (t.id === tripId ? patchStopInTrip(t, updated) : t)),
        );
      }
      void qc.invalidateQueries({ queryKey: ['trips', tripId] });
    },
  });

  const renameTrip = useMutation({
    mutationFn: async (title: string) => {
      if (!tripId) throw new Error('NO_TRIP');
      return tripsService.update(tripId, { title });
    },
    onSuccess: (updated) => {
      void qc.invalidateQueries({ queryKey: ['trips', 'in-progress'] });
      qc.setQueryData(['trips', updated.id], updated);
    },
  });

  const changeDates = useMutation({
    mutationFn: async (dates: { startDate: string; endDate: string }) => {
      if (!tripId) throw new Error('NO_TRIP');
      return tripsService.changeDates(tripId, dates);
    },
    onSuccess: (updated) => {
      void qc.invalidateQueries({ queryKey: ['trips', 'in-progress'] });
      qc.setQueryData(['trips', updated.id], updated);
    },
  });

  const setStatus = useMutation({
    mutationFn: async (status: TripDto['status']) => {
      if (!tripId) throw new Error('NO_TRIP');
      return tripsService.updateStatus(tripId, status);
    },
    onSuccess: (updated) => {
      void qc.invalidateQueries({ queryKey: ['trips', 'in-progress'] });
      qc.setQueryData(['trips', updated.id], updated);
    },
  });

  const duplicateTrip = useMutation({
    mutationFn: async () => {
      if (!tripId) throw new Error('NO_TRIP');
      return tripsService.duplicate(tripId);
    },
    onSuccess: (newTrip) => {
      setSelectedTripId(newTrip.id);
      void qc.invalidateQueries({ queryKey: ['trips', 'in-progress'] });
    },
  });

  const deleteTrip = useMutation({
    mutationFn: async () => {
      if (!tripId) throw new Error('NO_TRIP');
      await tripsService.delete(tripId);
      return tripId;
    },
    onSuccess: () => {
      setSelectedTripId(null);
      void qc.invalidateQueries({ queryKey: ['trips', 'in-progress'] });
    },
  });

  return {
    selectedTripId: tripId,
    setSelectedTripId,
    plan: trip,
    plans: inProgress.trips,
    routeStops,
    nextStop,
    visitedCount: routeStops.filter((s) => s.status === 'VISITED').length,
    isLoading: inProgress.isLoading,
    addNode,
    removeStop,
    reorderStops,
    patchStop,
    renameTrip,
    changeDates,
    setStatus,
    duplicateTrip,
    deleteTrip,
  };
}
