import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  ChangeTripDatesDto,
  CreateTripDto,
  QueryTripsDto,
  UpdateTripDto,
  UpdateTripStatusDto,
} from './dto/trip.dto';
import { TripDayEntity } from './entities/trip-day.entity';
import { TripEntity, TripStatus } from './entities/trip.entity';
import { TripMemberEntity } from './entities/trip-member.entity';
import { TripAccommodationEntity } from './entities/trip-accommodation.entity';
import { TripRecommendationEntity } from './entities/trip-recommendation.entity';
import { TripStopEntity } from './entities/trip-stop.entity';
import { TripPermissionsService } from './trip-permissions.service';
import { mapTrip } from './trips.mapper';

function eachDateInclusive(start: string, end: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  if (cur > last) return out;
  while (cur <= last) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function dayCount(start: string, end: string): number {
  return eachDateInclusive(start, end).length;
}

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(TripEntity)
    private readonly tripsRepo: Repository<TripEntity>,
    @InjectRepository(TripDayEntity)
    private readonly daysRepo: Repository<TripDayEntity>,
    @InjectRepository(TripMemberEntity)
    private readonly membersRepo: Repository<TripMemberEntity>,
    @InjectRepository(TripAccommodationEntity)
    private readonly accomRepo: Repository<TripAccommodationEntity>,
    @InjectRepository(TripStopEntity)
    private readonly stopsRepo: Repository<TripStopEntity>,
    @InjectRepository(TripRecommendationEntity)
    private readonly recRepo: Repository<TripRecommendationEntity>,
    private readonly permissions: TripPermissionsService,
  ) {}

  async createTrip(userId: string, dto: CreateTripDto) {
    const days = dayCount(dto.startDate, dto.endDate);
    if (days < 1) throw new BadRequestException('Invalid date range');
    if (days > 365) throw new BadRequestException('Trip cannot exceed 365 days');

    const trip = await this.tripsRepo.save(
      this.tripsRepo.create({
        userId,
        title: dto.title,
        description: dto.description ?? null,
        destinationName: dto.destinationName ?? null,
        startDate: dto.startDate,
        endDate: dto.endDate,
        status: 'PLANNING',
        isPublic: dto.isPublic ?? false,
        totalBudget: dto.totalBudget != null ? String(dto.totalBudget) : null,
      }),
    );

    await this.membersRepo.save(
      this.membersRepo.create({
        tripId: trip.id,
        userId,
        role: 'OWNER',
        status: 'ACCEPTED',
        joinedAt: new Date(),
      }),
    );

    await this.generateDays(trip.id, dto.startDate, dto.endDate);
    return this.getTripDetail(trip.id, userId);
  }

  async findMine(userId: string, query: QueryTripsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.tripsRepo
      .createQueryBuilder('t')
      .innerJoin(TripMemberEntity, 'tm', 'tm.tripId = t.id')
      .where('tm.userId = :userId', { userId })
      .andWhere('tm.status = :ms', { ms: 'ACCEPTED' })
      .orderBy('t.startDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (query.status) qb.andWhere('t.status = :status', { status: query.status });
    if (query.favorite === true) qb.andWhere('t.isFavorite = :favorite', { favorite: true });
    const [items, total] = await qb.getManyAndCount();
    return { items: items.map((t) => mapTrip(t, false)), total, page, limit };
  }

  async explore(query: QueryTripsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await this.tripsRepo.findAndCount({
      where: { isPublic: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items: items.map((t) => mapTrip(t, false)), total, page, limit };
  }

  async getTripDetail(tripId: string, userId: string) {
    await this.permissions.assertCan(tripId, userId, 'view');
    const trip = await this.loadTripFull(tripId);
    if (!trip) throw new NotFoundException('Trip not found');
    return mapTrip(trip);
  }

  async updateTrip(tripId: string, userId: string, dto: UpdateTripDto) {
    await this.permissions.assertCan(tripId, userId, 'edit_trip');
    const trip = await this.tripsRepo.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');

    if (dto.isPublic !== undefined) {
      await this.permissions.assertCan(tripId, userId, 'change_public');
    }

    if (dto.startDate && dto.endDate) {
      return this.changeTripDates(tripId, userId, {
        startDate: dto.startDate,
        endDate: dto.endDate,
        shrinkPolicy: 'cancel',
      });
    }

    Object.assign(trip, {
      title: dto.title ?? trip.title,
      description: dto.description !== undefined ? dto.description : trip.description,
      destinationName:
        dto.destinationName !== undefined ? dto.destinationName : trip.destinationName,
      startDate: dto.startDate ?? trip.startDate,
      endDate: dto.endDate ?? trip.endDate,
      totalBudget: dto.totalBudget != null ? String(dto.totalBudget) : trip.totalBudget,
      isPublic: dto.isPublic ?? trip.isPublic,
      isFavorite: dto.isFavorite ?? trip.isFavorite,
      notes: dto.notes !== undefined ? dto.notes : trip.notes,
    });
    await this.tripsRepo.save(trip);
    return this.getTripDetail(tripId, userId);
  }

  async changeTripDates(tripId: string, userId: string, dto: ChangeTripDatesDto) {
    await this.permissions.assertCan(tripId, userId, 'edit_trip');
    const trip = await this.tripsRepo.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');

    const newDates = eachDateInclusive(dto.startDate, dto.endDate);
    if (newDates.length > 365) throw new BadRequestException('Trip cannot exceed 365 days');

    const existingDays = await this.daysRepo.find({
      where: { tripId },
      relations: ['stops'],
      order: { dayNumber: 'ASC' },
    });

    const removed = existingDays.filter((d) => !newDates.includes(d.date));
    const hasStopsOnRemoved = removed.some((d) => (d.stops?.length ?? 0) > 0);
    if (hasStopsOnRemoved && dto.shrinkPolicy === 'cancel') {
      throw new BadRequestException(
        'Shrinking dates would remove days with stops. Pass shrinkPolicy: delete_orphan_stops or move_to_previous_day',
      );
    }

    if (hasStopsOnRemoved && dto.shrinkPolicy === 'delete_orphan_stops') {
      for (const day of removed) {
        await this.daysRepo.remove(day);
      }
    }
    if (hasStopsOnRemoved && dto.shrinkPolicy === 'move_to_previous_day') {
      const kept = existingDays.filter((d) => newDates.includes(d.date)).sort((a, b) => a.dayNumber - b.dayNumber);
      const fallbackDay = kept[kept.length - 1];
      if (!fallbackDay) {
        throw new BadRequestException('No remaining day to move stops into');
      }
      const maxRow = await this.stopsRepo
        .createQueryBuilder('s')
        .select('MAX(s.order_index)', 'max')
        .where('s.trip_day_id = :dayId', { dayId: fallbackDay.id })
        .getRawOne<{ max: number | null }>();
      let nextOrder = Number(maxRow?.max ?? 0) + 1000;
      for (const day of removed) {
        const stops = (day.stops ?? []).sort((a, b) => a.orderIndex - b.orderIndex);
        for (const stop of stops) {
          stop.tripDayId = fallbackDay.id;
          stop.orderIndex = nextOrder;
          nextOrder += 1000;
          await this.stopsRepo.save(stop);
        }
        await this.daysRepo.remove(day);
      }
    }

    trip.startDate = dto.startDate;
    trip.endDate = dto.endDate;
    await this.tripsRepo.save(trip);

    const keptDates = new Set(
      existingDays.filter((d) => newDates.includes(d.date)).map((d) => d.date),
    );
    const toAdd = newDates.filter((d) => !keptDates.has(d));
    let nextNum =
      existingDays.length > 0 ? Math.max(...existingDays.map((d) => d.dayNumber)) : 0;
    for (const date of toAdd) {
      nextNum += 1;
      await this.daysRepo.save(
        this.daysRepo.create({
          tripId,
          date,
          dayNumber: nextNum,
          title: `Ngày ${nextNum}`,
        }),
      );
    }

    return this.getTripDetail(tripId, userId);
  }

  async deleteTrip(tripId: string, userId: string) {
    await this.permissions.assertOwner(tripId, userId);
    await this.tripsRepo.delete({ id: tripId });
    return { deleted: true };
  }

  async updateStatus(tripId: string, userId: string, dto: UpdateTripStatusDto) {
    await this.permissions.assertCan(tripId, userId, 'edit_trip');
    const trip = await this.tripsRepo.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');

    if (dto.status === 'ACTIVE') {
      await this.prepareTripForActive(tripId, trip);
    }

    await this.tripsRepo.update({ id: tripId }, { status: dto.status });
    return this.getTripDetail(tripId, userId);
  }

  async bootstrapItinerary(tripId: string, userId: string) {
    await this.permissions.assertCan(tripId, userId, 'edit_trip');
    const trip = await this.tripsRepo.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.status !== 'ACTIVE' && trip.status !== 'PLANNING') {
      throw new BadRequestException('Trip must be planning or active');
    }
    await this.prepareTripForActive(tripId, trip);
    return this.getTripDetail(tripId, userId);
  }

  async duplicateTrip(tripId: string, userId: string) {
    const source = await this.getTripDetail(tripId, userId);
    return this.createTrip(userId, {
      title: `${source.title} (copy)`,
      description: source.description ?? undefined,
      destinationName: source.destinationName ?? undefined,
      startDate: source.startDate,
      endDate: source.endDate,
      totalBudget: source.totalBudget ?? undefined,
      isPublic: false,
    });
  }

  async getTripJournal(tripId: string, userId: string) {
    await this.permissions.assertCan(tripId, userId, 'view');
    const trip = await this.loadTripFull(tripId);
    if (!trip) throw new NotFoundException('Trip not found');
    const linkedPosts = await this.tripsRepo.manager.query(
      `SELECT tp.post_id AS postId, tp.linked_at AS linkedAt, p.title AS title
       FROM trip_posts tp
       INNER JOIN posts p ON p.id = tp.post_id
       WHERE tp.trip_id = @0
       ORDER BY tp.linked_at DESC`,
      [tripId],
    );
    const days = (trip.days ?? []).sort((a, b) => a.dayNumber - b.dayNumber).map((day) => ({
      id: day.id,
      dayNumber: day.dayNumber,
      date: day.date,
      stops: (day.stops ?? [])
        .filter((s) => s.status === 'VISITED' || s.status === 'VISITING')
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((s) => ({
          stopId: s.id,
          name: s.location?.name ?? s.customName ?? 'Stop',
          status: s.status,
          visitedAt: s.visitedAt,
        })),
      posts: linkedPosts,
    }));
    return { tripId, days };
  }

  async recalculateBudget(tripId: string) {
    const stops = await this.tripsRepo.manager.query(
      `SELECT COALESCE(SUM(actual_spent), 0) AS stopSpent,
              COALESCE(SUM(budget_estimate), 0) AS stopEst
       FROM trip_stops ts
       INNER JOIN trip_days td ON td.id = ts.trip_day_id
       WHERE td.trip_id = @0`,
      [tripId],
    );
    const accom = await this.accomRepo.find({ where: { tripId } });
    let accomSpent = 0;
    let accomEst = 0;
    for (const a of accom) {
      const nights =
        (new Date(a.checkOut).getTime() - new Date(a.checkIn).getTime()) / 86400000;
      const p = a.pricePerNight ? Number(a.pricePerNight) : 0;
      accomSpent += p * nights;
      accomEst += p * nights;
    }
    const row = stops[0] ?? { stopSpent: 0, stopEst: 0 };
    await this.tripsRepo.update(
      { id: tripId },
      {
        actualBudget: String(Number(row.stopSpent) + accomSpent),
        totalBudget: String(Number(row.stopEst) + accomEst),
      },
    );
  }

  private async prepareTripForActive(tripId: string, trip: TripEntity) {
    let days = await this.daysRepo.find({ where: { tripId }, order: { dayNumber: 'ASC' } });
    if (!days.length) {
      await this.generateDays(tripId, trip.startDate, trip.endDate);
      days = await this.daysRepo.find({ where: { tripId }, order: { dayNumber: 'ASC' } });
    }
    if (!days.length) return;

    const stopCount = await this.stopsRepo.count({
      where: { tripDayId: In(days.map((d) => d.id)) },
    });
    if (stopCount === 0) {
      await this.bootstrapStopsFromRecommendationsOrAccommodation(tripId, days);
    }

  }

  private async bootstrapStopsFromRecommendationsOrAccommodation(
    tripId: string,
    days: TripDayEntity[],
  ) {
    const recs = await this.recRepo.find({
      where: { tripId, isDismissed: false },
      order: { score: 'DESC' },
      take: 6,
    });

    if (recs.length) {
      for (let i = 0; i < recs.length; i++) {
        const day = days[Math.min(Math.floor(i / 2), days.length - 1)];
        await this.stopsRepo.save(
          this.stopsRepo.create({
            tripDayId: day.id,
            locationId: recs[i].locationId,
            orderIndex: (i + 1) * 1000,
            status: 'PLANNED',
            transportMode: 'WALK',
          }),
        );
      }
      return;
    }

    const accom = await this.accomRepo.findOne({
      where: { tripId, isPrimary: true },
      relations: ['location'],
    });
    if (accom?.locationId) {
      await this.stopsRepo.save(
        this.stopsRepo.create({
          tripDayId: days[0].id,
          locationId: accom.locationId,
          orderIndex: 1000,
          status: 'PLANNED',
          transportMode: 'WALK',
        }),
      );
    }
  }

  private async generateDays(tripId: string, start: string, end: string) {
    const dates = eachDateInclusive(start, end);
    const entities = dates.map((date, i) =>
      this.daysRepo.create({
        tripId,
        date,
        dayNumber: i + 1,
        title: `Ngày ${i + 1}`,
      }),
    );
    await this.daysRepo.save(entities);
  }

  private async loadTripFull(tripId: string) {
    return this.tripsRepo.findOne({
      where: { id: tripId },
      relations: [
        'days',
        'days.stops',
        'days.stops.location',
        'days.stops.location.locationType',
        'members',
        'members.user',
        'members.user.memberProfile',
      ],
      order: {
        days: { dayNumber: 'ASC' },
      },
    }).then(async (trip) => {
      if (!trip) return null;
      const accom = await this.accomRepo.find({
        where: { tripId },
        relations: ['location', 'location.locationType'],
      });
      (trip as TripEntity & { accommodations: TripAccommodationEntity[] }).accommodations =
        accom;
      return trip as TripEntity & { accommodations: TripAccommodationEntity[] };
    });
  }
}
