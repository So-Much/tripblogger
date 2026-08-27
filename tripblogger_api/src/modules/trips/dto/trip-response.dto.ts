import type {
  PlanTravelMode,
  ScheduleConflict,
  ScheduledStop,
  StopStatus,
} from '@tripblogger/itinerary-engine';
import type { TripStatus } from '../entities/trip.entity';
import type { StopPriority } from '../entities/trip-stop.entity';
import type { StopCostItemDto } from './stop-cost-item.dto';

export type TripSummaryDto = {
  id: string;
  title: string;
  destinationLabel: string;
  destinationLat: number;
  destinationLng: number;
  startDate: string;
  endDate: string;
  defaultTravelMode: PlanTravelMode;
  defaultBufferMinutes: number;
  defaultDayStartTime: string;
  status: TripStatus;
  version: number;
  budgetAmount: number | null;
  budgetCurrency: string | null;
};

export type TripStopDto = {
  id: string;
  tripId: string;
  tripDayId: string | null;
  position: number;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  category: string | null;
  externalPlaceId: string | null;
  openingHoursRaw: string | null;
  locationId: string | null;
  durationMinutes: number;
  bufferAfterMinutes: number | null;
  travelModeOverride: PlanTravelMode | null;
  anchorTime: string | null;
  priority: StopPriority;
  status: StopStatus;
  tags: string[];
  note: string | null;
  estimatedCostAmount: number | null;
  estimatedCostCurrency: string | null;
  costItems: StopCostItemDto[];
  travelFromPrevSeconds: number | null;
  travelFromPrevDistanceM: number | null;
  travelModeUsed: PlanTravelMode | null;
  schedule: ScheduledStop | null;
  conflicts: ScheduleConflict[];
};

export type TripDayDto = {
  id: string;
  date: string;
  dayIndex: number;
  startTime: string | null;
  stops: TripStopDto[];
  scheduleConflicts: ScheduleConflict[];
};

export type TripDetailDto = TripSummaryDto & {
  days: TripDayDto[];
  ideaStops: TripStopDto[];
};

/** Spec §15.5 — preferred response wrapper for stop mutations. */
export type TripMutationResult = {
  trip: TripDetailDto;
};
