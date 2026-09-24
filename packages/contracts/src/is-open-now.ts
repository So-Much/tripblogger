import { parseOpeningHours } from '@tripblogger/itinerary-engine';

/**
 * Open-now status from OSM-style opening_hours.
 * Returns null when the string is missing or unsupported (do not guess).
 * @param raw OSM opening_hours string
 * @param at Date to check (defaults to now)
 * @param tzOffsetHours Optional timezone offset in hours (e.g., 7 for UTC+7). If provided, opening hours are checked in that timezone.
 */
export function isOpenNow(
  raw: string | null | undefined,
  at: Date = new Date(),
  tzOffsetHours?: number,
): boolean | null {
  const parsed = parseOpeningHours(raw);
  if (!parsed.known) return null;
  return parsed.isOpenAt(at, tzOffsetHours);
}
