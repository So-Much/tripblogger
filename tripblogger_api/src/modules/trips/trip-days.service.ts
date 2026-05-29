import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateTripDayDto } from './dto/trip.dto';
import { TripDayEntity } from './entities/trip-day.entity';
import { TripPermissionsService } from './trip-permissions.service';
import { mapDay } from './trips.mapper';

@Injectable()
export class TripDaysService {
  constructor(
    @InjectRepository(TripDayEntity)
    private readonly daysRepo: Repository<TripDayEntity>,
    private readonly permissions: TripPermissionsService,
  ) {}

  async list(tripId: string, userId: string) {
    await this.permissions.assertCan(tripId, userId, 'view');
    const days = await this.daysRepo.find({
      where: { tripId },
      relations: ['stops', 'stops.location', 'stops.location.locationType'],
      order: { dayNumber: 'ASC' },
    });
    return days.map(mapDay);
  }

  async getOne(tripId: string, dayId: string, userId: string) {
    await this.permissions.assertCan(tripId, userId, 'view');
    const day = await this.daysRepo.findOne({
      where: { id: dayId, tripId },
      relations: ['stops', 'stops.location', 'stops.location.locationType'],
    });
    if (!day) throw new NotFoundException('Day not found');
    return mapDay(day);
  }

  async update(tripId: string, dayId: string, userId: string, dto: UpdateTripDayDto) {
    await this.permissions.assertCan(tripId, userId, 'edit_trip');
    const day = await this.daysRepo.findOne({ where: { id: dayId, tripId } });
    if (!day) throw new NotFoundException('Day not found');
    if (dto.title !== undefined) day.title = dto.title;
    if (dto.theme !== undefined) day.theme = dto.theme;
    if (dto.notes !== undefined) day.notes = dto.notes;
    await this.daysRepo.save(day);
    return mapDay(
      await this.daysRepo.findOneOrFail({
        where: { id: dayId },
        relations: ['stops', 'stops.location', 'stops.location.locationType'],
      }),
    );
  }
}
