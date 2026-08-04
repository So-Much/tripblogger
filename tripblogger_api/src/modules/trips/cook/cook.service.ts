import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LocationEntity } from '../../locations/entities/location.entity';
import { DestinationEntity } from '../entities/destination.entity';
import { EventBlockEntity } from '../entities/event-block.entity';
import { TripAccommodationEntity } from '../entities/trip-accommodation.entity';
import { TripDayEntity } from '../entities/trip-day.entity';
import { TripEntity } from '../entities/trip.entity';
import { TripPermissionsService } from '../trip-permissions.service';
import {
  CookLocationInput,
  cookItinerary,
  durationFor,
} from './cook-itinerary';

@Injectable()
export class CookService {
  constructor(
    @InjectRepository(TripEntity)
    private readonly tripsRepo: Repository<TripEntity>,
    @InjectRepository(TripDayEntity)
    private readonly daysRepo: Repository<TripDayEntity>,
    @InjectRepository(EventBlockEntity)
    private readonly blocksRepo: Repository<EventBlockEntity>,
    @InjectRepository(LocationEntity)
    private readonly locationsRepo: Repository<LocationEntity>,
    @InjectRepository(TripAccommodationEntity)
    private readonly accomRepo: Repository<TripAccommodationEntity>,
    @InjectRepository(DestinationEntity)
    private readonly destinationsRepo: Repository<DestinationEntity>,
    private readonly permissions: TripPermissionsService,
  ) {}

  async cook(tripId: string, userId: string) {
    await this.permissions.assertCan(tripId, userId, 'edit_stops');
    const trip = await this.tripsRepo.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');

    let days = await this.daysRepo.find({
      where: { tripId },
      order: { dayNumber: 'ASC' },
    });

    const nightCount = trip.nightCount ?? Math.max(1, dayDiff(trip.startDate, trip.endDate));
    const dayCount = nightCount + 1;
    if (days.length !== dayCount) {
      days = await this.ensureDays(trip, dayCount);
    }

    const pickIds = parsePickIds(trip.pickLocationIds);
    const locations = pickIds.length
      ? await this.locationsRepo.find({ where: { id: In(pickIds), status: 'ACTIVE' } })
      : [];
    const locById = new Map(locations.map((l) => [l.id, l]));

    const templateIds = new Set<string>();
    if (trip.templateId) {
      // locations from template prefill keep TEMPLATE source if still in picks
      // (template block lookup optional — default PICK unless we mark later)
    }

    const picks: CookLocationInput[] = pickIds
      .map((id) => locById.get(id))
      .filter((l): l is LocationEntity => !!l)
      .map((l) => ({
        locationId: l.id,
        lat: Number(l.latitude),
        lng: Number(l.longitude),
        slotType: (l.slotType as CookLocationInput['slotType']) ?? 'POI',
        defaultDurationMin: l.defaultDurationMin,
        source: templateIds.has(l.id) ? ('TEMPLATE' as const) : ('PICK' as const),
      }));

    const existingBlocks = await this.blocksRepo.find({ where: { tripId } });
    const doneBlocks = existingBlocks.filter((b) => b.status === 'DONE');
    const skippedBlocks = existingBlocks.filter((b) => b.status === 'SKIPPED');

    const anchor = await this.resolveAnchor(trip);

    const result = cookItinerary({
      days: days.map((d) => ({ id: d.id, dayNumber: d.dayNumber, date: d.date })),
      picks,
      anchor,
      doneBlocks: doneBlocks.map((b) => ({
        id: b.id,
        locationId: b.locationId,
        tripDayId: b.tripDayId,
        orderIndex: b.orderIndex,
      })),
    });

    // Delete PLANNED only; keep DONE + SKIPPED
    const planned = existingBlocks.filter((b) => b.status === 'PLANNED');
    if (planned.length) {
      await this.blocksRepo.remove(planned);
    }

    const toSave = result.blocks.map((b) =>
      this.blocksRepo.create({
        tripId,
        tripDayId: b.tripDayId,
        orderIndex: b.orderIndex,
        locationId: b.locationId,
        slotType: b.slotType,
        source: b.source,
        plannedDurationMin: b.plannedDurationMin,
        status: 'PLANNED',
      }),
    );
    if (toSave.length) await this.blocksRepo.save(toSave);

    // Keep skipped as-is (already in DB)
    void skippedBlocks;
    void durationFor;

    return {
      emptyPlan: result.emptyPlan,
      unscheduledCount: result.unscheduled.length,
      blockCount: toSave.length + doneBlocks.length + skippedBlocks.length,
    };
  }

  private async resolveAnchor(trip: TripEntity): Promise<{ lat: number; lng: number }> {
    const accom = await this.accomRepo.findOne({
      where: { tripId: trip.id, isPrimary: true },
      relations: ['location'],
    });
    if (accom?.location) {
      return { lat: Number(accom.location.latitude), lng: Number(accom.location.longitude) };
    }
    if (accom?.customLatitude && accom?.customLongitude) {
      return { lat: Number(accom.customLatitude), lng: Number(accom.customLongitude) };
    }
    if (trip.destinationId) {
      const dest = await this.destinationsRepo.findOne({ where: { id: trip.destinationId } });
      if (dest) {
        return { lat: Number(dest.centroidLat), lng: Number(dest.centroidLng) };
      }
    }
    return { lat: 11.9404, lng: 108.4583 }; // Đà Lạt fallback
  }

  private async ensureDays(trip: TripEntity, dayCount: number): Promise<TripDayEntity[]> {
    await this.daysRepo.delete({ tripId: trip.id });
    const start = new Date(trip.startDate + 'T00:00:00Z');
    const rows: TripDayEntity[] = [];
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const date = d.toISOString().slice(0, 10);
      rows.push(
        this.daysRepo.create({
          tripId: trip.id,
          dayNumber: i + 1,
          date,
        }),
      );
    }
    return this.daysRepo.save(rows);
  }
}

function parsePickIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function dayDiff(start: string, end: string): number {
  const a = new Date(start + 'T00:00:00Z').getTime();
  const b = new Date(end + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86400000);
}
