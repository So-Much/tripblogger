export type PlanTravelMode = 'motorbike' | 'car' | 'foot' | 'bike';
export type StopStatus = 'todo' | 'doing' | 'done' | 'skipped';
export type ScheduleConflictType =
  | 'anchor_unreachable'
  | 'closed_on_arrival'
  | 'travel_unknown';

export type EngineStopInput = {
  id: string;
  durationMinutes: number;
  bufferAfterMinutes: number;
  travelFromPrevSeconds: number | null;
  anchorTime: string | null;
  status: StopStatus;
  openingHoursRaw: string | null;
};

export type ScheduledStop = {
  id: string;
  arriveAt: string | null;
  startAt: string | null;
  endAt: string | null;
  departAt: string | null;
  idleMinutes: number;
  skipped: boolean;
};

export type ScheduleConflict = {
  stopId: string;
  type: ScheduleConflictType;
  lateMinutes?: number;
  messageKey: string;
};

export type DayScheduleResult = {
  stops: ScheduledStop[];
  conflicts: ScheduleConflict[];
};
