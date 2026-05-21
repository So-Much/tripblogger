import { apiClient } from '@/src/services/api/client';
import type { PlaceDto } from '@/src/types/place';

export const placesService = {
  async search(params: { q: string; lat?: number; lng?: number; limit?: number }): Promise<PlaceDto[]> {
    const res = await apiClient.get<PlaceDto[]>('/places/search', { params });
    return res.data;
  },

  async nearby(params: { lat: number; lng: number; limit?: number }): Promise<PlaceDto[]> {
    const res = await apiClient.get<PlaceDto[]>('/places/nearby', { params });
    return res.data;
  },

  async reverse(params: { lat: number; lng: number }): Promise<PlaceDto[]> {
    const res = await apiClient.get<PlaceDto[]>('/places/reverse', { params });
    return res.data;
  },
};
