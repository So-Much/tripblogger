export type MapCheckpoint = {
  lat: number;
  lng: number;
  name: string;
  locationId?: string;
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
};

export type MapRouteStop = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: 'PLANNED' | 'VISITING' | 'VISITED' | 'SKIPPED';
  orderIndex: number;
  dayNumber: number;
};
