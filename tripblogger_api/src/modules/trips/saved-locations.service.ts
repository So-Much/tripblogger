import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaveLocationDto } from './dto/trip.dto';
import { SavedLocationEntity } from './entities/saved-location.entity';

@Injectable()
export class SavedLocationsService {
  constructor(
    @InjectRepository(SavedLocationEntity)
    private readonly savedRepo: Repository<SavedLocationEntity>,
  ) {}

  async listGrouped(userId: string) {
    const items = await this.savedRepo.find({
      where: { userId },
      relations: ['location', 'location.locationType'],
      order: { createdAt: 'DESC' },
    });
    const groups = new Map<string, typeof items>();
    for (const item of items) {
      const key = item.collectionName;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return Array.from(groups.entries()).map(([collectionName, entries]) => ({
      collectionName,
      locations: entries.map((e) => ({
        id: e.id,
        locationId: e.locationId,
        note: e.note,
        location: {
          id: e.location.id,
          name: e.location.name,
          address: e.location.address,
          latitude: Number(e.location.latitude),
          longitude: Number(e.location.longitude),
        },
      })),
    }));
  }

  async save(userId: string, dto: SaveLocationDto) {
    try {
      const saved = await this.savedRepo.save(
        this.savedRepo.create({
          userId,
          locationId: dto.locationId,
          collectionName: dto.collectionName ?? 'Mặc định',
          note: dto.note ?? null,
        }),
      );
      return saved;
    } catch {
      throw new ConflictException('Location already saved');
    }
  }

  async update(userId: string, id: string, dto: Partial<SaveLocationDto>) {
    const row = await this.savedRepo.findOne({ where: { id, userId } });
    if (!row) throw new NotFoundException('Saved location not found');
    if (dto.collectionName) row.collectionName = dto.collectionName;
    if (dto.note !== undefined) row.note = dto.note;
    return this.savedRepo.save(row);
  }

  async remove(userId: string, id: string) {
    await this.savedRepo.delete({ id, userId });
    return { deleted: true };
  }

  async listCollections(userId: string) {
    const rows = await this.savedRepo
      .createQueryBuilder('s')
      .select('DISTINCT s.collection_name', 'collectionName')
      .where('s.user_id = :userId', { userId })
      .getRawMany();
    return rows.map((r) => r.collectionName);
  }
}
