import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { computeDaySchedule } from '@tripblogger/itinerary-engine';
import type { ScheduleConflict, ScheduledStop } from '@tripblogger/itinerary-engine';
import { In, Repository } from 'typeorm';
import { AddStopDto } from './dto/add-stop.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { MoveStopDto } from './dto/move-stop.dto';
import { PatchDayDto } from './dto/patch-day.dto';
import { PatchStopDto } from './dto/patch-stop.dto';
import { PatchTripDto } from './dto/patch-trip.dto';
import type {
  TripDayDto,
  TripDetailDto,
  TripMutationResult,
  TripStopDto,
  TripSummaryDto,
} from './dto/trip-response.dto';
import { TripDayEntity } from './entities/trip-day.entity';
import { TripStopTagEntity } from './entities/trip-stop-tag.entity';
import { TripStopEntity } from './entities/trip-stop.entity';
import { TripEntity } from './entities/trip.entity';
import { TravelLegsService } from './travel-legs.service';

const SYSTEM_TAGS = new Set(['entry_point', 'accommodation']);
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function eachDateInclusive(startDate: string, endDate: string): string[] {
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  let cur = Date.UTC(sy, sm - 1, sd);
  const last = Date.UTC(ey, em - 1, ed);
  if (cur > last) {
    throw new BadRequestException('endDate must be on or after startDate');
  }
  const dates: string[] = [];
  while (cur <= last) {
    const d = new Date(cur);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
    cur += MS_PER_DAY;
  }
  return dates;
}

