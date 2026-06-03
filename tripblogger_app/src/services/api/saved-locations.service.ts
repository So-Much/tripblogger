import { apiClient } from '@/src/services/api/client';

export type SavedLocationGroup = {
  collectionName: string;
  locations: {
    id: string;
    locationId: string;
    note: string | null;
    location: {
      id: string;
      name: string;
      address: string | null;
      latitude: number;
      longitude: number;
    };
  }[];
};

export const savedLocationsService = {
  async listGrouped(): Promise<SavedLocationGroup[]> {
    const res = await apiClient.get<SavedLocationGroup[]>('/saved-locations');
    return res.data;
  },

  async save(body: { locationId: string; collectionName?: string; note?: string }) {
    const res = await apiClient.post('/saved-locations', body);
    return res.data;
  },

  async remove(id: string) {
    const res = await apiClient.delete(`/saved-locations/${id}`);
    return res.data;
  },
};
