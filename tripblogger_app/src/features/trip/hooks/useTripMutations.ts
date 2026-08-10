import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tripsService } from '../services/trips.service';
import type {
  AddStopDto,
  CreateTripDto,
  MoveStopDto,
  PatchDayDto,
  PatchStopDto,
  PatchTripDto,
  TripDetailDto,
  TripSummaryDto,
} from '../types/plan';
import { toTripSummary } from '../types/plan';
import { tripKeys } from './trip-query-keys';

function upsertTripInList(list: TripSummaryDto[] | undefined, summary: TripSummaryDto): TripSummaryDto[] {
  if (!list) return [summary];
  const idx = list.findIndex((t) => t.id === summary.id);
  if (idx === -1) return [summary, ...list];
  const next = list.slice();
  next[idx] = summary;
  return next;
}

function cacheTripDetail(
  queryClient: ReturnType<typeof useQueryClient>,
  trip: TripDetailDto,
  options?: { updateList?: boolean },
) {
  queryClient.setQueryData(tripKeys.detail(trip.id), trip);
  if (options?.updateList !== false) {
    queryClient.setQueryData<TripSummaryDto[]>(tripKeys.all, (old) =>
      upsertTripInList(old, toTripSummary(trip)),
    );
  }
}

export function useCreateTripMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['trips', 'create'],
    mutationFn: (dto: CreateTripDto) => tripsService.createTrip(dto),
    onSuccess: (trip) => {
      cacheTripDetail(queryClient, trip);
    },
  });
}

export function usePatchTripMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['trips', 'patch'],
    mutationFn: ({ tripId, dto }: { tripId: string; dto: PatchTripDto }) =>
      tripsService.patchTrip(tripId, dto),
    onSuccess: (trip) => {
      cacheTripDetail(queryClient, trip);
    },
  });
}

export function useDeleteTripMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['trips', 'delete'],
    mutationFn: (tripId: string) => tripsService.deleteTrip(tripId),
    onSuccess: (_void, tripId) => {
      queryClient.removeQueries({ queryKey: tripKeys.detail(tripId) });
      queryClient.setQueryData<TripSummaryDto[]>(tripKeys.all, (old) =>
        old?.filter((t) => t.id !== tripId),
      );
    },
  });
}

export function usePatchDayMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['trips', 'patchDay'],
    mutationFn: ({
      tripId,
      dayId,
      dto,
    }: {
      tripId: string;
      dayId: string;
      dto: PatchDayDto;
    }) => tripsService.patchDay(tripId, dayId, dto),
    onSuccess: (trip) => {
      cacheTripDetail(queryClient, trip, { updateList: false });
    },
  });
}

export function useAddStopMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['trips', 'addStop'],
    mutationFn: ({ tripId, dto }: { tripId: string; dto: AddStopDto }) =>
      tripsService.addStop(tripId, dto),
    onSuccess: (trip) => {
      cacheTripDetail(queryClient, trip, { updateList: false });
    },
  });
}

export function usePatchStopMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['trips', 'patchStop'],
    mutationFn: ({
      tripId,
      stopId,
      dto,
    }: {
      tripId: string;
      stopId: string;
      dto: PatchStopDto;
    }) => tripsService.patchStop(tripId, stopId, dto),
    onSuccess: (trip) => {
      cacheTripDetail(queryClient, trip, { updateList: false });
    },
  });
}

export function useDeleteStopMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['trips', 'deleteStop'],
    mutationFn: ({ tripId, stopId }: { tripId: string; stopId: string }) =>
      tripsService.deleteStop(tripId, stopId),
    onSuccess: (trip) => {
      cacheTripDetail(queryClient, trip, { updateList: false });
    },
  });
}

export function useMoveStopMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['trips', 'moveStop'],
    mutationFn: ({
      tripId,
      stopId,
      dto,
    }: {
      tripId: string;
      stopId: string;
      dto: MoveStopDto;
    }) => tripsService.moveStop(tripId, stopId, dto),
    onSuccess: (trip) => {
      cacheTripDetail(queryClient, trip, { updateList: false });
    },
  });
}
