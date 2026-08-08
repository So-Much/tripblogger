export type OpeningHoursParseResult =
  | { known: false }
  | { known: true; isOpenAt: (at: Date) => boolean };

/** OSM weekday tokens → JS getDay() (0=Su … 6=Sa) */
const DAY_INDEX: Record<string, number> = {
  Su: 0,
  Mo: 1,
  Tu: 2,
  We: 3,
  Th: 4,
  Fr: 5,
  Sa: 6,
};

const DAY_TOKEN = 'Mo|Tu|We|Th|Fr|Sa|Su';
const TIME = '([01]\\d|2[0-3]):([0-5]\\d)';
const TIME_RANGE = `${TIME}-${TIME}`;
const DAY_PART = `(?:${DAY_TOKEN})(?:-(?:${DAY_TOKEN}))?`;

/** Unsupported OSM features we refuse rather than guess */
const UNSUPPORTED =
  /\b(?:PH|SH|sunrise|sunset|dawn|dusk|open|closed|\+|week|year|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i;

type DayRule =
  | { kind: 'off' }
  | { kind: 'open'; ranges: Array<{ startMin: number; endMin: number }> };

function minutesOfDay(h: number, m: number): number {
  return h * 60 + m;
}

function expandDays(start: string, end?: string): number[] {
  const from = DAY_INDEX[start];
  const to = end ? DAY_INDEX[end] : from;
  if (from === undefined || to === undefined) return [];
  const days: number[] = [];
  let d = from;
  for (;;) {
    days.push(d);
    if (d === to) break;
    d = (d + 1) % 7;
  }
  return days;
}

function parseTimeRanges(raw: string): Array<{ startMin: number; endMin: number }> | null {
  const ranges: Array<{ startMin: number; endMin: number }> = [];
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const re = new RegExp(`^${TIME_RANGE}$`);
  for (const part of parts) {
    const m = part.match(re);
    if (!m) return null;
    const startMin = minutesOfDay(Number(m[1]), Number(m[2]));
    const endMin = minutesOfDay(Number(m[3]), Number(m[4]));
    if (endMin <= startMin) return null; // overnight not in subset
    ranges.push({ startMin, endMin });
  }
  return ranges;
}

function parseClause(clause: string, dayRules: Map<number, DayRule>): boolean {
  const trimmed = clause.trim();
  if (!trimmed) return true;

  // "Sa off" / "Mo-Fr off"
  const offMatch = trimmed.match(
    new RegExp(`^(${DAY_PART})\\s+off$`),
  );
  if (offMatch) {
    const [start, end] = offMatch[1].split('-');
    for (const day of expandDays(start, end)) {
      dayRules.set(day, { kind: 'off' });
    }
    return true;
  }

  // "Mo-Fr 08:00-17:00" / "Mo-Fr 08:00-12:00,13:30-18:00"
  const openMatch = trimmed.match(
    new RegExp(`^(${DAY_PART})\\s+(.+)$`),
  );
  if (!openMatch) return false;

  const [start, end] = openMatch[1].split('-');
  const ranges = parseTimeRanges(openMatch[2]);
  if (!ranges) return false;

  for (const day of expandDays(start, end)) {
    dayRules.set(day, { kind: 'open', ranges });
  }
  return true;
}

export function parseOpeningHours(
  raw: string | null | undefined,
): OpeningHoursParseResult {
  if (raw == null) return { known: false };
  const input = raw.trim();
  if (!input) return { known: false };

  if (input === '24/7') {
    return { known: true, isOpenAt: () => true };
  }

  if (UNSUPPORTED.test(input)) {
    return { known: false };
  }

  const dayRules = new Map<number, DayRule>();
  const clauses = input.split(';');
  for (const clause of clauses) {
    if (!parseClause(clause, dayRules)) {
      return { known: false };
    }
  }

  if (dayRules.size === 0) {
    return { known: false };
  }

  return {
    known: true,
    isOpenAt: (at: Date) => {
      const rule = dayRules.get(at.getDay());
      if (!rule || rule.kind === 'off') return false;
      const mins = minutesOfDay(at.getHours(), at.getMinutes());
      return rule.ranges.some((r) => mins >= r.startMin && mins < r.endMin);
    },
  };
}
