import { apiClient } from '@/src/services/api/client';
import type { MapPlace, MapRouteResponse, PoiCategoryId, TravelMode } from '../types/map';

export const mapService = {
  async search(params: {
    q: string;
    lat?: number;
    lng?: number;
    limit?: number;
  }): Promise<MapPlace[]> {
    const res = await apiClient.get<MapPlace[]>('/map/search', { params });
    return res.data;
  },

  async nearby(params: {
    lat: number;
    lng: number;
    category: PoiCategoryId;
    radius?: number;
    limit?: number;
  }): Promise<MapPlace[]> {
    const res = await apiClient.get<MapPlace[]>('/map/nearby', { params });
    return res.data;
  },

  async reverse(lat: number, lng: number): Promise<MapPlace | null> {
    const res = await apiClient.get<MapPlace | null>('/map/reverse', {
      params: { lat, lng },
    });
    return res.data;
  },

  async route(params: {
    fromLat: number;
    fromLng: number;
    toLat: number;
    toLng: number;
    mode?: TravelMode;
    alternatives?: boolean;
  }): Promise<MapRouteResponse> {
    const res = await apiClient.get<MapRouteResponse>('/map/route', { params });
    return res.data;
  },
};
