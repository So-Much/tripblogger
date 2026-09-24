import { parseOpeningHours } from './opening-hours';
import type {
  DayScheduleResult,
  EngineStopInput,
  ScheduleConflict,
  ScheduledStop,
} from './types';

const DEFAULT_TZ = '+07:00';

function parseOffsetHours(offset: string): number {
  const m = offset.match(/^([+-])(\d{2}):(\d{2})$/);
  if (!m) return 7;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (Number(m[2]) + Number(m[3]) / 60);
}

function atWallClock(dayDate: string, hhmm: string, tz: string): Date {
  return new Date(`${dayDate}T${hhmm}:00${tz}`);
}

function addSeconds(d: Date, seconds: number): Date {
  return new Date(d.getTime() + seconds * 1000);
}

function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60_000);
}

/** Format instant as ISO local wall-clock in +07:00 (phase-1 VN convention). */
function formatIso(d: Date, tz: string): string {
  const hours = parseOffsetHours(tz);
  const shifted = new Date(d.getTime() + hours * 60 * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const mo = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  const h = String(shifted.getUTCHours()).padStart(2, '0');
  const mi = String(shifted.getUTCMinutes()).padStart(2, '0');
  const s = String(shifted.getUTCSeconds()).padStart(2, '0');
  return `${y}-${mo}-${day}T${h}:${mi}:${s}${tz}`;
}

function minutesBetween(later: Date, earlier: Date): number {
  return Math.round((later.getTime() - earlier.getTime()) / 60_000);
}

export function computeDaySchedule(args: {
  dayDate: string;
  dayStartTime: string;
  stops: EngineStopInput[];
  timezoneOffset?: string;
}): DayScheduleResult {
  const { dayDate, dayStartTime, stops } = args;
  const tz = args.timezoneOffset ?? DEFAULT_TZ;
  let cursor = atWallClock(dayDate, dayStartTime, tz);
  const scheduled: ScheduledStop[] = [];
  const conflicts: ScheduleConflict[] = [];

  stops.forEach((stop, index) => {
    if (stop.status === 'skipped') {
      scheduled.push({
        id: stop.id,
        arriveAt: null,
        startAt: null,
        endAt: null,
        departAt: null,
        idleMinutes: 0,
        skipped: true,
      });
      return;
    }

    let travelSeconds = 0;
    if (index === 0) {
      travelSeconds = 0;
    } else if (stop.travelFromPrevSeconds === null) {
      travelSeconds = 0;
      conflicts.push({
        stopId: stop.id,
        type: 'travel_unknown',
        messageKey: 'planConflictTravelUnknown',
      });
    } else {
      travelSeconds = stop.travelFromPrevSeconds;
    }

    const arriveAt = addSeconds(cursor, travelSeconds);
    let startAt = arriveAt;
    let idleMinutes = 0;

    if (stop.anchorTime) {
      const anchor = atWallClock(dayDate, stop.anchorTime, tz);
      if (arriveAt.getTime() <= anchor.getTime()) {
        startAt = anchor;
        idleMinutes = minutesBetween(anchor, arriveAt);
      } else {
        startAt = arriveAt;
        conflicts.push({
          stopId: stop.id,
          type: 'anchor_unreachable',
          lateMinutes: minutesBetween(arriveAt, anchor),
          messageKey: 'planConflictAnchor',
        });
      }
    }

    const hours = parseOpeningHours(stop.openingHoursRaw);
    if (hours.known && !hours.isOpenAt(arriveAt, parseOffsetHours(tz))) {
      conflicts.push({
        stopId: stop.id,
        type: 'closed_on_arrival',
        messageKey: 'planConflictClosed',
      });
    }

    const endAt = addMinutes(startAt, stop.durationMinutes);
    const departAt = addMinutes(endAt, stop.bufferAfterMinutes);
    cursor = departAt;

    scheduled.push({
      id: stop.id,
      arriveAt: formatIso(arriveAt, tz),
      startAt: formatIso(startAt, tz),
      endAt: formatIso(endAt, tz),
      departAt: formatIso(departAt, tz),
      idleMinutes,
      skipped: false,
    });
  });

  return { stops: scheduled, conflicts };
}
