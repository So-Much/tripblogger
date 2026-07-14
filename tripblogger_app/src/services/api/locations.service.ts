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

export type DrivingRouteDto = {
  coordinates: { latitude: number; longitude: number }[];
  distanceM: number;
  durationS: number;
};

export type LocationDetailDto = PersistedLocationDto & {
  phone: string | null;
  website: string | null;
  priceLevel: number | null;
  openHours: unknown | null;
  savedByMe: boolean;
  savedLocationId: string | null;
  hasMyReview: boolean;
};

export type LocationMediaDto = {
  id: string;
  mediaId: string;
  url: string;
  thumbnailUrl: string | null;
  aestheticScore: number | null;
  isPrimary: boolean;
};

export const locationsService = {
  async getById(id: string): Promise<LocationDetailDto> {
    const res = await apiClient.get<LocationDetailDto>(`/locations/${id}`);
    return res.data;
  },

  async listMedia(locationId: string): Promise<{ items: LocationMediaDto[] }> {
    const res = await apiClient.get<{ items: LocationMediaDto[] }>(
      `/locations/${locationId}/media`,
    );
    return res.data;
  },
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
    sort?: 'rating' | 'popularity' | 'distance';
    typeCode?: string;
    typeCodes?: string[];
    minRating?: number;
    q?: string;
    limit?: number;
  }): Promise<NearbyLocationDto[]> {
    const { typeCodes, ...rest } = params;
    const res = await apiClient.get<NearbyLocationDto[]>('/locations/nearby', {
      params: {
        ...rest,
        ...(typeCodes?.length ? { typeCodes: typeCodes.join(',') } : {}),
      },
    });
    return res.data;
  },

  async drivingRoute(params: {
    fromLat: number;
    fromLng: number;
    toLat: number;
    toLng: number;
  }): Promise<DrivingRouteDto> {
    const res = await apiClient.get<DrivingRouteDto>('/locations/driving-route', { params });
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
