import type { TripStopDto } from '../types/plan';

/**
 * Minutes from scheduled start/arrive until `now`, used by "Depart now"
 * to lock actual stay duration so the rest of the day reflows.
 */
export function computeDepartNowDuration(
  stop: Pick<TripStopDto, 'schedule' | 'durationMinutes'>,
  now: Date = new Date(),
  minMinutes = 1,
): number {
  const startIso = stop.schedule?.startAt ?? stop.schedule?.arriveAt;
  if (!startIso) return Math.max(minMinutes, stop.durationMinutes);

  const startMs = Date.parse(startIso);
  if (!Number.isFinite(startMs)) return Math.max(minMinutes, stop.durationMinutes);

  const elapsed = Math.round((now.getTime() - startMs) / 60_000);
  if (elapsed < minMinutes) return minMinutes;
  return elapsed;
}
