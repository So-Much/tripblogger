export type PersistedLocation = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  status: string;
  avgRating: number;
  totalReview: number;
  locationType: { id: string; code: string; name: string; icon: string | null };
  distanceKm?: number;
  phone?: string | null;
  website?: string | null;
  priceLevel?: number | null;
  openHours?: unknown | null;
  savedByMe?: boolean;
  savedLocationId?: string | null;
  hasMyReview?: boolean;
};

export function decodePolyline(encoded: string, precision = 6): { latitude: number; longitude: number }[] {
  const factor = 10 ** precision;
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: { latitude: number; longitude: number }[] = [];
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    coordinates.push({ latitude: lat / factor, longitude: lng / factor });
  }
  return coordinates;
}

export function toPersistedLocation(place: {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  category: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  distanceM?: number | null;
  phone?: string | null;
  website?: string | null;
  openingHours?: string | null;
  status?: string;
}): PersistedLocation {
  const status =
    place.status === 'pending' ? 'PENDING_VERIFICATION' : place.status === 'rejected' ? 'REJECTED' : 'ACTIVE';
  const category = place.category ?? 'other';
  return {
    id: place.id,
    name: place.name,
    address: place.address,
    latitude: place.lat,
    longitude: place.lng,
    status,
    avgRating: place.rating ?? 0,
    totalReview: place.reviewCount ?? 0,
    locationType: {
      id: category,
      code: category,
      name: category,
      icon: null,
    },
    ...(place.distanceM != null ? { distanceKm: place.distanceM / 1000 } : {}),
    phone: place.phone ?? null,
    website: place.website ?? null,
    priceLevel: null,
    openHours: place.openingHours ?? null,
  };
}

export function toSavedGroups(
  rows: Array<{ id: string; placeId: string; collectionName: string | null; note: string | null }>,
) {
  const groups = new Map<string, { id: string; locationId: string; note: string | null }[]>();
  for (const row of rows) {
    const key = row.collectionName?.trim() || 'Mặc định';
    const list = groups.get(key) ?? [];
    list.push({ id: row.id, locationId: row.placeId, note: row.note });
    groups.set(key, list);
  }
  return Array.from(groups.entries()).map(([collectionName, locations]) => ({ collectionName, locations }));
}

function parseTags(tagsJson: string | null): string[] {
  if (!tagsJson) return [];
  try {
    const parsed = JSON.parse(tagsJson) as unknown;
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : [];
  } catch {
    return [];
  }
}

export function toReviewDto(row: {
  id: string;
  placeId: string;
  userId: string;
  rating: number;
  body: string | null;
  tagsJson: string | null;
  createdAt: Date;
}) {
  const createdAt = row.createdAt.toISOString();
  return {
    id: row.id,
    locationId: row.placeId,
    userId: row.userId,
    rating: row.rating,
    content: row.body,
    tags: parseTags(row.tagsJson),
    createdAt,
    updatedAt: createdAt,
    author: { displayName: 'Member', avatarUrl: null as string | null },
  };
}

export function toReviewPage(
  rows: Array<Parameters<typeof toReviewDto>[0]>,
  page: number,
  limit: number,
  total: number,
) {
  return {
    items: rows.map(toReviewDto),
    page,
    limit,
    total,
    hasMore: page * limit < total,
  };
}

export function summarizeReviews(rows: Array<{ rating: number; tagsJson: string | null }>) {
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const tags = new Map<string, number>();
  let sum = 0;
  for (const row of rows) {
    const rating = Math.min(5, Math.max(1, Math.round(row.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[rating] += 1;
    sum += row.rating;
    for (const tag of parseTags(row.tagsJson)) {
      tags.set(tag, (tags.get(tag) ?? 0) + 1);
    }
  }
  return {
    total: rows.length,
    avgRating: rows.length ? sum / rows.length : 0,
    distribution,
    tags: Array.from(tags.entries()).map(([tag, count]) => ({ tag, count })),
  };
}

export function toCheckinItem(
  row: {
    id: string;
    placeId: string;
    lat: string | null;
    lng: string | null;
    privacyLevel: string | null;
    createdAt: Date;
  },
  place?: { id: string; name: string; address: string | null } | null,
) {
  return {
    id: row.id,
    locationId: row.placeId,
    latitude: Number(row.lat ?? 0),
    longitude: Number(row.lng ?? 0),
    privacyLevel: row.privacyLevel ?? 'PUBLIC',
    checkinTime: row.createdAt.toISOString(),
    location: place ? { id: place.id, name: place.name, address: place.address } : undefined,
  };
}

function straightLine(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
) {
  const distanceKm = haversineKm(from.lat, from.lng, to.lat, to.lng);
  const distanceM = distanceKm * 1000;
  const steps = 24;
  const coordinates = Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return {
      latitude: from.lat + (to.lat - from.lat) * t,
      longitude: from.lng + (to.lng - from.lng) * t,
    };
  });
  return {
    coordinates,
    distanceM,
    durationS: Math.max(60, (distanceM / 1000 / 30) * 3600),
  };
}

export function toDrivingRouteDto(
  routes: Array<{ distanceM: number; durationS: number; geometry: string }>,
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
) {
  const first = routes[0];
  if (!first?.geometry) return straightLine(from, to);
  const coordinates = decodePolyline(first.geometry, 6);
  if (!coordinates.length) return straightLine(from, to);
  return { coordinates, distanceM: first.distanceM, durationS: first.durationS };
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
