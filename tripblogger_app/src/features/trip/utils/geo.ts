const polylineCache = new Map<string, [number, number][]>();

/** Decode Google-encoded polyline with precision 1e6 (polyline6). */
export function decodePolyline6(encoded: string): [number, number][] {
  if (!encoded) return [];
  const cached = polylineCache.get(encoded);
  if (cached) return cached;

  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  const coordinates: [number, number][] = [];

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push([lng / 1e6, lat / 1e6]);
  }

  // Bound cache size so long sessions don't retain every route forever.
  if (polylineCache.size > 32) {
    const oldest = polylineCache.keys().next().value;
    if (oldest != null) polylineCache.delete(oldest);
  }
  polylineCache.set(encoded, coordinates);
  return coordinates;
}

export function haversineM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(meters: number | null | undefined, language: string): string {
  if (meters == null || Number.isNaN(meters)) return '';
  if (meters < 1000) {
    return language === 'vi' ? `${Math.round(meters)} m` : `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return language === 'vi' ? `${km.toFixed(1)} km` : `${km.toFixed(1)} km`;
}

export function formatDuration(seconds: number, language: string): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return language === 'vi' ? `${mins} phút` : `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return language === 'vi' ? `${h} giờ ${m} phút` : `${h} h ${m} min`;
}
