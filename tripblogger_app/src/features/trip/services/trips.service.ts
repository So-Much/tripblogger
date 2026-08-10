import { apiClient } from '@/src/services/api/client';
import type {
  AddStopDto,
  CreateTripDto,
  MoveStopDto,
  PatchDayDto,
  PatchStopDto,
  PatchTripDto,
  TripDetailDto,
  TripMutationResult,
  TripSummaryDto,
} from '../types/plan';

export const tripsService = {
  async listTrips(): Promise<TripSummaryDto[]> {
    const res = await apiClient.get<TripSummaryDto[]>('/trips');
    return res.data;
  },

  async getTrip(tripId: string): Promise<TripDetailDto> {
    const res = await apiClient.get<TripDetailDto>(`/trips/${tripId}`);
    return res.data;
  },

  async createTrip(dto: CreateTripDto): Promise<TripDetailDto> {
    const res = await apiClient.post<TripDetailDto>('/trips', dto);
    return res.data;
  },

  async patchTrip(tripId: string, dto: PatchTripDto): Promise<TripDetailDto> {
    const res = await apiClient.patch<TripDetailDto>(`/trips/${tripId}`, dto);
    return res.data;
  },

  async deleteTrip(tripId: string): Promise<void> {
    await apiClient.delete(`/trips/${tripId}`);
  },

  async patchDay(tripId: string, dayId: string, dto: PatchDayDto): Promise<TripDetailDto> {
    const res = await apiClient.patch<TripDetailDto>(`/trips/${tripId}/days/${dayId}`, dto);
    return res.data;
  },

  async addStop(tripId: string, dto: AddStopDto): Promise<TripDetailDto> {
    const res = await apiClient.post<TripMutationResult>(`/trips/${tripId}/stops`, dto);
    return res.data.trip;
  },

  async patchStop(tripId: string, stopId: string, dto: PatchStopDto): Promise<TripDetailDto> {
    const res = await apiClient.patch<TripMutationResult>(
      `/trips/${tripId}/stops/${stopId}`,
      dto,
    );
    return res.data.trip;
  },

  async deleteStop(tripId: string, stopId: string): Promise<TripDetailDto> {
    const res = await apiClient.delete<TripMutationResult>(`/trips/${tripId}/stops/${stopId}`);
    return res.data.trip;
  },

  async moveStop(tripId: string, stopId: string, dto: MoveStopDto): Promise<TripDetailDto> {
    const res = await apiClient.post<TripMutationResult>(
      `/trips/${tripId}/stops/${stopId}/move`,
      dto,
    );
    return res.data.trip;
  },
};
