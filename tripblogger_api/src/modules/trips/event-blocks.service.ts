import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationEntity } from '../locations/entities/location.entity';
import { EventBlockEntity } from './entities/event-block.entity';
import { TripAccommodationEntity } from './entities/trip-accommodation.entity';
import { TripDayEntity } from './entities/trip-day.entity';
import { TripEntity } from './entities/trip.entity';
import { TripPermissionsService } from './trip-permissions.service';
import { haversineKm } from './utils/haversine';
import { durationFor } from './cook/cook-itinerary';
import { mapLocation } from './trips.mapper';

@Injectable()
export class EventBlocksService {
  constructor(
    @InjectRepository(EventBlockEntity)
    private readonly blocksRepo: Repository<EventBlockEntity>,
    @InjectRepository(TripDayEntity)
    private readonly daysRepo: Repository<TripDayEntity>,
    @InjectRepository(LocationEntity)
    private readonly locationsRepo: Repository<LocationEntity>,
    @InjectRepository(TripEntity)
    private readonly tripsRepo: Repository<TripEntity>,
    @InjectRepository(TripAccommodationEntity)
    private readonly accomRepo: Repository<TripAccommodationEntity>,
    private readonly permissions: TripPermissionsService,
  ) {}

  async reorder(
    tripId: string,
    userId: string,
    items: { blockId: string; tripDayId: string | null; orderIndex: number }[],
  ) {
    await this.permissions.assertCan(tripId, userId, 'edit_stops');
    const blocks = await this.blocksRepo.find({ where: { tripId } });
    const byId = new Map(blocks.map((b) => [b.id, b]));

    for (const item of items) {
      const block = byId.get(item.blockId);
      if (!block) throw new NotFoundException(`Block ${item.blockId} not found`);
      if (block.status === 'DONE') {
        throw new BadRequestException('Cannot move DONE blocks');
      }
      block.tripDayId = item.tripDayId;
      block.orderIndex = item.orderIndex;
    }

    await this.blocksRepo.save([...byId.values()].filter((b) =>
      items.some((i) => i.blockId === b.id),
    ));
    await this.tripsRepo.update({ id: tripId }, { editMode: 'MANUAL' });
    return { ok: true };
  }

  async addBlock(
    tripId: string,
    userId: string,
    dto: {
      tripDayId?: string | null;
      locationId?: string;
      customName?: string;
      customAddress?: string;
      customLat?: number;
      customLng?: number;
      slotType?: 'POI' | 'FOOD' | 'STAY' | 'CUSTOM';
    },
  ) {
    await this.permissions.assertCan(tripId, userId, 'edit_stops');
    if (!dto.locationId && !dto.customName) {
      throw new BadRequestException('locationId or customName required');
    }

    let slotType = dto.slotType ?? 'CUSTOM';
    let plannedDurationMin = 60;
    if (dto.locationId) {
      const loc = await this.locationsRepo.findOne({ where: { id: dto.locationId } });
      if (!loc) throw new NotFoundException('Location not found');
      slotType = (loc.slotType as typeof slotType) ?? 'POI';
      plannedDurationMin = durationFor(slotType, loc.defaultDurationMin);
    }

    const maxOrder = await this.blocksRepo
      .createQueryBuilder('b')
      .select('MAX(b.order_index)', 'max')
      .where('b.trip_id = :tripId', { tripId })
      .andWhere(
        dto.tripDayId ? 'b.trip_day_id = :dayId' : 'b.trip_day_id IS NULL',
        dto.tripDayId ? { dayId: dto.tripDayId } : {},
      )
      .getRawOne<{ max: number | null }>();

    const block = await this.blocksRepo.save(
      this.blocksRepo.create({
        tripId,
        tripDayId: dto.tripDayId ?? null,
        orderIndex: (maxOrder?.max ?? -1) + 1,
        locationId: dto.locationId ?? null,
        customName: dto.customName ?? null,
        customAddress: dto.customAddress ?? null,
        customLat: dto.customLat != null ? String(dto.customLat) : null,
        customLng: dto.customLng != null ? String(dto.customLng) : null,
        slotType,
        source: 'MANUAL',
        plannedDurationMin,
        status: 'PLANNED',
      }),
    );
    await this.tripsRepo.update({ id: tripId }, { editMode: 'MANUAL' });
    return this.serialize(block);
  }

  async patchBlock(
    tripId: string,
    userId: string,
    blockId: string,
    dto: { status?: 'PLANNED' | 'SKIPPED'; customName?: string },
  ) {
    await this.permissions.assertCan(tripId, userId, 'edit_stops');
    const block = await this.blocksRepo.findOne({ where: { id: blockId, tripId } });
    if (!block) throw new NotFoundException('Block not found');
    if (block.status === 'DONE') throw new BadRequestException('Cannot patch DONE block');
    if (dto.status === 'SKIPPED') block.status = 'SKIPPED';
    if (dto.status === 'PLANNED') block.status = 'PLANNED';
    if (dto.customName !== undefined) block.customName = dto.customName;
    await this.blocksRepo.save(block);
    return this.serialize(block);
  }

