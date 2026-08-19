import { computeDaySchedule } from '@tripblogger/itinerary-engine';
import type { PatchStopDto, TripDetailDto, TripStopDto } from '../types/plan';

/** Extract `HH:mm` from schedule ISO (`…T09:37:00+07:00`). */
export function clockFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m = iso.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : null;
}

function mapStopWithPatch(stop: TripStopDto, stopId: string, patch: PatchStopDto): TripStopDto {
  if (stop.id !== stopId) return stop;
  return {
    ...stop,
    ...(patch.durationMinutes !== undefined ? { durationMinutes: patch.durationMinutes } : {}),
    ...(patch.bufferAfterMinutes !== undefined
      ? { bufferAfterMinutes: patch.bufferAfterMinutes }
      : {}),
    ...(patch.travelFromPrevSeconds !== undefined
      ? { travelFromPrevSeconds: patch.travelFromPrevSeconds }
      : {}),
    ...(patch.travelModeOverride !== undefined
      ? { travelModeOverride: patch.travelModeOverride }
      : {}),
    ...(patch.anchorTime !== undefined ? { anchorTime: patch.anchorTime } : {}),
    ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
  };
}

/**
 * Apply a stop field patch and recompute that day's schedule client-side
 * for snappy UI before the server mutation returns.
 */
export function applyLocalStopPatch(
  trip: TripDetailDto,
  stopId: string,
  patch: PatchStopDto,
): TripDetailDto {
  const inIdeas = trip.ideaStops.some((s) => s.id === stopId);
  if (inIdeas) {
    return {
      ...trip,
      ideaStops: trip.ideaStops.map((s) => mapStopWithPatch(s, stopId, patch)),
    };
  }

  return {
    ...trip,
    days: trip.days.map((day) => {
      if (!day.stops.some((s) => s.id === stopId)) return day;

      const stops = day.stops.map((s) => mapStopWithPatch(s, stopId, patch));
      const dayStartTime = day.startTime ?? trip.defaultDayStartTime;
      const result = computeDaySchedule({
        dayDate: day.date,
        dayStartTime,
        stops: stops.map((s) => ({
          id: s.id,
          durationMinutes: s.durationMinutes,
          bufferAfterMinutes: s.bufferAfterMinutes ?? trip.defaultBufferMinutes,
          travelFromPrevSeconds: s.travelFromPrevSeconds,
          anchorTime: s.anchorTime,
          status: s.status,
          openingHoursRaw: s.openingHoursRaw,
        })),
      });

      const scheduleById = new Map(result.stops.map((s) => [s.id, s]));
      const conflictsByStopId = new Map<string, typeof result.conflicts>();
      for (const c of result.conflicts) {
        const list = conflictsByStopId.get(c.stopId) ?? [];
        list.push(c);
        conflictsByStopId.set(c.stopId, list);
      }

      return {
        ...day,
        scheduleConflicts: result.conflicts,
        stops: stops.map((s) => ({
          ...s,
          schedule: scheduleById.get(s.id) ?? null,
          conflicts: conflictsByStopId.get(s.id) ?? [],
        })),
      };
    }),
  };
}

/** Fields that locally affect the day schedule chain. */
export function patchAffectsLocalSchedule(patch: PatchStopDto): boolean {
  return (
    patch.durationMinutes !== undefined ||
    patch.bufferAfterMinutes !== undefined ||
    patch.travelFromPrevSeconds !== undefined ||
    patch.anchorTime !== undefined ||
    patch.status !== undefined
  );
}
