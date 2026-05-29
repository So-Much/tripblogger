import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAccommodationDto } from './dto/trip.dto';
import { TripAccommodationEntity } from './entities/trip-accommodation.entity';
import { TripPermissionsService } from './trip-permissions.service';
import { TripsService } from './trips.service';
import { mapAccommodation } from './trips.mapper';
import { RecommendationService } from './recommendation.service';

@Injectable()
export class TripAccommodationsService {
  constructor(
    @InjectRepository(TripAccommodationEntity)
    private readonly accomRepo: Repository<TripAccommodationEntity>,
    private readonly permissions: TripPermissionsService,
    private readonly tripsService: TripsService,
    private readonly recommendationService: RecommendationService,
  ) {}

  async list(tripId: string, userId: string) {
    await this.permissions.assertCan(tripId, userId, 'view');
    const items = await this.accomRepo.find({
      where: { tripId },
      relations: ['location', 'location.locationType'],
    });
    return items.map(mapAccommodation);
  }

  async create(tripId: string, userId: string, dto: CreateAccommodationDto) {
    await this.permissions.assertCan(tripId, userId, 'manage_accommodations');
    if (!dto.locationId && !(dto.customName && dto.customAddress)) {
      throw new BadRequestException('locationId or custom name+address required');
    }
    const entity = await this.accomRepo.save(
      this.accomRepo.create({
        tripId,
        locationId: dto.locationId ?? null,
        customName: dto.customName ?? null,
        customAddress: dto.customAddress ?? null,
        customLatitude: dto.lat != null ? String(dto.lat) : null,
        customLongitude: dto.lng != null ? String(dto.lng) : null,
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        roomType: dto.roomType ?? null,
        pricePerNight: dto.pricePerNight != null ? String(dto.pricePerNight) : null,
        isPrimary: dto.isPrimary ?? true,
      }),
    );
    await this.tripsService.recalculateBudget(tripId);
    const saved = await this.accomRepo.findOneOrFail({
      where: { id: entity.id },
      relations: ['location', 'location.locationType'],
    });
    void this.recommendationService.generate(tripId, saved.id, userId).catch(() => undefined);
    return mapAccommodation(saved);
  }

  async update(tripId: string, id: string, userId: string, dto: Partial<CreateAccommodationDto>) {
    await this.permissions.assertCan(tripId, userId, 'manage_accommodations');
    const accom = await this.accomRepo.findOne({ where: { id, tripId } });
    if (!accom) throw new NotFoundException('Accommodation not found');
    Object.assign(accom, {
      locationId: dto.locationId ?? accom.locationId,
      customName: dto.customName ?? accom.customName,
      checkIn: dto.checkIn ?? accom.checkIn,
      checkOut: dto.checkOut ?? accom.checkOut,
      pricePerNight:
        dto.pricePerNight != null ? String(dto.pricePerNight) : accom.pricePerNight,
    });
    await this.accomRepo.save(accom);
    await this.tripsService.recalculateBudget(tripId);
    return mapAccommodation(
      await this.accomRepo.findOneOrFail({
        where: { id },
        relations: ['location', 'location.locationType'],
      }),
    );
  }

  async remove(tripId: string, id: string, userId: string) {
    await this.permissions.assertCan(tripId, userId, 'manage_accommodations');
    await this.accomRepo.delete({ id, tripId });
    await this.tripsService.recalculateBudget(tripId);
    return { deleted: true };
  }
}
