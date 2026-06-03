import type { MapCheckpoint, MapExplorePin } from '@/src/types/trip-map';
import type { UserMapMarker } from '@/src/store/user-map-markers.store';
import { userMarkerPinId } from '@/src/store/user-map-markers.store';

export function userMarkerToPin(marker: UserMapMarker): MapExplorePin {
  return {
    id: userMarkerPinId(marker.id),
    name: marker.name,
    address: null,
    latitude: marker.lat,
    longitude: marker.lng,
    avgRating: 0,
    totalReview: 0,
    locationType: { code: 'other', name: 'Mốc riêng' },
  };
}

export function userMarkerToCheckpoint(marker: UserMapMarker): MapCheckpoint {
  return {
    lat: marker.lat,
    lng: marker.lng,
    name: marker.name,
    locationType: { code: 'other', name: 'Mốc riêng' },
  };
}

export function pinFromCustomCoords(
  coords: { lat: number; lng: number },
  name: string,
  markerId?: string,
): MapExplorePin {
  return {
    id: markerId ? userMarkerPinId(markerId) : `custom:${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`,
    name,
    address: null,
    latitude: coords.lat,
    longitude: coords.lng,
    avgRating: 0,
    totalReview: 0,
    locationType: { code: 'other', name: 'Mốc riêng' },
  };
}
