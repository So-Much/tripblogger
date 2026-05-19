export type RelativeTimeLabels = {
  now: string;
  minutes: (n: number) => string;
  hours: (n: number) => string;
  days: (n: number) => string;
  weeks: (n: number) => string;
  months: (n: number) => string;
  years: (n: number) => string;
};

export type SocialTimeLabels = RelativeTimeLabels & {
  localTime: (hhmm: string) => string;
  yesterday: (hhmm: string) => string;
};

const DEFAULT_RELATIVE_LABELS: RelativeTimeLabels = {
  now: 'Bây giờ',
  minutes: (n) => `${n}p`,
  hours: (n) => `${n}h`,
  days: (n) => `${n}d`,
  weeks: (n) => `${n}tu`,
  months: (n) => `${n}th`,
  years: (n) => `${n}y`,
};

const HAS_TZ_SUFFIX = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Parse API/DB timestamps as UTC instants, then format in device local timezone.
 * Strings without timezone are treated as UTC (SQL Server GETUTCDATE wall clock).
 */
export function parseUtcDate(iso: string | number | Date): Date {
  if (iso instanceof Date) return new Date(iso.getTime());
  if (typeof iso === 'number') return new Date(iso);
  const trimmed = String(iso).trim();
  if (!trimmed) return new Date(NaN);
  if (HAS_TZ_SUFFIX.test(trimmed)) return new Date(trimmed);
  const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
  return new Date(`${normalized}Z`);
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** HH:mm in device local timezone (from correct UTC instant). */
function localClock(d: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/** Device-local wall clock: dd/mm/yyyy, hh:mm */
export function formatLocalDateTime(iso: string | number | Date): string {
  const d = parseUtcDate(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}, ${localClock(d)}`;
}

/**
 * UTC ISO → device-local instant → relative label.
 * Same local calendar day shows clock time; then yesterday, days, weeks, months, years.
 */
export function formatSocialTimestamp(
  iso: string | number | Date,
  labels: SocialTimeLabels,
): string {
  const at = parseUtcDate(iso);
  const now = new Date();
  const ms = now.getTime() - at.getTime();
  if (ms < 60_000) return labels.now;

  const clock = localClock(at);
  const dayDiff = Math.floor((startOfLocalDay(now) - startOfLocalDay(at)) / 86_400_000);

  if (dayDiff === 0) return labels.localTime(clock);
  if (dayDiff === 1) return labels.yesterday(clock);
  if (dayDiff < 7) return labels.days(dayDiff);

  const weeks = Math.floor(dayDiff / 7);
  if (weeks < 5) return labels.weeks(weeks);

  const months = Math.floor(dayDiff / 30);
  if (months < 12) return labels.months(months);

  const years = Math.floor(months / 12);
  return labels.years(Math.max(years, 1));
}

/** @deprecated Prefer formatSocialTimestamp for comments and feeds */
export function formatRelativeTime(
  iso: string | number | Date,
  labels: RelativeTimeLabels = DEFAULT_RELATIVE_LABELS,
): string {
  return formatSocialTimestamp(iso, {
    ...labels,
    localTime: (hhmm) => hhmm,
    yesterday: (hhmm) => `Hôm qua ${hhmm}`,
  });
}
