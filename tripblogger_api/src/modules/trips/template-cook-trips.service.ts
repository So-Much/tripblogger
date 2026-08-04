import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LocationEntity } from '../locations/entities/location.entity';
import { DestinationEntity } from './entities/destination.entity';
import { EventBlockEntity } from './entities/event-block.entity';
import { TemplateBlockEntity } from './entities/template-block.entity';
import { TripAccommodationEntity } from './entities/trip-accommodation.entity';
import { TripCheckInEntity } from './entities/trip-check-in.entity';
import { TripDayEntity } from './entities/trip-day.entity';
import { TripEntity } from './entities/trip.entity';
import { TripMemberEntity } from './entities/trip-member.entity';
import { TripTemplateEntity } from './entities/trip-template.entity';
import { TripPermissionsService } from './trip-permissions.service';
import { mapAccommodation, mapLocation, mapTrip } from './trips.mapper';
import { EventBlocksService } from './event-blocks.service';
import { CreateFrameTripDto, SetAccommodationDto, SetPicksDto } from './dto/template-cook.dto';

@Injectable()
export class TemplateCookTripsService {
  constructor(
    @InjectRepository(TripEntity)
    private readonly tripsRepo: Repository<TripEntity>,
    @InjectRepository(TripMemberEntity)
    private readonly membersRepo: Repository<TripMemberEntity>,
    @InjectRepository(TripDayEntity)
    private readonly daysRepo: Repository<TripDayEntity>,
    @InjectRepository(DestinationEntity)
    private readonly destinationsRepo: Repository<DestinationEntity>,
    @InjectRepository(TripTemplateEntity)
    private readonly templatesRepo: Repository<TripTemplateEntity>,
    @InjectRepository(TemplateBlockEntity)
    private readonly templateBlocksRepo: Repository<TemplateBlockEntity>,
    @InjectRepository(TripAccommodationEntity)
    private readonly accomRepo: Repository<TripAccommodationEntity>,
    @InjectRepository(EventBlockEntity)
    private readonly blocksRepo: Repository<EventBlockEntity>,
    @InjectRepository(TripCheckInEntity)
    private readonly checkInsRepo: Repository<TripCheckInEntity>,
    @InjectRepository(LocationEntity)
    private readonly locationsRepo: Repository<LocationEntity>,
    private readonly permissions: TripPermissionsService,
    private readonly eventBlocksService: EventBlocksService,
  ) {}

