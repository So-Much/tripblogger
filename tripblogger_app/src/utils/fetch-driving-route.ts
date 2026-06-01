import { locationsService } from '@/src/services/api/locations.service';

export type MapLatLng = { latitude: number; longitude: number };

export type DrivingRouteResult = {
  coordinates: MapLatLng[];
  distanceM: number;
  durationS: number;
};

function straightRoute(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  steps = 24,
): MapLatLng[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return {
      latitude: origin.lat + (dest.lat - origin.lat) * t,
      longitude: origin.lng + (dest.lng - origin.lng) * t,
    };
  });
}

function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function fallbackRoute(origin: { lat: number; lng: number }, dest: { lat: number; lng: number }): DrivingRouteResult {
  const distanceM = haversineM(origin, dest);
  return {
    coordinates: straightRoute(origin, dest),
    distanceM,
    durationS: Math.max(60, (distanceM / 1000 / 28) * 3600),
  };
}

export async function fetchDrivingRoute(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
): Promise<DrivingRouteResult> {
  try {
    const viaApi = await locationsService.drivingRoute({
      fromLat: origin.lat,
      fromLng: origin.lng,
      toLat: dest.lat,
      toLng: dest.lng,
    });
    if (viaApi.coordinates.length > 1) return viaApi;
  } catch {
    // try direct OSRM then straight line
  }

  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as {
        code?: string;
        routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
      };
      const route = data.routes?.[0];
      if (data.code === 'Ok' && route?.geometry?.coordinates?.length) {
        return {
          coordinates: route.geometry.coordinates.map(([lng, lat]) => ({
            latitude: lat,
            longitude: lng,
          })),
          distanceM: route.distance,
          durationS: route.duration,
        };
      }
    }
  } catch {
    // straight line below
  }

  return fallbackRoute(origin, dest);
}

export function formatRouteSummary(distanceM: number, durationS: number): string {
  const km = distanceM / 1000;
  const min = Math.max(1, Math.round(durationS / 60));
  return `${min} phút · ${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}
