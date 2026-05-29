import { apiClient } from '@/src/services/api/client';

export type PersistedLocationDto = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  status: string;
};

export const locationsService = {
  async search(q: string, limit = 15): Promise<PersistedLocationDto[]> {
    const res = await apiClient.get<PersistedLocationDto[]>('/locations/search', {
      params: { q, limit },
    });
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
