export type PoiCategoryId =
  | 'restaurant'
  | 'cafe'
  | 'hotel'
  | 'homestay'
  | 'shopping'
  | 'fuel'
  | 'hospital'
  | 'atm'
  | 'attraction'
  | 'parking';

export type OsmTagFilter = { key: string; values: string[] };

export type PoiCategory = {
  id: PoiCategoryId;
  /** Maps onto `location_types.code` when querying curated DB POIs. */
  dbTypeCodes: string[];
  osm: OsmTagFilter[];
  labelVi: string;
  labelEn: string;
};

export const POI_CATEGORIES: Record<PoiCategoryId, PoiCategory> = {
  restaurant: {
    id: 'restaurant',
    dbTypeCodes: ['restaurant', 'food'],
    osm: [{ key: 'amenity', values: ['restaurant', 'fast_food'] }],
    labelVi: 'Nhà hàng',
    labelEn: 'Restaurants',
  },
  cafe: {
    id: 'cafe',
    dbTypeCodes: ['cafe'],
    osm: [{ key: 'amenity', values: ['cafe'] }],
    labelVi: 'Quán cafe',
    labelEn: 'Cafes',
  },
  hotel: {
    id: 'hotel',
    dbTypeCodes: ['accommodation'],
    osm: [{ key: 'tourism', values: ['hotel', 'hostel', 'motel'] }],
    labelVi: 'Khách sạn',
    labelEn: 'Hotels',
  },
  homestay: {
    id: 'homestay',
    dbTypeCodes: ['accommodation'],
    osm: [{ key: 'tourism', values: ['guest_house', 'apartment'] }],
    labelVi: 'Homestay',
    labelEn: 'Homestays',
  },
  shopping: {
    id: 'shopping',
    dbTypeCodes: ['shopping'],
    osm: [{ key: 'shop', values: ['mall', 'supermarket', 'department_store'] }],
    labelVi: 'Mua sắm',
    labelEn: 'Shopping',
  },
  fuel: {
    id: 'fuel',
    dbTypeCodes: [],
    osm: [{ key: 'amenity', values: ['fuel'] }],
    labelVi: 'Trạm xăng',
    labelEn: 'Fuel',
  },
  hospital: {
    id: 'hospital',
    dbTypeCodes: [],
    osm: [{ key: 'amenity', values: ['hospital', 'clinic', 'pharmacy'] }],
    labelVi: 'Bệnh viện',
    labelEn: 'Hospital',
  },
  atm: {
    id: 'atm',
    dbTypeCodes: [],
    osm: [{ key: 'amenity', values: ['atm', 'bank'] }],
    labelVi: 'ATM',
    labelEn: 'ATM / Bank',
  },
  attraction: {
    id: 'attraction',
    dbTypeCodes: ['attraction', 'nature', 'entertainment'],
    osm: [{ key: 'tourism', values: ['attraction', 'viewpoint', 'museum'] }],
    labelVi: 'Tham quan',
    labelEn: 'Attractions',
  },
  parking: {
    id: 'parking',
    dbTypeCodes: [],
    osm: [{ key: 'amenity', values: ['parking'] }],
    labelVi: 'Bãi đỗ xe',
    labelEn: 'Parking',
  },
};

export const POI_CATEGORY_IDS = Object.keys(POI_CATEGORIES) as PoiCategoryId[];

export function isPoiCategoryId(value: string): value is PoiCategoryId {
  return value in POI_CATEGORIES;
}