  async createFromFrame(userId: string, dto: CreateFrameTripDto) {
    const dest = await this.destinationsRepo.findOne({
      where: { code: (dto.destinationCode || 'DALAT').toUpperCase(), status: 'ACTIVE' },
    });
    if (!dest) throw new NotFoundException('Destination not found');

    const nightCount = dto.nightCount;
    if (nightCount < 1 || nightCount > 30) {
      throw new BadRequestException('nightCount must be 1-30');
    }

    const startDate = dto.startDate;
    const endDate = addDays(startDate, nightCount);
    const title = dto.title?.trim() || `Đà Lạt ${nightCount}N${nightCount + 1}Đ`;

    let pickIds: string[] = [];
    let templateId: string | null = dto.templateId ?? null;
    if (templateId) {
      const template = await this.templatesRepo.findOne({
        where: { id: templateId, isPublished: true },
      });
      if (!template) throw new NotFoundException('Template not found');
      const blocks = await this.templateBlocksRepo.find({
        where: { templateId },
        order: { orderIndex: 'ASC' },
      });
      pickIds = blocks.map((b) => b.locationId);
    }

    const trip = await this.tripsRepo.save(
      this.tripsRepo.create({
        userId,
        title,
        description: null,
        destinationName: dest.name,
        destinationId: dest.id,
        templateId,
        nightCount,
        editMode: 'AUTO',
        pickLocationIds: JSON.stringify(pickIds),
        startDate,
        endDate,
        status: 'PLANNING',
        isPublic: false,
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

    const dayCount = nightCount + 1;
    const dayRows: TripDayEntity[] = [];
    for (let i = 0; i < dayCount; i++) {
      dayRows.push(
        this.daysRepo.create({
          tripId: trip.id,
          dayNumber: i + 1,
          date: addDays(startDate, i),
          title: `Ngày ${i + 1}`,
        }),
      );
    }
    await this.daysRepo.save(dayRows);

    await this.accomRepo.save(
      this.accomRepo.create({
        tripId: trip.id,
        mode: dto.vibe ? 'VIBE' : 'CUSTOM',
        vibe: dto.vibe ?? null,
        isPlaceholder: true,
        isPrimary: true,
        checkIn: startDate,
        checkOut: endDate,
        locationId: null,
        customName: null,
        customAddress: null,
      }),
    );

    return this.getEnrichedDetail(trip.id, userId);
  }

  async setPicks(tripId: string, userId: string, dto: SetPicksDto) {
    await this.permissions.assertCan(tripId, userId, 'edit_trip');
    const trip = await this.tripsRepo.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');

    const ids = [...new Set(dto.locationIds)];
    if (ids.length) {
      const found = await this.locationsRepo.find({
        where: { id: In(ids), status: 'ACTIVE' },
      });
      if (found.length !== ids.length) {
        throw new BadRequestException('Some locations are invalid');
      }
    }

    trip.pickLocationIds = JSON.stringify(ids);
    await this.tripsRepo.save(trip);
    return this.getEnrichedDetail(tripId, userId);
  }

  async setAccommodation(tripId: string, userId: string, dto: SetAccommodationDto) {
    await this.permissions.assertCan(tripId, userId, 'manage_accommodations');
    const trip = await this.tripsRepo.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');

    let accom = await this.accomRepo.findOne({ where: { tripId, isPrimary: true } });
    if (!accom) {
      accom = this.accomRepo.create({
        tripId,
        isPrimary: true,
        checkIn: trip.startDate,
        checkOut: trip.endDate,
      });
    }

    if (dto.mode === 'VIBE') {
      if (!dto.vibe || !dto.locationId) {
        throw new BadRequestException('vibe and locationId required for VIBE mode');
      }
      const loc = await this.locationsRepo.findOne({ where: { id: dto.locationId } });
      if (!loc) throw new NotFoundException('Location not found');
      accom.mode = 'VIBE';
      accom.vibe = dto.vibe;
      accom.locationId = loc.id;
      accom.customName = null;
      accom.customAddress = null;
      accom.customLatitude = null;
      accom.customLongitude = null;
      accom.isPlaceholder = false;
    } else {
      if (!dto.customName) throw new BadRequestException('customName required for CUSTOM mode');
      accom.mode = 'CUSTOM';
      accom.vibe = null;
      accom.locationId = null;
      accom.customName = dto.customName;
      accom.customAddress = dto.customAddress ?? null;
      accom.customLatitude = dto.customLat != null ? String(dto.customLat) : null;
      accom.customLongitude = dto.customLng != null ? String(dto.customLng) : null;
      accom.isPlaceholder = false;
    }

    await this.accomRepo.save(accom);
    return this.getEnrichedDetail(tripId, userId);
  }

  async getEnrichedDetail(tripId: string, userId: string) {
    await this.permissions.assertCan(tripId, userId, 'view');
    const trip = await this.tripsRepo.findOne({
      where: { id: tripId },
      relations: ['destination', 'days', 'members', 'members.user', 'members.user.memberProfile'],
      order: { days: { dayNumber: 'ASC' } },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    const accommodations = await this.accomRepo.find({
      where: { tripId },
      relations: ['location', 'location.locationType'],
    });
    const blocks = await this.blocksRepo.find({
      where: { tripId },
      relations: ['location', 'location.locationType'],
      order: { orderIndex: 'ASC' },
    });
    const checkInCount = await this.checkInsRepo.count({ where: { tripId } });
    const pickIds = parsePickIds(trip.pickLocationIds);
    const pickLocations = pickIds.length
      ? await this.locationsRepo.find({ where: { id: In(pickIds) } })
      : [];

    const base = mapTrip(
      { ...trip, accommodations } as TripEntity & { accommodations: TripAccommodationEntity[] },
      true,
    );

    const eventBlocks = blocks.map((b) => this.eventBlocksService.serialize(b));
    const byDay: Record<string, typeof eventBlocks> = {};
    const unscheduled: typeof eventBlocks = [];
    for (const b of eventBlocks) {
      if (!b.tripDayId) unscheduled.push(b);
      else {
        byDay[b.tripDayId] = byDay[b.tripDayId] ?? [];
        byDay[b.tripDayId].push(b);
      }
    }

    return {
      ...base,
      destinationId: trip.destinationId,
      destination: trip.destination
        ? {
            id: trip.destination.id,
            code: trip.destination.code,
            name: trip.destination.name,
            centroidLat: Number(trip.destination.centroidLat),
            centroidLng: Number(trip.destination.centroidLng),
          }
        : null,
      templateId: trip.templateId,
      nightCount: trip.nightCount,
      editMode: trip.editMode,
      pickLocationIds: pickIds,
      picks: pickLocations.map(mapLocation),
      accommodations: accommodations.map((a) => ({
        ...mapAccommodation(a),
        mode: a.mode,
        vibe: a.vibe,
        isPlaceholder: a.isPlaceholder,
        customLatitude: a.customLatitude ? Number(a.customLatitude) : null,
        customLongitude: a.customLongitude ? Number(a.customLongitude) : null,
      })),
      eventBlocks,
      days: (trip.days ?? [])
        .sort((a, b) => a.dayNumber - b.dayNumber)
        .map((d) => ({
          id: d.id,
          date: d.date,
          dayNumber: d.dayNumber,
          title: d.title,
          eventBlocks: byDay[d.id] ?? [],
        })),
      unscheduled,
      checkInCount,
    };
  }
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
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
