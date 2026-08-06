export const DEFAULT_MAP_CENTER = {
  latitude: 16.0544,
  longitude: 108.2208,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export type MapTypeId = 'standard' | 'satellite' | 'hybrid' | 'mutedStandard';

export function nextMapType(current: MapTypeId): MapTypeId {
  const order: MapTypeId[] = ['standard', 'mutedStandard', 'hybrid', 'satellite'];
  const i = order.indexOf(current);
  return order[(i + 1) % order.length];
}
