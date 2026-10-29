import { MOTORBIKE_OSRM_FACTOR } from './constants';
import type { PlanTravelMode } from './types';

export function osrmProfileForPlanMode(mode: PlanTravelMode): 'car' | 'bike' | 'foot' {
  if (mode === 'motorbike') return 'car';
  return mode;
}

export function applyMotorbikeFactor(durationS: number, mode: PlanTravelMode): number {
  if (mode === 'motorbike') return durationS * MOTORBIKE_OSRM_FACTOR;
  return durationS;
}
