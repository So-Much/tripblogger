type LatLng = { latitude: number; longitude: number };

export function bearingDegrees(from: LatLng, to: LatLng): number {
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const dLng = ((to.longitude - from.longitude) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function midpoint(from: LatLng, to: LatLng): LatLng {
  return {
    latitude: (from.latitude + to.latitude) / 2,
    longitude: (from.longitude + to.longitude) / 2,
  };
}

export type LegDirectionMarker = {
  id: string;
  coordinate: LatLng;
  bearing: number;
};

export function legDirectionMarkers(
  stops: Array<{ clientId: string; lat: number; lng: number }>,
): LegDirectionMarker[] {
  const out: LegDirectionMarker[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const from = { latitude: stops[i].lat, longitude: stops[i].lng };
    const to = { latitude: stops[i + 1].lat, longitude: stops[i + 1].lng };
    out.push({
      id: `${stops[i].clientId}-${stops[i + 1].clientId}`,
      coordinate: midpoint(from, to),
      bearing: bearingDegrees(from, to),
    });
  }
  return out;
}
