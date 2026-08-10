import { parseOpeningHours } from './opening-hours';
import type {
  DayScheduleResult,
  EngineStopInput,
  ScheduleConflict,
  ScheduledStop,
} from './types';

const TZ = '+07:00';

function atWallClock(dayDate: string, hhmm: string): Date {
  return new Date(`${dayDate}T${hhmm}:00${TZ}`);
}

function addSeconds(d: Date, seconds: number): Date {
  return new Date(d.getTime() + seconds * 1000);
}

function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60_000);
}

/** Format instant as ISO local wall-clock in +07:00 (phase-1 VN convention). */
function formatIsoPlus07(d: Date): string {
  const shifted = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const mo = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  const h = String(shifted.getUTCHours()).padStart(2, '0');
  const mi = String(shifted.getUTCMinutes()).padStart(2, '0');
  const s = String(shifted.getUTCSeconds()).padStart(2, '0');
  return `${y}-${mo}-${day}T${h}:${mi}:${s}${TZ}`;
}

function minutesBetween(later: Date, earlier: Date): number {
  return Math.round((later.getTime() - earlier.getTime()) / 60_000);
}

export function computeDaySchedule(args: {
  dayDate: string;
  dayStartTime: string;
  stops: EngineStopInput[];
}): DayScheduleResult {
  const { dayDate, dayStartTime, stops } = args;
  let cursor = atWallClock(dayDate, dayStartTime);
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
      const anchor = atWallClock(dayDate, stop.anchorTime);
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
    if (hours.known && !hours.isOpenAt(arriveAt)) {
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
      arriveAt: formatIsoPlus07(arriveAt),
      startAt: formatIsoPlus07(startAt),
      endAt: formatIsoPlus07(endAt),
      departAt: formatIsoPlus07(departAt),
      idleMinutes,
      skipped: false,
    });
  });

  return { stops: scheduled, conflicts };
}
