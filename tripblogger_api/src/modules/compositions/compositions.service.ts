import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompositionEntity } from './entities/composition.entity';

@Injectable()
export class CompositionsService {
  constructor(
    @InjectRepository(CompositionEntity)
    private readonly compositionsRepo: Repository<CompositionEntity>,
  ) {}

  async list(activeOnly = true) {
    const where = activeOnly ? { isActive: true } : {};
    const rows = await this.compositionsRepo.find({
      where,
      order: { name: 'ASC' },
    });
    return {
      items: rows.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        thumbnailUrl: c.thumbnailUrl,
        isActive: c.isActive,
      })),
    };
  }

  async findBySlug(slug: string) {
    const composition = await this.compositionsRepo.findOne({
      where: { slug, isActive: true },
      relations: ['guides', 'overlays'],
    });
    if (!composition) throw new NotFoundException('Composition not found');

    const guides = [...(composition.guides ?? [])].sort((a, b) => a.stepOrder - b.stepOrder);
    const overlays = composition.overlays ?? [];

    return {
      id: composition.id,
      name: composition.name,
      slug: composition.slug,
      description: composition.description,
      thumbnailUrl: composition.thumbnailUrl,
      isActive: composition.isActive,
      guides: guides.map((g) => ({
        stepOrder: g.stepOrder,
        instruction: g.instruction,
        triggerCondition: g.triggerCondition,
      })),
      overlays: overlays.map((o) => ({
        aspectRatio: o.aspectRatio,
        svgPath: o.svgPath,
      })),
    };
  }
}