  async deleteBlock(tripId: string, userId: string, blockId: string) {
    await this.permissions.assertCan(tripId, userId, 'edit_stops');
    const block = await this.blocksRepo.findOne({ where: { id: blockId, tripId } });
    if (!block) throw new NotFoundException('Block not found');
    if (block.status === 'DONE') {
      throw new BadRequestException('Cannot delete DONE block with check-in history');
    }
    await this.blocksRepo.remove(block);
    return { ok: true };
  }

  async swapCandidates(tripId: string, userId: string, blockId: string) {
    await this.permissions.assertCan(tripId, userId, 'view');
    const block = await this.blocksRepo.findOne({
      where: { id: blockId, tripId },
      relations: ['location'],
    });
    if (!block) throw new NotFoundException('Block not found');
    if (block.status !== 'PLANNED') {
      throw new BadRequestException('Only PLANNED blocks can be swapped');
    }

    const trip = await this.tripsRepo.findOne({ where: { id: tripId } });
    if (!trip?.destinationId) return { items: [] };

    const slotType = block.slotType === 'CUSTOM' ? 'POI' : block.slotType;

    let candidates = await this.locationsRepo.find({
      where: {
        destinationId: trip.destinationId,
        status: 'ACTIVE',
        slotType: slotType === 'STAY' ? 'STAY' : slotType,
      },
      order: { featuredRank: 'ASC' },
    });
    candidates = candidates.filter((l) => l.featuredRank != null && l.id !== block.locationId);

    const otherLocationIds = (
      await this.blocksRepo.find({ where: { tripId } })
    )
      .map((b) => b.locationId)
      .filter((id): id is string => !!id && id !== block.locationId);

    let filtered = candidates.filter((l) => !otherLocationIds.includes(l.id));
    if (filtered.length < 3) filtered = candidates;

    const anchor = await this.blockAnchor(block, tripId);
    const sorted = filtered
      .map((l) => ({
        location: l,
        distanceKm: haversineKm(anchor.lat, anchor.lng, Number(l.latitude), Number(l.longitude)),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 15);

    return {
      items: sorted.map((s) => ({
        ...mapLocation(s.location),
        slotType: s.location.slotType,
        distanceKm: Math.round(s.distanceKm * 100) / 100,
      })),
    };
  }

  async swap(
    tripId: string,
    userId: string,
    blockId: string,
    dto: {
      locationId?: string;
      customName?: string;
      customAddress?: string;
      customLat?: number;
      customLng?: number;
    },
  ) {
    await this.permissions.assertCan(tripId, userId, 'edit_stops');
    const block = await this.blocksRepo.findOne({ where: { id: blockId, tripId } });
    if (!block) throw new NotFoundException('Block not found');
    if (block.status !== 'PLANNED') {
      throw new BadRequestException('Only PLANNED blocks can be swapped');
    }
    if (!dto.locationId && !dto.customName) {
      throw new BadRequestException('locationId or customName required');
    }

    if (dto.locationId) {
      const loc = await this.locationsRepo.findOne({ where: { id: dto.locationId } });
      if (!loc) throw new NotFoundException('Location not found');
      block.locationId = loc.id;
      block.customName = null;
      block.customAddress = null;
      block.customLat = null;
      block.customLng = null;
      block.slotType = (loc.slotType as EventBlockEntity['slotType']) ?? 'POI';
      block.plannedDurationMin = durationFor(block.slotType, loc.defaultDurationMin);
    } else {
      block.locationId = null;
      block.customName = dto.customName ?? null;
      block.customAddress = dto.customAddress ?? null;
      block.customLat = dto.customLat != null ? String(dto.customLat) : null;
      block.customLng = dto.customLng != null ? String(dto.customLng) : null;
      block.slotType = 'CUSTOM';
      block.plannedDurationMin = 60;
    }
    block.source = 'SWAP';
    await this.blocksRepo.save(block);
    return this.serialize(await this.blocksRepo.findOne({
      where: { id: block.id },
      relations: ['location'],
    }) as EventBlockEntity);
  }

  private async blockAnchor(block: EventBlockEntity, tripId: string) {
    if (block.location) {
      return { lat: Number(block.location.latitude), lng: Number(block.location.longitude) };
    }
    if (block.customLat && block.customLng) {
      return { lat: Number(block.customLat), lng: Number(block.customLng) };
    }
    const accom = await this.accomRepo.findOne({
      where: { tripId, isPrimary: true },
      relations: ['location'],
    });
    if (accom?.location) {
      return { lat: Number(accom.location.latitude), lng: Number(accom.location.longitude) };
    }
    return { lat: 11.9404, lng: 108.4583 };
  }

  serialize(block: EventBlockEntity) {
    return {
      id: block.id,
      tripId: block.tripId,
      tripDayId: block.tripDayId,
      orderIndex: block.orderIndex,
      location: mapLocation(block.location),
      locationId: block.locationId,
      customName: block.customName,
      customAddress: block.customAddress,
      customLat: block.customLat ? Number(block.customLat) : null,
      customLng: block.customLng ? Number(block.customLng) : null,
      slotType: block.slotType,
      status: block.status,
      source: block.source,
      plannedDurationMin: block.plannedDurationMin,
    };
  }
}
