import { apiClient } from '@/src/services/api/client';

export type PersistedLocationDto = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  status: string;
  avgRating?: number;
  totalReview?: number;
  locationType?: { id: string; code: string; name: string; icon: string | null } | null;
};

export type NearbyLocationDto = PersistedLocationDto & { distanceKm: number };

export const locationsService = {
  async search(q: string, limit = 15, lat?: number, lng?: number): Promise<PersistedLocationDto[]> {
    const res = await apiClient.get<PersistedLocationDto[]>('/locations/search', {
      params: { q, limit, lat, lng },
    });
    return res.data;
  },

  async nearby(params: {
    lat: number;
    lng: number;
    radiusKm?: number;
    sort?: 'rating' | 'popularity';
    limit?: number;
  }): Promise<NearbyLocationDto[]> {
    const res = await apiClient.get<NearbyLocationDto[]>('/locations/nearby', { params });
    return res.data;
  },

  async upsertFromPlace(body: {
    placeId: string;
    name: string;
    address?: string;
    lat: number;
    lng: number;
    source: 'photon' | 'nominatim';
  }): Promise<PersistedLocationDto> {
    const res = await apiClient.post<PersistedLocationDto>('/locations/upsert-from-place', body);
    return res.data;
  },
};
