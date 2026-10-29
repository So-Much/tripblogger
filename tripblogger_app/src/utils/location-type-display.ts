import type { ComponentProps } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export type LocationTypeRef = {
  code: string;
  name: string;
  icon?: string | null;
};

/** DB `location_types.code` values. */
export type LocationTypeCode =
  | 'food'
  | 'cafe'
  | 'restaurant'
  | 'attraction'
  | 'accommodation'
  | 'shopping'
  | 'entertainment'
  | 'nature'
  | 'outdoor'
  | 'other';

/**
 * Visual keys for places on the map/trip UI.
 * Includes DB location types plus Overpass POI category ids.
 */
export type PlaceCategoryVisualCode =
  | LocationTypeCode
  | 'hotel'
  | 'homestay'
  | 'fuel'
  | 'hospital'
  | 'atm'
  | 'parking';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

export type LocationTypeVisual = {
  code: PlaceCategoryVisualCode;
  label: string;
  icon: MaterialIconName;
  color: string;
  softBg: string;
};

const DEFAULT_VISUAL: LocationTypeVisual = {
  code: 'other',
  label: 'Địa điểm',
  icon: 'place',
  color: '#64748B',
  softBg: '#64748B18',
};

const VISUALS: Record<PlaceCategoryVisualCode, Omit<LocationTypeVisual, 'code'>> = {
  food: { label: 'Ăn uống', icon: 'restaurant', color: '#EA580C', softBg: '#EA580C18' },
  cafe: { label: 'Cà phê', icon: 'local-cafe', color: '#92400E', softBg: '#92400E18' },
  restaurant: { label: 'Nhà hàng', icon: 'restaurant-menu', color: '#C2410C', softBg: '#C2410C18' },
  attraction: { label: 'Tham quan', icon: 'attractions', color: '#7C3AED', softBg: '#7C3AED18' },
  accommodation: { label: 'Chỗ ở', icon: 'hotel', color: '#0284C7', softBg: '#0284C718' },
  shopping: { label: 'Mua sắm', icon: 'shopping-bag', color: '#DB2777', softBg: '#DB277718' },
  entertainment: { label: 'Giải trí', icon: 'theater-comedy', color: '#9333EA', softBg: '#9333EA18' },
  nature: { label: 'Thiên nhiên', icon: 'park', color: '#059669', softBg: '#05966918' },
  outdoor: { label: 'Ngoài trời', icon: 'terrain', color: '#0D9488', softBg: '#0D948818' },
  other: { label: 'Khác', icon: 'place', color: '#64748B', softBg: '#64748B18' },
  // Overpass / map chip categories
  hotel: { label: 'Khách sạn', icon: 'hotel', color: '#0284C7', softBg: '#0284C718' },
  homestay: { label: 'Homestay', icon: 'house', color: '#0369A1', softBg: '#0369A118' },
  fuel: { label: 'Trạm xăng', icon: 'local-gas-station', color: '#CA8A04', softBg: '#CA8A0418' },
  hospital: { label: 'Bệnh viện', icon: 'local-hospital', color: '#DC2626', softBg: '#DC262618' },
  atm: { label: 'ATM', icon: 'atm', color: '#4F46E5', softBg: '#4F46E518' },
  parking: { label: 'Bãi đỗ xe', icon: 'local-parking', color: '#475569', softBg: '#47556918' },
};

/** Maps alternate / legacy codes onto a known visual key. */
const ALIASES: Record<string, PlaceCategoryVisualCode> = {
  stay: 'accommodation',
  lodging: 'accommodation',
  hotel: 'hotel',
  homestay: 'homestay',
  gas: 'fuel',
  gas_station: 'fuel',
  petrol: 'fuel',
};

function normalizeCode(code?: string | null): PlaceCategoryVisualCode {
  if (!code) return 'other';
  const key = code.toLowerCase().trim();
  if (key in VISUALS) return key as PlaceCategoryVisualCode;
  if (key in ALIASES) return ALIASES[key];
  return 'other';
}

export function resolveLocationTypeVisual(
  locationType?: LocationTypeRef | null,
): LocationTypeVisual {
  return resolvePlaceCategoryVisual(locationType?.code, locationType?.name);
}

/** Resolve icon/color/label for a place `category` string (DB type or POI id). */
export function resolvePlaceCategoryVisual(
  category?: string | null,
  nameOverride?: string | null,
): LocationTypeVisual {
  const code = normalizeCode(category);
  const base = VISUALS[code] ?? DEFAULT_VISUAL;
  return {
    code,
    ...base,
    label: nameOverride?.trim() || base.label,
  };
}
