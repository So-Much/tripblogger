import type { LocationTypeRef } from '@/src/utils/location-type-display';

export type TripPlannerFilters = {
  /** Selected location type codes (multi-select). Empty/undefined = all types. */
  typeCodes?: string[];
  sort: 'rating' | 'popularity' | 'distance';
  radiusKm?: number;
  minRating?: number;
  keyword?: string;
};

export type PlannerStop = {
  clientId: string;
  locationId?: string;
  name: string;
  lat: number;
  lng: number;
  locationType?: LocationTypeRef | null;
  role: 'start' | 'stop';
};

export type RouteLegSummary = {
  fromClientId: string;
  toClientId: string;
  distanceKm: number;
  durationMin: number;
};
