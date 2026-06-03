import type { LocationTypeRef } from '@/src/utils/location-type-display';

export const TRIP_LOCATION_TYPE_FILTERS: Array<LocationTypeRef & { code: string }> = [
  { code: 'accommodation', name: 'Chỗ ở', icon: null },
  { code: 'restaurant', name: 'Nhà hàng', icon: null },
  { code: 'food', name: 'Ẩm thực', icon: null },
  { code: 'cafe', name: 'Cà phê', icon: null },
  { code: 'attraction', name: 'Tham quan', icon: null },
  { code: 'nature', name: 'Thiên nhiên', icon: null },
  { code: 'shopping', name: 'Mua sắm', icon: null },
  { code: 'entertainment', name: 'Giải trí', icon: null },
  { code: 'outdoor', name: 'Hoạt động ngoài trời', icon: null },
];
