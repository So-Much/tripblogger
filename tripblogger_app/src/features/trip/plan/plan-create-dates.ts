export type DatePresetId = 'days2' | 'days3' | 'days4' | 'weekend' | 'custom';

export function isoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local HH:mm from a Date. */
export function toHhmm(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Merge YYYY-MM-DD + HH:mm into a local Date (seconds/ms cleared). */
export function combineLocalDateTime(isoDate: string, hhmm: string): Date {
  const d = parseIsoDateLocal(isoDate);
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(Number.isFinite(h) ? h : 8, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

/** Split a local Date into startDate + defaultDayStartTime. */
export function splitLocalDateTime(d: Date): {
  startDate: string;
  defaultDayStartTime: string;
} {
  return { startDate: isoDateLocal(d), defaultDayStartTime: toHhmm(d) };
}

export function addDaysLocal(iso: string, days: number): string {
  const d = parseIsoDateLocal(iso);
  d.setDate(d.getDate() + days);
  return isoDateLocal(d);
}

/** Spec §5.4: Sat–Sun; Sunday alone = 1-day; else next Saturday–Sunday from ref. */
export function weekendRangeFrom(ref: Date): { startDate: string; endDate: string } {
  const day = ref.getDay(); // 0 Sun … 6 Sat
  if (day === 6) {
    const startDate = isoDateLocal(ref);
    return { startDate, endDate: addDaysLocal(startDate, 1) };
  }
  if (day === 0) {
    const startDate = isoDateLocal(ref);
    return { startDate, endDate: startDate };
  }
  const daysUntilSat = 6 - day;
  const startDate = addDaysLocal(isoDateLocal(ref), daysUntilSat);
  return { startDate, endDate: addDaysLocal(startDate, 1) };
}

export function deriveRangeFromPreset(
  preset: DatePresetId,
  startDate: string,
  endDate?: string,
): { startDate: string; endDate: string } {
  if (preset === 'days2') return { startDate, endDate: endDateFromTripDays(startDate, 2) };
  if (preset === 'days3') return { startDate, endDate: endDateFromTripDays(startDate, 3) };
  if (preset === 'days4') return { startDate, endDate: endDateFromTripDays(startDate, 4) };
  if (preset === 'weekend') return weekendRangeFrom(parseIsoDateLocal(startDate));
  const end = endDate && endDate >= startDate ? endDate : startDate;
  return { startDate, endDate: end };
}

/** Inclusive trip length (3 ngày ⇒ end = start + 2). */
export function tripDayCount(startDate: string, endDate: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const start = parseIsoDateLocal(startDate).getTime();
  const end = parseIsoDateLocal(endDate).getTime();
  return Math.max(1, Math.round((end - start) / msPerDay) + 1);
}

/** Normalize inclusive trip day count (min 1). */
function normalizedTripDays(days: number): number {
  return Number.isFinite(days) ? Math.max(1, Math.floor(days)) : 1;
}

/** Derive endDate from inclusive day count (min 1). */
export function endDateFromTripDays(startDate: string, days: number): string {
  return addDaysLocal(startDate, normalizedTripDays(days) - 1);
}

/** Overnight stays: 3 ngày ⇒ 2 đêm; 1-day trip ⇒ 0. */
export function tripNightCount(days: number): number {
  return normalizedTripDays(days) - 1;
}

/** Compact days/nights label, e.g. `3 ngày · 2 đêm` / `3 days · 2 nights`. */
export function formatTripDaysNights(days: number, locale: string): string {
  const d = normalizedTripDays(days);
  const nights = d - 1;
  if (isViLocale(locale)) {
    return `${d} ngày · ${nights} đêm`;
  }
  const dayUnit = d === 1 ? 'day' : 'days';
  const nightUnit = nights === 1 ? 'night' : 'nights';
  return `${d} ${dayUnit} · ${nights} ${nightUnit}`;
}

function isViLocale(locale: string): boolean {
  return locale.toLowerCase().startsWith('vi');
}

const EN_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** VN: dd/mm/yyyy. EN: d MMM yyyy (day-first, unambiguous). */
export function formatIsoDateDisplay(iso: string, locale: string): string {
  const d = parseIsoDateLocal(iso);
  const day = pad2(d.getDate());
  const month = pad2(d.getMonth() + 1);
  const year = d.getFullYear();
  if (isViLocale(locale)) {
    return `${day}/${month}/${year}`;
  }
  return `${d.getDate()} ${EN_MONTHS[d.getMonth()]} ${year}`;
}

/** Date and time in one string, e.g. `18/08/2026, 08:00`. */
export function formatIsoDateTimeDisplay(
  isoDate: string,
  hhmm: string,
  locale: string,
): string {
  return `${formatIsoDateDisplay(isoDate, locale)}, ${hhmm}`;
}

export function formatDateRangeDisplay(
  startDate: string,
  endDate: string,
  locale: string,
): string {
  const start = formatIsoDateDisplay(startDate, locale);
  const end = formatIsoDateDisplay(endDate, locale);
  if (startDate === endDate) return start;
  return `${start} – ${end}`;
}
