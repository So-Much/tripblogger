export type DestinationCatalogEntry = {
  name: string;
  lat: number;
  lng: number;
};

/** Static VN destinations for create-trip chips (Approach A — no geocode). */
export const DESTINATION_CATALOG: readonly DestinationCatalogEntry[] = [
  { name: 'Đà Lạt', lat: 11.9404, lng: 108.4583 },
  { name: 'Vũng Tàu', lat: 10.346, lng: 107.0843 },
  { name: 'Nha Trang', lat: 12.2388, lng: 109.1967 },
  { name: 'Đảo Lý Sơn', lat: 15.3808, lng: 109.1178 },
  { name: 'Tháp Chàm', lat: 11.5673, lng: 108.9916 },
  { name: 'Vịnh Hạ Long', lat: 20.9101, lng: 107.1839 },
  { name: 'Hồ Gươm', lat: 21.0285, lng: 105.852 },
  { name: 'Đà Nẵng', lat: 16.0544, lng: 108.2022 },
  { name: 'Hội An', lat: 15.8801, lng: 108.338 },
  { name: 'Phú Quốc', lat: 10.227, lng: 103.967 },
  { name: 'Sa Pa', lat: 22.3364, lng: 103.8438 },
  { name: 'Phan Thiết', lat: 10.9287, lng: 108.1021 },
  { name: 'Huế', lat: 16.4637, lng: 107.5909 },
] as const;

/** Lowercase, strip diacritics, map đ→d (practical VN match; mirrors API search-ranking). */
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

export function filterDestinationCatalog(
  query: string,
  catalog: readonly DestinationCatalogEntry[] = DESTINATION_CATALOG,
): DestinationCatalogEntry[] {
  const q = normalizeVi(query);
  if (!q) return [...catalog];
  return catalog.filter((e) => normalizeVi(e.name).includes(q));
}

export function findCatalogEntry(
  query: string,
  catalog: readonly DestinationCatalogEntry[] = DESTINATION_CATALOG,
): DestinationCatalogEntry | null {
  const q = normalizeVi(query);
  if (!q) return null;
  return catalog.find((e) => normalizeVi(e.name) === q) ?? null;
}
