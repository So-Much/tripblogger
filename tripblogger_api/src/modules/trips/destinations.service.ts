import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DestinationEntity } from './entities/destination.entity';
import { LocationEntity } from '../locations/entities/location.entity';

@Injectable()
export class DestinationsService {
  constructor(
    @InjectRepository(DestinationEntity)
    private readonly destinationsRepo: Repository<DestinationEntity>,
    @InjectRepository(LocationEntity)
    private readonly locationsRepo: Repository<LocationEntity>,
  ) {}

  async list() {
    const items = await this.destinationsRepo.find({
      where: { status: 'ACTIVE' },
      order: { name: 'ASC' },
    });
    return items.map((d) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      centroidLat: Number(d.centroidLat),
      centroidLng: Number(d.centroidLng),
    }));
  }

  async featuredLocations(code: string, slotType?: string) {
    const dest = await this.destinationsRepo.findOne({
      where: { code: code.toUpperCase(), status: 'ACTIVE' },
    });
    if (!dest) return { destination: null, items: [] };

    const qb = this.locationsRepo
      .createQueryBuilder('l')
      .where('l.destination_id = :destinationId', { destinationId: dest.id })
      .andWhere('l.status = :status', { status: 'ACTIVE' })
      .andWhere('l.featured_rank IS NOT NULL')
      .orderBy('l.featured_rank', 'ASC');

    if (slotType) {
      qb.andWhere('l.slot_type = :slotType', { slotType: slotType.toUpperCase() });
    }

    const items = await qb.getMany();
    return {
      destination: {
        id: dest.id,
        code: dest.code,
        name: dest.name,
        centroidLat: Number(dest.centroidLat),
        centroidLng: Number(dest.centroidLng),
      },
      items: items.map((l) => ({
        id: l.id,
        name: l.name,
        address: l.address,
        latitude: Number(l.latitude),
        longitude: Number(l.longitude),
        slotType: l.slotType,
        featuredRank: l.featuredRank,
        defaultDurationMin: l.defaultDurationMin,
        vibeTags: parseJsonArray(l.vibeTags),
      })),
    };
  }
}

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
