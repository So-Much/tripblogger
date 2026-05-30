import { apiClient } from '@/src/services/api/client';
import type {
  PaginatedTrips,
  TripAccommodationDto,
  TripDayDto,
  TripDto,
  TripRecommendationDto,
  TripStatus,
  TripStopDto,
} from '@/src/types/trip';

export const tripsService = {
  async listMine(params?: { status?: TripStatus; page?: number; limit?: number }): Promise<PaginatedTrips> {
    const res = await apiClient.get<PaginatedTrips>('/trips', { params });
    return res.data;
  },

  async explore(params?: { page?: number; limit?: number }): Promise<PaginatedTrips> {
    const res = await apiClient.get<PaginatedTrips>('/trips/explore', { params });
    return res.data;
  },

  async getById(tripId: string): Promise<TripDto> {
    const res = await apiClient.get<TripDto>(`/trips/${tripId}`);
    return res.data;
  },

  async create(body: {
    title: string;
    destinationName?: string;
    startDate: string;
    endDate: string;
    totalBudget?: number;
    description?: string;
  }): Promise<TripDto> {
    const res = await apiClient.post<TripDto>('/trips', body);
    return res.data;
  },

  async updateStatus(tripId: string, status: TripStatus): Promise<TripDto> {
    const res = await apiClient.patch<TripDto>(`/trips/${tripId}/status`, { status });
    return res.data;
  },

  async addAccommodation(
    tripId: string,
    body: {
      locationId?: string;
      customName?: string;
      customAddress?: string;
      lat?: number;
      lng?: number;
      checkIn: string;
      checkOut: string;
      pricePerNight?: number;
      isPrimary?: boolean;
    },
  ): Promise<TripAccommodationDto> {
    const res = await apiClient.post<TripAccommodationDto>(`/trips/${tripId}/accommodations`, body);
    return res.data;
  },

  async addStop(
    tripId: string,
    dayId: string,
    body: {
      locationId?: string;
      customName?: string;
      orderIndex?: number;
      budgetEstimate?: number;
    },
  ): Promise<TripStopDto> {
    const res = await apiClient.post<TripStopDto>(`/trips/${tripId}/days/${dayId}/stops`, body);
    return res.data;
  },

  async checkinStop(tripId: string, stopId: string): Promise<TripStopDto> {
    const res = await apiClient.post<TripStopDto>(`/trips/${tripId}/stops/${stopId}/checkin`);
    return res.data;
  },

  async completeStop(tripId: string, stopId: string): Promise<TripStopDto> {
    const res = await apiClient.post<TripStopDto>(`/trips/${tripId}/stops/${stopId}/complete`);
    return res.data;
  },

  async listRecommendations(tripId: string): Promise<TripRecommendationDto[]> {
    const res = await apiClient.get<TripRecommendationDto[]>(`/trips/${tripId}/recommendations`);
    return res.data;
  },

  async refreshRecommendations(tripId: string): Promise<{ count: number }> {
    const res = await apiClient.post<{ count: number }>(`/trips/${tripId}/recommendations/refresh`);
    return res.data;
  },

  async dismissRecommendation(tripId: string, id: string): Promise<void> {
    await apiClient.patch(`/trips/${tripId}/recommendations/${id}`, { isDismissed: true });
  },

  async getDay(tripId: string, dayId: string): Promise<TripDayDto> {
    const res = await apiClient.get<TripDayDto>(`/trips/${tripId}/days/${dayId}`);
    return res.data;
  },
};
