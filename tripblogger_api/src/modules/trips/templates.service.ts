import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DestinationEntity } from './entities/destination.entity';
import { TripTemplateEntity } from './entities/trip-template.entity';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(TripTemplateEntity)
    private readonly templatesRepo: Repository<TripTemplateEntity>,
    @InjectRepository(DestinationEntity)
    private readonly destinationsRepo: Repository<DestinationEntity>,
  ) {}

  async list(destinationCode?: string) {
    const qb = this.templatesRepo
      .createQueryBuilder('t')
      .innerJoinAndSelect('t.destination', 'd')
      .where('t.is_published = :pub', { pub: true });

    if (destinationCode) {
      qb.andWhere('d.code = :code', { code: destinationCode.toUpperCase() });
    }

    const items = await qb.orderBy('t.title', 'ASC').getMany();
    return items.map((t) => this.mapSummary(t));
  }

  async getById(id: string) {
    const t = await this.templatesRepo.findOne({
      where: { id, isPublished: true },
      relations: ['destination', 'blocks', 'blocks.location'],
      order: { blocks: { orderIndex: 'ASC' } },
    });
    if (!t) throw new NotFoundException('Template not found');
    return {
      ...this.mapSummary(t),
      blocks: (t.blocks ?? [])
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((b) => ({
          id: b.id,
          orderIndex: b.orderIndex,
          suggestedDayHint: b.suggestedDayHint,
          location: b.location
            ? {
                id: b.location.id,
                name: b.location.name,
                address: b.location.address,
                latitude: Number(b.location.latitude),
                longitude: Number(b.location.longitude),
                slotType: b.location.slotType,
                featuredRank: b.location.featuredRank,
                defaultDurationMin: b.location.defaultDurationMin,
              }
            : null,
        })),
    };
  }

  private mapSummary(t: TripTemplateEntity) {
    return {
      id: t.id,
      title: t.title,
      nightCount: t.nightCount,
      styleTags: parseJsonArray(t.styleTags),
      summary: t.summary,
      destination: t.destination
        ? {
            id: t.destination.id,
            code: t.destination.code,
            name: t.destination.name,
          }
        : null,
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
