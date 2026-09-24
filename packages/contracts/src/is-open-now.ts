import { parseOpeningHours } from '@tripblogger/itinerary-engine';

/**
 * Open-now status from OSM-style opening_hours.
 * Returns null when the string is missing or unsupported (do not guess).
 */
export function isOpenNow(raw: string | null | undefined, at: Date = new Date()): boolean | null {
  const parsed = parseOpeningHours(raw);
  if (!parsed.known) return null;
  return parsed.isOpenAt(at);
}
