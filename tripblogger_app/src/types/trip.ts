export type TripStatus =
  | 'DRAFT'
  | 'PLANNING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'ARCHIVED'
  | 'CANCELLED';

export type TripStopStatus = 'PLANNED' | 'VISITING' | 'VISITED' | 'SKIPPED';

export type TripLocationRef = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  avgRating?: number;
  locationType?: { code: string; name: string; icon?: string | null } | null;
};

export type TripStopDto = {
  id: string;
  tripDayId: string;
  location: TripLocationRef | null;
  customName: string | null;
  customAddress: string | null;
  customLatitude?: number | null;
  customLongitude?: number | null;
  orderIndex: number;
  status: TripStopStatus;
  arrivalTime: string | null;
  durationMinutes: number | null;
  budgetEstimate: number | null;
  actualSpent: number | null;
  notes: string | null;
  visitedAt?: string | null;
};

export type TripDayDto = {
  id: string;
  date: string;
  dayNumber: number;
  title: string | null;
  theme: string | null;
  notes: string | null;
  totalDistanceKm: number | null;
  stops: TripStopDto[];
};

export type TripMemberDto = {
  id: string;
  userId: string;
  role: string;
  status: string;
  username: string | null;
};

export type TripAccommodationDto = {
  id: string;
  location: TripLocationRef | null;
  customName: string | null;
  checkIn: string;
  checkOut: string;
  isPrimary: boolean;
};

export type TripDto = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  destinationName: string | null;
  startDate: string;
  endDate: string;
  status: TripStatus;
  isPublic: boolean;
  totalBudget: number | null;
  actualBudget: number | null;
  days?: TripDayDto[];
  members?: TripMemberDto[];
  accommodations?: TripAccommodationDto[];
};

export type PaginatedTrips = {
  items: TripDto[];
  total: number;
  page: number;
  limit: number;
};

export type TripRecommendationDto = {
  id: string;
  score: number;
  distanceKm: number | null;
  isAdded: boolean;
  location: TripLocationRef & { locationType?: { code: string; name: string } | null };
};
