import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckinsService } from '../locations/checkins.service';
import { CreateStopDto, ReorderStopsDto, UpdateStopDto } from './dto/trip.dto';
import { TripDayEntity } from './entities/trip-day.entity';
import { TripStopEntity } from './entities/trip-stop.entity';
import { TripPermissionsService } from './trip-permissions.service';
import { TripsService } from './trips.service';
import { mapStop } from './trips.mapper';
import { haversineKm } from './utils/haversine';

@Injectable()
export class TripStopsService {
  constructor(
    @InjectRepository(TripStopEntity)
    private readonly stopsRepo: Repository<TripStopEntity>,
    @InjectRepository(TripDayEntity)
    private readonly daysRepo: Repository<TripDayEntity>,
    private readonly permissions: TripPermissionsService,
    private readonly tripsService: TripsService,
    private readonly checkinsService: CheckinsService,
  ) {}

  async listByDay(tripId: string, dayId: string, userId: string) {
    await this.permissions.assertCan(tripId, userId, 'view');
    const day = await this.daysRepo.findOne({
      where: { id: dayId, tripId },
      relations: ['stops', 'stops.location', 'stops.location.locationType'],
    });
    if (!day) throw new NotFoundException('Day not found');
    return day.stops.sort((a, b) => a.orderIndex - b.orderIndex).map(mapStop);
  }

  async addStop(tripId: string, dayId: string, userId: string, dto: CreateStopDto) {
    await this.permissions.assertCan(tripId, userId, 'edit_stops');
    const day = await this.daysRepo.findOne({ where: { id: dayId, tripId } });
    if (!day) throw new NotFoundException('Day not found');
    if (!dto.locationId && !dto.customName) {
      throw new BadRequestException('locationId or customName required');
    }

    const maxRow = await this.stopsRepo
      .createQueryBuilder('s')
      .select('MAX(s.order_index)', 'max')
      .where('s.trip_day_id = :dayId', { dayId })
      .getRawOne<{ max: number | null }>();
    const orderIndex = dto.orderIndex ?? (Number(maxRow?.max ?? 0) + 1000);

    const stop = await this.stopsRepo.save(
      this.stopsRepo.create({
        tripDayId: dayId,
        locationId: dto.locationId ?? null,
        customName: dto.customName ?? null,
        customAddress: dto.customAddress ?? null,
        customLatitude: dto.lat != null ? String(dto.lat) : null,
        customLongitude: dto.lng != null ? String(dto.lng) : null,
        orderIndex,
        arrivalTime: dto.arrivalTime ?? null,
        durationMinutes: dto.durationMinutes ?? null,
        transportMode: dto.transportMode ?? 'WALK',
        budgetEstimate: dto.budgetEstimate != null ? String(dto.budgetEstimate) : null,
        notes: dto.notes ?? null,
        status: 'PLANNED',
      }),
    );

    await this.recalcDayDistances(dayId);
    await this.tripsService.recalculateBudget(tripId);
    return this.getStop(stop.id, userId);
  }

  async updateStop(tripId: string, stopId: string, userId: string, dto: UpdateStopDto) {
    await this.permissions.assertCan(tripId, userId, 'edit_stops');
    const stop = await this.findStopInTrip(tripId, stopId);
    if (dto.status) {
      stop.status = dto.status;
      if (dto.status === 'VISITED') stop.visitedAt = new Date();
      if (dto.status === 'VISITING' && !stop.visitedAt) stop.visitedAt = new Date();
    }
    if (dto.actualSpent != null) stop.actualSpent = String(dto.actualSpent);
    if (dto.notes !== undefined) stop.notes = dto.notes;
    if (dto.arrivalTime !== undefined) stop.arrivalTime = dto.arrivalTime;
    if (dto.durationMinutes !== undefined) stop.durationMinutes = dto.durationMinutes;
    await this.stopsRepo.save(stop);
    await this.tripsService.recalculateBudget(tripId);
    return this.getStop(stopId, userId);
  }

  async deleteStop(tripId: string, stopId: string, userId: string) {
    await this.permissions.assertCan(tripId, userId, 'edit_stops');
    const stop = await this.findStopInTrip(tripId, stopId);
    const dayId = stop.tripDayId;
    await this.stopsRepo.remove(stop);
    await this.recalcDayDistances(dayId);
    await this.tripsService.recalculateBudget(tripId);
    return { deleted: true };
  }

  async reorder(tripId: string, userId: string, dto: ReorderStopsDto) {
    await this.permissions.assertCan(tripId, userId, 'edit_stops');
    for (const item of dto.stops) {
      const stop = await this.findStopInTrip(tripId, item.id);
      stop.orderIndex = item.orderIndex;
      await this.stopsRepo.save(stop);
    }
    return { ok: true };
  }

  async checkin(tripId: string, stopId: string, userId: string) {
    const stop = await this.findStopInTrip(tripId, stopId);
    const result = await this.updateStop(tripId, stopId, userId, { status: 'VISITING' });

    if (stop.locationId) {
      const lat = stop.location
        ? Number(stop.location.latitude)
        : stop.customLatitude
          ? Number(stop.customLatitude)
          : null;
      const lng = stop.location
        ? Number(stop.location.longitude)
        : stop.customLongitude
          ? Number(stop.customLongitude)
          : null;
      if (lat != null && lng != null) {
        await this.checkinsService.recordFromTripStop(
          userId,
          stop.locationId,
          lat,
          lng,
        );
      }
    }

    return result;
  }

  async complete(tripId: string, stopId: string, userId: string) {
    return this.updateStop(tripId, stopId, userId, { status: 'VISITED' });
  }

  async skip(tripId: string, stopId: string, userId: string) {
    return this.updateStop(tripId, stopId, userId, { status: 'SKIPPED' });
  }

  private async getStop(stopId: string, userId: string) {
    const stop = await this.stopsRepo.findOne({
      where: { id: stopId },
      relations: ['location', 'location.locationType', 'tripDay'],
    });
    if (!stop?.tripDay) throw new NotFoundException('Stop not found');
    await this.permissions.assertCan(stop.tripDay.tripId, userId, 'view');
    return mapStop(stop);
  }

  private async findStopInTrip(tripId: string, stopId: string) {
    const stop = await this.stopsRepo.findOne({
      where: { id: stopId },
      relations: ['tripDay', 'location'],
    });
    if (!stop || stop.tripDay?.tripId !== tripId) throw new NotFoundException('Stop not found');
    return stop;
  }

  private async recalcDayDistances(dayId: string) {
    const stops = await this.stopsRepo.find({
      where: { tripDayId: dayId },
      relations: ['location'],
      order: { orderIndex: 'ASC' },
    });
    let prevLat: number | null = null;
    let prevLng: number | null = null;
    let totalKm = 0;
    for (const s of stops) {
      const lat = s.location
        ? Number(s.location.latitude)
        : s.customLatitude
          ? Number(s.customLatitude)
          : null;
      const lng = s.location
        ? Number(s.location.longitude)
        : s.customLongitude
          ? Number(s.customLongitude)
          : null;
      if (prevLat != null && lat != null && lng != null && prevLng != null) {
        const km = haversineKm(prevLat, prevLng, lat, lng);
        s.distanceFromPrevKm = String(Number(km.toFixed(2)));
        totalKm += km;
        await this.stopsRepo.save(s);
      }
      if (lat != null && lng != null) {
        prevLat = lat;
        prevLng = lng;
      }
    }
    await this.daysRepo.update({ id: dayId }, { totalDistanceKm: String(Number(totalKm.toFixed(2))) });
  }
}
