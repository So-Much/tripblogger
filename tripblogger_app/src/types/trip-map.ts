import type { LocationTypeRef } from '@/src/utils/location-type-display';

export type MapCheckpoint = {
  lat: number;
  lng: number;
  name: string;
  locationId?: string;
  locationType?: LocationTypeRef | null;
};

export type MapExplorePin = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  avgRating: number;
  totalReview: number;
  distanceKm?: number;
  locationType?: LocationTypeRef | null;
};

export type MapRouteStop = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: 'PLANNED' | 'VISITING' | 'VISITED' | 'SKIPPED';
  orderIndex: number;
  dayNumber: number;
  sequenceIndex: number;
  locationId?: string;
  visitedAt?: string | null;
  locationType?: LocationTypeRef | null;
};