function toDateString(value: string | Date): string {
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(TripEntity)
    private readonly tripsRepo: Repository<TripEntity>,
    @InjectRepository(TripDayEntity)
    private readonly daysRepo: Repository<TripDayEntity>,
    @InjectRepository(TripStopEntity)
    private readonly stopsRepo: Repository<TripStopEntity>,
    @InjectRepository(TripStopTagEntity)
    private readonly tagsRepo: Repository<TripStopTagEntity>,
    private readonly travelLegs: TravelLegsService,
  ) {}

  async create(userId: string, dto: CreateTripDto): Promise<TripDetailDto> {
    const dates = eachDateInclusive(dto.startDate, dto.endDate);

    const trip = this.tripsRepo.create({
      userId,
      title: dto.title,
      destinationLabel: dto.destinationLabel,
      destinationLat: String(dto.destinationLat),
      destinationLng: String(dto.destinationLng),
      startDate: dto.startDate,
      endDate: dto.endDate,
      defaultTravelMode: dto.defaultTravelMode ?? 'motorbike',
      defaultBufferMinutes: dto.defaultBufferMinutes ?? 15,
      defaultDayStartTime: dto.defaultDayStartTime ?? '08:00',
      status: 'draft',
      version: 1,
    });
    const saved = await this.tripsRepo.save(trip);

    const dayEntities = dates.map((date, dayIndex) =>
      this.daysRepo.create({
        tripId: saved.id,
        date,
        dayIndex,
        startTime: null,
      }),
    );
    await this.daysRepo.save(dayEntities);

    return this.findOne(userId, saved.id);
  }

  async findAll(userId: string): Promise<TripSummaryDto[]> {
    const trips = await this.tripsRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
    return trips.map((t) => this.toSummary(t));
  }

  async findOne(userId: string, tripId: string): Promise<TripDetailDto> {
    const trip = await this.requireOwnedTrip(userId, tripId);

    const days = await this.daysRepo.find({
      where: { tripId },
      order: { dayIndex: 'ASC' },
    });
    const stops = await this.stopsRepo.find({
      where: { tripId },
      order: { position: 'ASC' },
    });

    const tagsByStopId = await this.loadTagsByStopId(stops.map((s) => s.id));
    return this.toDetail(trip, days, stops, tagsByStopId);
  }

  async patch(userId: string, tripId: string, dto: PatchTripDto): Promise<TripDetailDto> {
    const trip = await this.requireOwnedTrip(userId, tripId);

    const nextStart = dto.startDate ?? toDateString(trip.startDate);
    const nextEnd = dto.endDate ?? toDateString(trip.endDate);
    // Validate range early (also throws if inverted)
    const targetDates = eachDateInclusive(nextStart, nextEnd);
    const dateRangeChanged =
      dto.startDate !== undefined || dto.endDate !== undefined;

    await this.tripsRepo.manager.transaction(async (em) => {
      const tripsRepo = em.getRepository(TripEntity);
      const daysRepo = em.getRepository(TripDayEntity);
      const stopsRepo = em.getRepository(TripStopEntity);

      if (dto.title !== undefined) trip.title = dto.title;
      if (dto.destinationLabel !== undefined) trip.destinationLabel = dto.destinationLabel;
      if (dto.destinationLat !== undefined) trip.destinationLat = String(dto.destinationLat);
      if (dto.destinationLng !== undefined) trip.destinationLng = String(dto.destinationLng);
      if (dto.defaultTravelMode !== undefined) trip.defaultTravelMode = dto.defaultTravelMode;
      if (dto.defaultBufferMinutes !== undefined) {
        trip.defaultBufferMinutes = dto.defaultBufferMinutes;
      }
      if (dto.defaultDayStartTime !== undefined) {
        trip.defaultDayStartTime = dto.defaultDayStartTime;
      }
      if (dto.status !== undefined) trip.status = dto.status;

      trip.startDate = nextStart;
      trip.endDate = nextEnd;
      trip.version = trip.version + 1;
      await tripsRepo.save(trip);

      if (!dateRangeChanged) return;

      const existingDays = await daysRepo.find({
        where: { tripId },
        order: { dayIndex: 'ASC' },
      });
      const targetSet = new Set(targetDates);
      const existingByDate = new Map(
        existingDays.map((d) => [toDateString(d.date), d]),
      );

      const daysToRemove = existingDays.filter((d) => !targetSet.has(toDateString(d.date)));
      if (daysToRemove.length) {
        const removedIds = new Set(daysToRemove.map((d) => d.id));
        const dayIndexById = new Map(existingDays.map((d) => [d.id, d.dayIndex]));
        const allStops = await stopsRepo.find({
          where: { tripId },
          order: { position: 'ASC' },
        });

        const existingIdea = allStops.filter((s) => s.tripDayId == null);
        const parked = allStops.filter(
          (s) => s.tripDayId != null && removedIds.has(s.tripDayId),
        );

        // Preserve existing idea order, then append parked stops (by day, then position)
        parked.sort((a, b) => {
          const idxA = dayIndexById.get(a.tripDayId!) ?? 0;
          const idxB = dayIndexById.get(b.tripDayId!) ?? 0;
          if (idxA !== idxB) return idxA - idxB;
          return a.position - b.position;
        });

        const ideaBucket = [...existingIdea, ...parked];
        ideaBucket.forEach((s, i) => {
          s.tripDayId = null;
          s.position = i;
        });
        if (ideaBucket.length) {
          await stopsRepo.save(ideaBucket);
        }

        // Must null stops before deleting days (FK NO ACTION)
        await daysRepo.remove(daysToRemove);
      }

      const dateToIndex = new Map(targetDates.map((d, i) => [d, i]));

      const daysToAdd = targetDates
        .filter((date) => !existingByDate.has(date))
        .map((date) =>
          daysRepo.create({
            tripId,
            date,
            dayIndex: dateToIndex.get(date)!,
            startTime: null,
          }),
        );
      if (daysToAdd.length) {
        await daysRepo.save(daysToAdd);
      }

      // Renumber dayIndex for kept days (e.g. startDate shifted forward)
      const keptDays = existingDays.filter((d) => targetSet.has(toDateString(d.date)));
      let needsRenumber = false;
      for (const day of keptDays) {
        const expected = dateToIndex.get(toDateString(day.date))!;
        if (day.dayIndex !== expected) {
          day.dayIndex = expected;
          needsRenumber = true;
        }
      }
      if (needsRenumber) {
        await daysRepo.save(keptDays);
      }
    });

    return this.findOne(userId, tripId);
  }

  async patchDay(
    userId: string,
    tripId: string,
    dayId: string,
    dto: PatchDayDto,
  ): Promise<TripDetailDto> {
    await this.requireOwnedTrip(userId, tripId);

    const day = await this.daysRepo.findOne({ where: { id: dayId, tripId } });
    if (!day) {
      throw new NotFoundException('Trip day not found');
    }

    day.startTime = dto.startTime;
    await this.daysRepo.save(day);

    const trip = await this.tripsRepo.findOne({ where: { id: tripId } });
    if (trip) {
      trip.version = trip.version + 1;
      await this.tripsRepo.save(trip);
    }

    return this.findOne(userId, tripId);
  }

  async remove(userId: string, tripId: string): Promise<void> {
    const trip = await this.requireOwnedTrip(userId, tripId);
    await this.tripsRepo.remove(trip);
  }

  async addStop(
    userId: string,
    tripId: string,
    dto: AddStopDto,
  ): Promise<TripMutationResult> {
    const trip = await this.requireOwnedTrip(userId, tripId);

    if (dto.tripDayId) {
      const day = await this.daysRepo.findOne({
        where: { id: dto.tripDayId, tripId },
      });
      if (!day) {
        throw new NotFoundException('Trip day not found');
      }
    }

    const siblings = (
      await this.stopsRepo.find({
        where: { tripId },
        order: { position: 'ASC' },
      })
    ).filter((s) =>
      dto.tripDayId == null ? s.tripDayId == null : s.tripDayId === dto.tripDayId,
    );

    const insertAt =
      dto.position !== undefined
        ? Math.min(Math.max(0, dto.position), siblings.length)
        : siblings.length;

    for (const s of siblings) {
      if (s.position >= insertAt) {
        s.position += 1;
      }
    }
    if (siblings.length) {
      await this.stopsRepo.save(siblings);
    }

    const locationId =
      dto.place.source === 'db' && UUID_RE.test(dto.place.id) ? dto.place.id : null;

    const stop = this.stopsRepo.create({
      tripId,
      tripDayId: dto.tripDayId ?? null,
      position: insertAt,
      name: dto.place.name,
      address: dto.place.address ?? null,
      lat: String(dto.place.lat),
      lng: String(dto.place.lng),
      category: dto.place.category ?? null,
      externalPlaceId: dto.place.id,
      openingHoursRaw: dto.place.openingHours ?? null,
      locationId,
      durationMinutes: dto.durationMinutes ?? 60,
      bufferAfterMinutes: null,
      travelModeOverride: dto.travelModeOverride ?? null,
      anchorTime: dto.anchorTime ?? null,
      priority: dto.priority ?? 'nice',
      status: 'todo',
      travelFromPrevSeconds: null,
      travelFromPrevDistanceM: null,
      travelModeUsed: null,
    });
    const saved = await this.stopsRepo.save(stop);

    if (dto.tags?.length) {
      await this.syncTags(saved.id, dto.tags);
    }

    trip.version = trip.version + 1;
    await this.tripsRepo.save(trip);

    if (saved.tripDayId) {
      await this.recomputeLegsForDay(trip, saved.tripDayId);
    }

    const detail = await this.findOne(userId, tripId);
    return { trip: detail };
  }

  async patchStop(
    userId: string,
    tripId: string,
    stopId: string,
    dto: PatchStopDto,
  ): Promise<TripMutationResult> {
    const trip = await this.requireOwnedTrip(userId, tripId);
    const stop = await this.stopsRepo.findOne({ where: { id: stopId, tripId } });
    if (!stop) {
      throw new NotFoundException('Stop not found');
    }

    const modeChanged =
      dto.travelModeOverride !== undefined &&
      dto.travelModeOverride !== stop.travelModeOverride;

    if (dto.durationMinutes !== undefined) stop.durationMinutes = dto.durationMinutes;
    if (dto.bufferAfterMinutes !== undefined) {
      stop.bufferAfterMinutes = dto.bufferAfterMinutes;
    }
    if (dto.travelModeOverride !== undefined) {
      stop.travelModeOverride = dto.travelModeOverride;
    }
    if (dto.anchorTime !== undefined) stop.anchorTime = dto.anchorTime;
    if (dto.priority !== undefined) stop.priority = dto.priority;
    if (dto.status !== undefined) stop.status = dto.status;

    await this.stopsRepo.save(stop);

    if (dto.tags !== undefined) {
      await this.syncTags(stop.id, dto.tags);
    }

    trip.version = trip.version + 1;
    await this.tripsRepo.save(trip);

    if (modeChanged && stop.tripDayId) {
      await this.recomputeLegsForDay(trip, stop.tripDayId);
    }

    const detail = await this.findOne(userId, tripId);
    return { trip: detail };
  }

  async deleteStop(
    userId: string,
    tripId: string,
    stopId: string,
  ): Promise<TripMutationResult> {
    const trip = await this.requireOwnedTrip(userId, tripId);
    const stop = await this.stopsRepo.findOne({ where: { id: stopId, tripId } });
    if (!stop) {
      throw new NotFoundException('Stop not found');
    }

    const dayId = stop.tripDayId;
    await this.stopsRepo.remove(stop);

    const siblings = (
      await this.stopsRepo.find({
        where: { tripId },
        order: { position: 'ASC' },
      })
    ).filter((s) => (dayId == null ? s.tripDayId == null : s.tripDayId === dayId));

    siblings.forEach((s, i) => {
      s.position = i;
    });
    if (siblings.length) {
      await this.stopsRepo.save(siblings);
    }

    trip.version = trip.version + 1;
    await this.tripsRepo.save(trip);

    if (dayId) {
      await this.recomputeLegsForDay(trip, dayId);
    }

    const detail = await this.findOne(userId, tripId);
    return { trip: detail };
  }

  async moveStop(
    userId: string,
    tripId: string,
    stopId: string,
    dto: MoveStopDto,
  ): Promise<TripMutationResult> {
    const trip = await this.requireOwnedTrip(userId, tripId);
    const stop = await this.stopsRepo.findOne({ where: { id: stopId, tripId } });
    if (!stop) {
      throw new NotFoundException('Stop not found');
    }

    if (dto.toTripDayId != null) {
      const day = await this.daysRepo.findOne({
        where: { id: dto.toTripDayId, tripId },
      });
      if (!day) {
        throw new NotFoundException('Trip day not found');
      }
    }

    const fromDayId = stop.tripDayId;
    const toDayId = dto.toTripDayId ?? null;

    await this.tripsRepo.manager.transaction(async (em) => {
      const stopsRepo = em.getRepository(TripStopEntity);
      const tripsRepo = em.getRepository(TripEntity);

      const allStops = await stopsRepo.find({
        where: { tripId },
        order: { position: 'ASC' },
      });

      const inBucket = (s: TripStopEntity, dayId: string | null) =>
        dayId == null ? s.tripDayId == null : s.tripDayId === dayId;

      const sameBucket =
        (fromDayId == null && toDayId == null) ||
        (fromDayId != null && fromDayId === toDayId);

      if (sameBucket) {
        const bucket = allStops.filter((s) => inBucket(s, fromDayId));
        const fromIndex = bucket.findIndex((s) => s.id === stop.id);
        if (fromIndex < 0) {
          throw new NotFoundException('Stop not found');
        }
        const [moved] = bucket.splice(fromIndex, 1);
        const insertAt = Math.min(Math.max(0, dto.toPosition), bucket.length);
        bucket.splice(insertAt, 0, moved);
        bucket.forEach((s, i) => {
          s.position = i;
        });
        await stopsRepo.save(bucket);
      } else {
        const source = allStops.filter(
          (s) => s.id !== stop.id && inBucket(s, fromDayId),
        );
        source.forEach((s, i) => {
          s.position = i;
        });

        const dest = allStops.filter(
          (s) => s.id !== stop.id && inBucket(s, toDayId),
        );
        const insertAt = Math.min(Math.max(0, dto.toPosition), dest.length);
        stop.tripDayId = toDayId;
        if (toDayId == null) {
          stop.travelFromPrevSeconds = null;
          stop.travelFromPrevDistanceM = null;
          stop.travelModeUsed = null;
        }
        dest.splice(insertAt, 0, stop);
        dest.forEach((s, i) => {
          s.position = i;
        });

        const toSave = [...source, ...dest];
        if (toSave.length) {
          await stopsRepo.save(toSave);
        }
      }

      trip.version = trip.version + 1;
      await tripsRepo.save(trip);
    });

    const affectedDayIds = new Set<string>();
    if (fromDayId) affectedDayIds.add(fromDayId);
    if (toDayId) affectedDayIds.add(toDayId);
    for (const dayId of affectedDayIds) {
      await this.recomputeLegsForDay(trip, dayId);
    }

    const detail = await this.findOne(userId, tripId);
    return { trip: detail };
  }

  private async recomputeLegsForDay(trip: TripEntity, dayId: string): Promise<void> {
    const dayStops = (
      await this.stopsRepo.find({
        where: { tripId: trip.id, tripDayId: dayId },
        order: { position: 'ASC' },
      })
    ).sort((a, b) => a.position - b.position);

    await this.travelLegs.recomputeDayLegs(dayStops, trip.defaultTravelMode);
    if (dayStops.length) {
      await this.stopsRepo.save(dayStops);
    }
  }

  private async syncTags(stopId: string, tags: string[]): Promise<void> {
    await this.tagsRepo.delete({ tripStopId: stopId });
    const unique = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
    if (!unique.length) return;
    const rows = unique.map((tag) =>
      this.tagsRepo.create({
        tripStopId: stopId,
        tag,
        isSystem: SYSTEM_TAGS.has(tag),
      }),
    );
    await this.tagsRepo.save(rows);
  }

  private async requireOwnedTrip(userId: string, tripId: string): Promise<TripEntity> {
    const trip = await this.tripsRepo.findOne({ where: { id: tripId } });
    if (!trip || trip.userId !== userId) {
      throw new NotFoundException('Trip not found');
    }
    return trip;
  }

  private async loadTagsByStopId(stopIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (!stopIds.length) return map;

    const rows = await this.tagsRepo.find({
      where: { tripStopId: In(stopIds) },
    });
    for (const row of rows) {
      const list = map.get(row.tripStopId) ?? [];
      list.push(row.tag);
      map.set(row.tripStopId, list);
    }
    return map;
  }

  private toSummary(trip: TripEntity): TripSummaryDto {
    return {
      id: trip.id,
      title: trip.title,
      destinationLabel: trip.destinationLabel,
      destinationLat: Number(trip.destinationLat),
      destinationLng: Number(trip.destinationLng),
      startDate: toDateString(trip.startDate),
      endDate: toDateString(trip.endDate),
      defaultTravelMode: trip.defaultTravelMode,
      defaultBufferMinutes: trip.defaultBufferMinutes,
      defaultDayStartTime: trip.defaultDayStartTime,
      status: trip.status,
      version: trip.version,
    };
  }

  private toDetail(
    trip: TripEntity,
    days: TripDayEntity[],
    stops: TripStopEntity[],
    tagsByStopId: Map<string, string[]>,
  ): TripDetailDto {
    const stopsByDayId = new Map<string, TripStopEntity[]>();
    const ideaStops: TripStopEntity[] = [];

    for (const stop of stops) {
      if (stop.tripDayId == null) {
        ideaStops.push(stop);
      } else {
        const list = stopsByDayId.get(stop.tripDayId) ?? [];
        list.push(stop);
        stopsByDayId.set(stop.tripDayId, list);
      }
    }

    const dayDtos: TripDayDto[] = days.map((day) => {
      const dayStops = stopsByDayId.get(day.id) ?? [];
      const dayStartTime = day.startTime ?? trip.defaultDayStartTime;
      const scheduleResult = computeDaySchedule({
        dayDate: toDateString(day.date),
        dayStartTime,
        stops: dayStops.map((s) => ({
          id: s.id,
          durationMinutes: s.durationMinutes,
          bufferAfterMinutes: s.bufferAfterMinutes ?? trip.defaultBufferMinutes,
          travelFromPrevSeconds: s.travelFromPrevSeconds,
          anchorTime: s.anchorTime,
          status: s.status,
          openingHoursRaw: s.openingHoursRaw,
        })),
      });

      const scheduleById = new Map<string, ScheduledStop>(
        scheduleResult.stops.map((s) => [s.id, s]),
      );
      const conflictsByStopId = new Map<string, ScheduleConflict[]>();
      for (const c of scheduleResult.conflicts) {
        const list = conflictsByStopId.get(c.stopId) ?? [];
        list.push(c);
        conflictsByStopId.set(c.stopId, list);
      }

      return {
        id: day.id,
        date: toDateString(day.date),
        dayIndex: day.dayIndex,
        startTime: day.startTime,
        stops: dayStops.map((s) =>
          this.toStopDto(s, tagsByStopId.get(s.id) ?? [], {
            schedule: scheduleById.get(s.id) ?? null,
            conflicts: conflictsByStopId.get(s.id) ?? [],
          }),
        ),
        scheduleConflicts: scheduleResult.conflicts,
      };
    });

    return {
      ...this.toSummary(trip),
      days: dayDtos,
      ideaStops: ideaStops.map((s) =>
        this.toStopDto(s, tagsByStopId.get(s.id) ?? [], {
          schedule: null,
          conflicts: [],
        }),
      ),
    };
  }

  private toStopDto(
    stop: TripStopEntity,
    tags: string[],
    schedule: { schedule: ScheduledStop | null; conflicts: ScheduleConflict[] },
  ): TripStopDto {
    return {
      id: stop.id,
      tripId: stop.tripId,
      tripDayId: stop.tripDayId,
      position: stop.position,
      name: stop.name,
      address: stop.address,
      lat: Number(stop.lat),
      lng: Number(stop.lng),
      category: stop.category,
      externalPlaceId: stop.externalPlaceId,
      openingHoursRaw: stop.openingHoursRaw,
      locationId: stop.locationId,
      durationMinutes: stop.durationMinutes,
      bufferAfterMinutes: stop.bufferAfterMinutes,
      travelModeOverride: stop.travelModeOverride,
      anchorTime: stop.anchorTime,
      priority: stop.priority,
      status: stop.status,
      tags,
      travelFromPrevSeconds: stop.travelFromPrevSeconds,
      travelFromPrevDistanceM: stop.travelFromPrevDistanceM,
      travelModeUsed: stop.travelModeUsed,
      schedule: schedule.schedule,
      conflicts: schedule.conflicts,
    };
  }
}
