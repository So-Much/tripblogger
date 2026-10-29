import type { StopStatus, TripStopDto } from '../types/plan';

/**
 * Display status from schedule vs wall clock. Stored `skipped` wins.
 * todo → before arrive; doing → between arrive & depart; done → after depart.
 */
export function deriveStopDisplayStatus(
  stop: Pick<TripStopDto, 'status' | 'schedule'>,
  now: Date = new Date(),
): StopStatus {
  if (stop.status === 'skipped') return 'skipped';

  const sched = stop.schedule;
  if (!sched || sched.skipped) return stop.status;

  const arriveMs = sched.arriveAt ? Date.parse(sched.arriveAt) : Number.NaN;
  const departMs = sched.departAt ? Date.parse(sched.departAt) : Number.NaN;
  if (!Number.isFinite(arriveMs) || !Number.isFinite(departMs)) {
    return stop.status;
  }

  const t = now.getTime();
  if (t < arriveMs) return 'todo';
  if (t < departMs) return 'doing';
  return 'done';
}
