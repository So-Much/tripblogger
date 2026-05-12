import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from './entities/category.entity';
import { ProductEntity } from './entities/product.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
  ) {}

  async findAll() {
    return this.categoryRepo.find({ order: { name: 'ASC' } });
  }

  async create(dto: CreateCategoryDto) {
    const existed = await this.categoryRepo.findOne({ where: { name: dto.name } });
    if (existed) throw new BadRequestException('Category already exists');
    return this.categoryRepo.save(this.categoryRepo.create({ name: dto.name }));
  }

  async update(id: string, dto: CreateCategoryDto) {
    const entity = await this.categoryRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Category not found');
    entity.name = dto.name;
    return this.categoryRepo.save(entity);
  }

  async remove(id: string) {
    const entity = await this.categoryRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Category not found');
    const count = await this.productRepo.count({ where: { categoryId: id } });
    if (count > 0) throw new BadRequestException('Category has products');
    await this.categoryRepo.remove(entity);
    return { ok: true };
  }
}
