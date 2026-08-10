/** Lowercase, strip Vietnamese diacritics, map đ→d, collapse whitespace. */
export function normalizeVi(input: string): string {
  return (input ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function trigrams(value: string): Set<string> {
  const s = `  ${value} `;
  const out = new Set<string>();
  for (let i = 0; i < s.length - 2; i++) out.add(s.slice(i, i + 3));
  return out;
}

/** Sørensen–Dice coefficient over character trigrams of normalized strings. */
export function trigramSimilarity(a: string, b: string): number {
  const na = normalizeVi(a);
  const nb = normalizeVi(b);
  if (na === nb) return 1;
  const ta = trigrams(na);
  const tb = trigrams(nb);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return (2 * shared) / (ta.size + tb.size);
}

export type RankSource = 'db' | 'overpass' | 'photon' | 'nominatim';

export type RankInput = {
  id: string;
  name: string;
  address: string | null;
  source: RankSource;
  rating: number | null;
  lat: number;
  lng: number;
};

const TYPO_MIN_QUERY_LEN = 4;

/** 0..1 text relevance: exact=1, prefix=0.85, contains=0.6, typo=trigram, address damped. */
export function textMatchScore(query: string, name: string, address: string | null = null): number {
  const q = normalizeVi(query);
  if (!q) return 0;
  const n = normalizeVi(name);
  const a = normalizeVi(address ?? '');

  const field = (value: string, damp: number): number => {
    if (!value) return 0;
    if (value === q) return 1 * damp;
    if (value.startsWith(q)) return 0.85 * damp;
    if (value.includes(q)) return 0.6 * damp;
    if (q.length >= TYPO_MIN_QUERY_LEN) {
      const sim = trigramSimilarity(q, value);
      return sim >= 0.3 ? 0.5 * sim * damp : 0;
    }
    return 0;
  };

  return Math.max(field(n, 1), field(a, 0.7));
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

const W_TEXT = 1.0;
const W_DISTANCE = 0.4;
const W_SOURCE = 0.2;
const W_RATING = 0.15;

function compositeScore(place: RankInput, query: string, bias?: { lat: number; lng: number } | null): number {
  const text = textMatchScore(query, place.name, place.address);
  const distance =
    bias && Number.isFinite(place.lat) && Number.isFinite(place.lng)
      ? 1 / (1 + haversineKm(bias.lat, bias.lng, place.lat, place.lng))
      : 0;
  const source = place.source === 'db' ? 1 : 0.5;
  const rating = place.rating != null ? Math.max(0, Math.min(1, place.rating / 5)) : 0;
  return W_TEXT * text + W_DISTANCE * distance + W_SOURCE * source + W_RATING * rating;
}

/** Return a new array sorted best-first by the composite score. */
export function rankPlaces<T extends RankInput>(
  query: string,
  places: T[],
  bias?: { lat: number; lng: number } | null,
): T[] {
  return places
    .map((p) => ({ p, s: compositeScore(p, query, bias) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);
}
