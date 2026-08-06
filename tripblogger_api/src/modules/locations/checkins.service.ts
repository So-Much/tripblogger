import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCheckinDto } from './dto/create-checkin.dto';
import { LocationEntity } from './entities/location.entity';
import { UserCheckinEntity } from './entities/user-checkin.entity';

export type CheckinItem = {
  id: string;
  locationId: string;
  latitude: number;
  longitude: number;
  privacyLevel: string;
  checkinTime: string;
  location?: { id: string; name: string; address: string | null };
};

@Injectable()
export class CheckinsService {
  constructor(
    @InjectRepository(UserCheckinEntity)
    private readonly checkinsRepo: Repository<UserCheckinEntity>,
    @InjectRepository(LocationEntity)
    private readonly locationsRepo: Repository<LocationEntity>,
  ) {}

  async listMine(
    userId: string,
    locationId?: string,
    limit = 20,
  ): Promise<{ items: CheckinItem[] }> {
    const cap = Math.min(limit, 50);
    const qb = this.checkinsRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.location', 'loc')
      .where('c.user_id = :userId', { userId })
      .orderBy('c.checkin_time', 'DESC')
      .take(cap);

    if (locationId) {
      qb.andWhere('c.location_id = :locationId', { locationId });
    }

    const rows = await qb.getMany();
    return { items: rows.map((c) => this.mapCheckin(c)) };
  }

  async create(userId: string, dto: CreateCheckinDto): Promise<CheckinItem> {
    const loc = await this.locationsRepo.findOne({ where: { id: dto.locationId } });
    if (!loc) throw new NotFoundException('Location not found');

    const saved = await this.checkinsRepo.save(
      this.checkinsRepo.create({
        userId,
        locationId: dto.locationId,
        latitude: String(dto.latitude),
        longitude: String(dto.longitude),
        privacyLevel: dto.privacyLevel ?? 'PUBLIC',
        checkinTime: new Date(),
      }),
    );

    const full = await this.checkinsRepo.findOne({
      where: { id: saved.id },
      relations: ['location'],
    });
    return this.mapCheckin(full!);
  }

  private mapCheckin(c: UserCheckinEntity): CheckinItem {
    return {
      id: c.id,
      locationId: c.locationId,
      latitude: Number(c.latitude),
      longitude: Number(c.longitude),
      privacyLevel: c.privacyLevel,
      checkinTime: c.checkinTime.toISOString(),
      location: c.location
        ? {
            id: c.location.id,
            name: c.location.name,
            address: c.location.address,
          }
        : undefined,
    };
  }
}
