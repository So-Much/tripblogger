import { apiClient } from '@/src/services/api/client';
import type { MapPlace, MapRouteResponse, PoiCategoryId, TravelMode } from '../types/map';

export const mapService = {
  async search(
    params: {
      q: string;
      lat?: number;
      lng?: number;
      biasLat?: number;
      biasLng?: number;
      limit?: number;
    },
    signal?: AbortSignal,
  ): Promise<MapPlace[]> {
    const res = await apiClient.get<MapPlace[]>('/map/search', { params, signal });
    return res.data;
  },


  async nearby(
    params: {
      lat: number;
      lng: number;
      category: PoiCategoryId;
      radius?: number;
      limit?: number;
    },
    signal?: AbortSignal,
  ): Promise<MapPlace[]> {
    const res = await apiClient.get<MapPlace[]>('/map/nearby', { params, signal });
    return res.data;
  },

  async reverse(
    lat: number,
    lng: number,
    fromLat?: number,
    fromLng?: number,
    signal?: AbortSignal,
  ): Promise<MapPlace | null> {
    const res = await apiClient.get<MapPlace | null>('/map/reverse', {
      params: { lat, lng, fromLat, fromLng },
      signal,
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
    signal?: AbortSignal;
  }): Promise<MapRouteResponse> {
    const { signal, ...query } = params;
    const res = await apiClient.get<MapRouteResponse>('/map/route', {
      params: query,
      signal,
    });
    return res.data;
  },
};

/** True when axios/fetch rejected because the caller aborted the request. */
export function isAbortedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; name?: string; message?: string };
  return (
    e.code === 'ERR_CANCELED' ||
    e.name === 'CanceledError' ||
    e.name === 'AbortError' ||
    e.message === 'canceled'
  );
}
