import type { TripStatus } from '../types/plan';
import { isoDateLocal } from './plan-create-dates';

/** Inclusive calendar-date window using local YYYY-MM-DD. */
export function isWithinInclusiveTripDates(
  now: Date,
  startDate: string,
  endDate: string,
): boolean {
  const today = isoDateLocal(now);
  return today >= startDate && today <= endDate;
}

export type PlanTripProgressInput = {
  now: Date;
  startDate: string;
  endDate: string;
  onPlanTab: boolean;
  tripSelected: boolean;
  /** Existing trip lifecycle; completed/archived never count as in-progress. */
  status?: TripStatus | null;
};

/**
 * Honest in-progress rule: no start-journey API exists.
 * Treat as in-progress when Plan tab has this trip selected and today is inside
 * [startDate, endDate]. Draft and active both qualify; completed/archived do not.
 */
export function isPlanTripInProgress(input: PlanTripProgressInput): boolean {
  if (!input.onPlanTab || !input.tripSelected) return false;
  if (input.status === 'completed' || input.status === 'archived') return false;
  return isWithinInclusiveTripDates(input.now, input.startDate, input.endDate);
}
