import type { ComponentProps } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export type LocationTypeRef = {
  code: string;
  name: string;
  icon?: string | null;
};

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

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

export type LocationTypeVisual = {
  code: LocationTypeCode;
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

const VISUALS: Record<LocationTypeCode, Omit<LocationTypeVisual, 'code'>> = {
  food: { label: 'Ăn uống', icon: 'restaurant', color: '#EA580C', softBg: '#EA580C18' },
  cafe: { label: 'Cà phê', icon: 'local-cafe', color: '#92400E', softBg: '#92400E18' },
  restaurant: { label: 'Nhà hàng', icon: 'restaurant-menu', color: '#C2410C', softBg: '#C2410C18' },
  attraction: { label: 'Tham quan', icon: 'photo-camera', color: '#7C3AED', softBg: '#7C3AED18' },
  accommodation: { label: 'Chỗ ở', icon: 'hotel', color: '#0284C7', softBg: '#0284C718' },
  shopping: { label: 'Mua sắm', icon: 'shopping-bag', color: '#DB2777', softBg: '#DB277718' },
  entertainment: { label: 'Giải trí', icon: 'theater-comedy', color: '#9333EA', softBg: '#9333EA18' },
  nature: { label: 'Thiên nhiên', icon: 'park', color: '#059669', softBg: '#05966918' },
  outdoor: { label: 'Ngoài trời', icon: 'terrain', color: '#0D9488', softBg: '#0D948818' },
  other: { label: 'Khác', icon: 'place', color: '#64748B', softBg: '#64748B18' },
};

function normalizeCode(code?: string | null): LocationTypeCode {
  if (!code) return 'other';
  const key = code.toLowerCase() as LocationTypeCode;
  return key in VISUALS ? key : 'other';
}

export function resolveLocationTypeVisual(
  locationType?: LocationTypeRef | null,
): LocationTypeVisual {
  const code = normalizeCode(locationType?.code);
  const base = VISUALS[code];
  return {
    code,
    ...base,
    label: locationType?.name?.trim() || base.label,
  };
}
