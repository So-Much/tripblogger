import type {
  PlanTravelMode,
  ScheduleConflict,
  ScheduledStop,
  StopStatus,
} from '@tripblogger/itinerary-engine';

export type { PlanTravelMode, ScheduleConflict, ScheduledStop, StopStatus };

export type TripStatus = 'draft' | 'active' | 'completed' | 'archived';
export type StopPriority = 'must' | 'nice';

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

export type CreateTripDto = {
  title: string;
  destinationLabel: string;
  destinationLat: number;
  destinationLng: number;
  startDate: string;
  endDate: string;
  defaultTravelMode?: PlanTravelMode;
  defaultBufferMinutes?: number;
  defaultDayStartTime?: string;
};

export type PatchTripDto = Partial<CreateTripDto> & { status?: TripStatus };

export type PatchDayDto = { startTime: string | null };

export type AddStopDto = {
  place: {
    id: string;
    name: string;
    address: string | null;
    lat: number;
    lng: number;
    category: string | null;
    openingHours?: string | null;
    source: string;
  };
  tripDayId: string | null;
  position?: number;
  durationMinutes?: number;
  priority?: StopPriority;
  tags?: string[];
  anchorTime?: string | null;
  travelModeOverride?: PlanTravelMode | null;
};

export type PatchStopDto = {
  durationMinutes?: number;
  bufferAfterMinutes?: number | null;
  travelModeOverride?: PlanTravelMode | null;
  anchorTime?: string | null;
  priority?: StopPriority;
  status?: StopStatus;
  tags?: string[];
};

export type MoveStopDto = {
  toTripDayId: string | null;
  toPosition: number;
};

/** Backend wrapper for stop mutations (add/patch/delete/move). */
export type TripMutationResult = {
  trip: TripDetailDto;
};

export function toTripSummary(trip: TripDetailDto): TripSummaryDto {
  const { days: _days, ideaStops: _ideaStops, ...summary } = trip;
  return summary;
}
