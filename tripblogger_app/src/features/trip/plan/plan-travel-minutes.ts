/** Minimum displayed / persisted travel for a chip between consecutive stops. */
export const MIN_TRAVEL_MINUTES = 1;
export const MIN_TRAVEL_SECONDS = 60;

/**
 * Minutes shown on a Plan travel chip from stored OSRM `travelFromPrevSeconds`.
 * Unknown stays unknown (no client haversine). Sub-minute / 0 floors to 1.
 */
export function formatTravelMinutes(
  travelFromPrevSeconds: number | null,
): number | null {
  if (travelFromPrevSeconds == null || !Number.isFinite(travelFromPrevSeconds)) {
    return null;
  }
  return Math.max(MIN_TRAVEL_MINUTES, Math.round(travelFromPrevSeconds / 60));
}

/**
 * Persist OSRM table-leg seconds. Null stays null (OSRM failed — no estimate).
 * Zero / negative (same node, rounding) clamp to 1 minute.
 */
export function clampTravelSeconds(durationS: number | null): number | null {
  if (durationS == null || !Number.isFinite(durationS)) return null;
  const rounded = Math.round(durationS);
  return rounded <= 0 ? MIN_TRAVEL_SECONDS : rounded;
}

/** Whole minutes from a compact chip / typed field. Junk → null. */
export function parsePlanMinutes(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return n;
}

/** Persist travel minutes as seconds; never write a 0-minute leg. */
export function travelMinutesToSeconds(minutes: number): number {
  const whole = Number.isFinite(minutes) ? Math.round(minutes) : MIN_TRAVEL_MINUTES;
  return Math.max(MIN_TRAVEL_MINUTES, whole) * 60;
}

/** Buffer may be zero; negatives clamp to 0. */
export function clampBufferMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return 0;
  return Math.max(0, Math.round(minutes));
}
