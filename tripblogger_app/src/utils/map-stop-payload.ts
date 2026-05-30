import type { MapExplorePin } from '@/src/types/trip-map';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildAddStopPayload(pin: MapExplorePin) {
  if (UUID_RE.test(pin.id)) {
    return {
      locationId: pin.id,
      customName: pin.name,
    };
  }

  return {
    customName: pin.name,
    customAddress: pin.address ?? undefined,
    lat: pin.latitude,
    lng: pin.longitude,
  };
}
