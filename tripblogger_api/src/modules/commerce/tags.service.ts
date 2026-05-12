import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { TagEntity } from './entities/tag.entity';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(TagEntity)
    private readonly tagRepo: Repository<TagEntity>,
  ) {}

  async search(query?: string) {
    if (!query?.trim()) {
      return this.tagRepo.find({ take: 20, order: { name: 'ASC' } });
    }
    const q = query.trim();
    return this.tagRepo.find({
      where: { name: Like(`%${q}%`) },
      take: 20,
      order: { name: 'ASC' },
    });
  }

  async findOrCreate(rawName: string): Promise<TagEntity> {
    const normalized = rawName.trim().toLowerCase();
    if (!normalized) throw new BadRequestException('Empty tag');
    let tag = await this.tagRepo.findOne({ where: { name: normalized } });
    if (!tag) {
      tag = this.tagRepo.create({ name: normalized });
      tag = await this.tagRepo.save(tag);
    }
    return tag;
  }
}
