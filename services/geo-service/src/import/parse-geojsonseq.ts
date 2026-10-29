import { classifyOsmTags } from '@tripblogger/contracts';

export type OsmPoi = {
  osmType: string | null;
  osmId: string | null;
  name: string;
  lat: number;
  lng: number;
  category: string;
  subcategory: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  openingHours: string | null;
  wikidataId: string | null;
};

type Feature = {
  type?: string;
  id?: string | number;
  properties?: Record<string, string | number | undefined>;
  geometry?: { type?: string; coordinates?: unknown };
};

function centroid(geometry?: Feature['geometry']): { lat: number; lng: number } | null {
  if (!geometry?.coordinates) return null;
  if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
    const [lng, lat] = geometry.coordinates as number[];
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const coords = JSON.stringify(geometry.coordinates);
  const nums = coords.match(/-?\d+\.?\d*/g)?.map(Number) ?? [];
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pairs.push([nums[i], nums[i + 1]]);
  if (!pairs.length) return null;
  const lng = pairs.reduce((s, p) => s + p[0], 0) / pairs.length;
  const lat = pairs.reduce((s, p) => s + p[1], 0) / pairs.length;
  return { lat, lng };
}

export function featureToPoi(feature: Feature): OsmPoi | null {
  const tags = (feature.properties ?? {}) as Record<string, string>;
  const name = tags.name ?? tags['name:vi'] ?? tags['name:en'];
  if (!name) return null;
  const point = centroid(feature.geometry);
  if (!point) return null;
  const idRaw = String(feature.id ?? tags['@id'] ?? '');
  const osmMatch = idRaw.match(/(node|way|relation)\/(\d+)/i);
  return {
    osmType: osmMatch?.[1]?.toLowerCase() ?? (tags.osm_type as string) ?? null,
    osmId: osmMatch?.[2] ?? (tags.osm_id != null ? String(tags.osm_id) : null),
    name,
    lat: point.lat,
    lng: point.lng,
    category: classifyOsmTags(tags),
    subcategory: tags.amenity ?? tags.shop ?? tags.tourism ?? null,
    address: [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean).join(' ') || null,
    phone: tags.phone ?? tags['contact:phone'] ?? null,
    website: tags.website ?? tags['contact:website'] ?? null,
    openingHours: tags.opening_hours ?? null,
    wikidataId: tags.wikidata ?? null,
  };
}

export function parseGeoJsonSeq(text: string): OsmPoi[] {
  const out: OsmPoi[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const poi = featureToPoi(JSON.parse(line) as Feature);
      if (poi) out.push(poi);
    } catch {
      /* skip bad line */
    }
  }
  return out;
}
