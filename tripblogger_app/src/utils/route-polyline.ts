import type { MapLatLng } from '@/src/utils/fetch-driving-route';

export function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function toLatLng(p: { lat: number; lng: number }): MapLatLng {
  return { latitude: p.lat, longitude: p.lng };
}

/** Closest point index on polyline to user (by vertex). */
export function closestRouteIndex(
  user: { lat: number; lng: number },
  route: MapLatLng[],
): number {
  if (route.length === 0) return 0;
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < route.length; i++) {
    const d = haversineM(user, { lat: route[i].latitude, lng: route[i].longitude });
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export function distanceToRouteM(user: { lat: number; lng: number }, route: MapLatLng[]): number {
  if (route.length === 0) return Infinity;
  return haversineM(user, {
    lat: route[closestRouteIndex(user, route)].latitude,
    lng: route[closestRouteIndex(user, route)].longitude,
  });
}

export function polylineLengthM(coords: MapLatLng[]): number {
  let sum = 0;
  for (let i = 1; i < coords.length; i++) {
    sum += haversineM(
      { lat: coords[i - 1].latitude, lng: coords[i - 1].longitude },
      { lat: coords[i].latitude, lng: coords[i].longitude },
    );
  }
  return sum;
}

/** Remaining path from user's current position along route to destination. */
export function sliceRouteAhead(
  user: { lat: number; lng: number },
  fullRoute: MapLatLng[],
  dest: { lat: number; lng: number },
): MapLatLng[] {
  if (fullRoute.length < 2) {
    return [toLatLng(user), toLatLng(dest)];
  }
  const idx = closestRouteIndex(user, fullRoute);
  const tail = fullRoute.slice(idx);
  const head: MapLatLng = toLatLng(user);
  if (tail.length === 0) return [head, toLatLng(dest)];
  const last = tail[tail.length - 1];
  const atDest = haversineM({ lat: last.latitude, lng: last.longitude }, dest) < 30;
  if (!atDest) return [head, ...tail, toLatLng(dest)];
  return [head, ...tail];
}
