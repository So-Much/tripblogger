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
  async listMine(params?: { status?: TripStatus; page?: number; limit?: number; favorite?: boolean }): Promise<PaginatedTrips> {
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

  async getJournal(tripId: string): Promise<{
    tripId: string;
    days: {
      id: string;
      dayNumber: number;
      date: string;
      stops: { stopId: string; name: string; status: string; visitedAt: string | null }[];
      posts: { postId: string; linkedAt: string; title: string }[];
    }[];
  }> {
    const res = await apiClient.get(`/trips/${tripId}/journal`);
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

  async update(
    tripId: string,
    body: {
      title?: string;
      destinationName?: string | null;
      startDate?: string;
      endDate?: string;
      totalBudget?: number | null;
      description?: string | null;
      isPublic?: boolean;
      isFavorite?: boolean;
    },
  ): Promise<TripDto> {
    const res = await apiClient.patch<TripDto>(`/trips/${tripId}`, body);
    return res.data;
  },

  async changeDates(
    tripId: string,
    body: {
      startDate: string;
      endDate: string;
      shrinkPolicy?: 'delete_orphan_stops' | 'move_to_previous_day' | 'cancel';
    },
  ): Promise<TripDto> {
    const res = await apiClient.patch<TripDto>(`/trips/${tripId}/dates`, body);
    return res.data;
  },

  async updateStatus(tripId: string, status: TripStatus): Promise<TripDto> {
    const res = await apiClient.patch<TripDto>(`/trips/${tripId}/status`, { status });
    return res.data;
  },

  async bootstrapItinerary(tripId: string): Promise<TripDto> {
    const res = await apiClient.post<TripDto>(`/trips/${tripId}/bootstrap-itinerary`);
    return res.data;
  },

  async duplicate(tripId: string): Promise<TripDto> {
    const res = await apiClient.post<TripDto>(`/trips/${tripId}/duplicate`);
    return res.data;
  },

  async delete(tripId: string): Promise<void> {
    await apiClient.delete(`/trips/${tripId}`);
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
      customAddress?: string;
      lat?: number;
      lng?: number;
      orderIndex?: number;
      budgetEstimate?: number;
    },
  ): Promise<TripStopDto> {
    const res = await apiClient.post<TripStopDto>(`/trips/${tripId}/days/${dayId}/stops`, body);
    return res.data;
  },

  async patchStop(
    tripId: string,
    stopId: string,
    body: {
      status?: 'PLANNED' | 'VISITING' | 'VISITED' | 'SKIPPED';
      orderIndex?: number;
      arrivalTime?: string | null;
      durationMinutes?: number | null;
      budgetEstimate?: number | null;
      actualSpent?: number | null;
      notes?: string | null;
      tripDayId?: string;
    },
  ): Promise<TripStopDto> {
    const res = await apiClient.patch<TripStopDto>(`/trips/${tripId}/stops/${stopId}`, body);
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

  async skipStop(tripId: string, stopId: string): Promise<TripStopDto> {
    const res = await apiClient.post<TripStopDto>(`/trips/${tripId}/stops/${stopId}/skip`);
    return res.data;
  },

  async deleteStop(tripId: string, stopId: string): Promise<void> {
    await apiClient.delete(`/trips/${tripId}/stops/${stopId}`);
  },

  async reorderStops(
    tripId: string,
    stops: { id: string; orderIndex: number }[],
  ): Promise<void> {
    await apiClient.patch(`/trips/${tripId}/stops/reorder`, { stops });
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
  async markRecommendationAdded(tripId: string, id: string): Promise<void> {
    await apiClient.patch(`/trips/${tripId}/recommendations/${id}`, { isAdded: true });
  },

  async getDay(tripId: string, dayId: string): Promise<TripDayDto> {
    const res = await apiClient.get<TripDayDto>(`/trips/${tripId}/days/${dayId}`);
    return res.data;
  },

  async patchDay(
    tripId: string,
    dayId: string,
    body: {
      title?: string | null;
      theme?: string | null;
      notes?: string | null;
      date?: string;
    },
  ): Promise<TripDayDto> {
    const res = await apiClient.patch<TripDayDto>(`/trips/${tripId}/days/${dayId}`, body);
    return res.data;
  },

  async listTripPosts(tripId: string): Promise<{ postId: string; linkedAt: string; title: string; status: string }[]> {
    const res = await apiClient.get(`/trips/${tripId}/posts`);
    return res.data;
  },
  async linkTripPost(tripId: string, postId: string): Promise<void> {
    await apiClient.post(`/trips/${tripId}/posts`, { postId });
  },
  async unlinkTripPost(tripId: string, postId: string): Promise<void> {
    await apiClient.delete(`/trips/${tripId}/posts/${postId}`);
  },
};
