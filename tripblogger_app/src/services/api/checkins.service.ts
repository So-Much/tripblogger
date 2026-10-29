import { apiClient } from '@/src/services/api/client';

export type CheckinDto = {
  id: string;
  locationId: string;
  latitude: number;
  longitude: number;
  privacyLevel: string;
  checkinTime: string;
  location?: { id: string; name: string; address: string | null };
};

export const checkinsService = {
  async listMine(params: { locationId?: string; limit?: number }): Promise<{ items: CheckinDto[] }> {
    const res = await apiClient.get<{ items: CheckinDto[] }>('/checkins/mine', { params });
    return res.data;
  },

  async create(body: {
    locationId: string;
    latitude: number;
    longitude: number;
    privacyLevel?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  }): Promise<CheckinDto> {
    const res = await apiClient.post<CheckinDto>('/checkins', body);
    return res.data;
  },
};
