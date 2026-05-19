import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import sanitizeHtml from 'sanitize-html';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { MemberProfileEntity } from '../users/entities/member-profile.entity';
import { MediaResolver } from '../posts/media.resolver';
import { parseProductMediaJson } from './commerce-media.util';
import { DEFAULT_ANALYTICS_JSON, DEFAULT_STOCK_UNIT } from './constants';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryMyProductsDto, QueryPublicProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CategoryEntity } from './entities/category.entity';
import { ProductEntity } from './entities/product.entity';
import { ProductTagEntity } from './entities/product-tag.entity';
import { decodeProductCursor, encodeProductCursor } from './product-cursor.util';
import { TagsService } from './tags.service';

const DESC_SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
};

export type CommerceReqMeta = { protocol: string; host?: string; forwardedProto?: string };

function slugifyTitle(title: string): string {
  const s = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s.slice(0, 80) || 'product';
}

function parseTagsJson(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function parseAnalytics(raw: string | null): Record<string, unknown> {
  if (!raw) {
    try {
      return JSON.parse(DEFAULT_ANALYTICS_JSON) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return JSON.parse(DEFAULT_ANALYTICS_JSON) as Record<string, unknown>;
  }
}

@Injectable()
export class CommerceService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
    @InjectRepository(ProductTagEntity)
    private readonly productTagRepo: Repository<ProductTagEntity>,
    @InjectRepository(MemberProfileEntity)
    private readonly memberRepo: Repository<MemberProfileEntity>,
    private readonly tagsService: TagsService,
    private readonly mediaResolver: MediaResolver,
  ) {}

  private sanitizeDescription(html: string): string {
    return sanitizeHtml(html, DESC_SANITIZE).trim();
  }

  private async uniqueSlug(base: string): Promise<string> {
    const prefix = slugifyTitle(base);
    for (let i = 0; i < 12; i++) {
      const slug = `${prefix}-${randomUUID().slice(0, 8)}`;
      const exists = await this.productRepo.exist({ where: { slug } });
      if (!exists) return slug;
    }
    throw new BadRequestException('Could not allocate slug');
  }

  async serializeProduct(product: ProductEntity, reqMeta: CommerceReqMeta) {
    let mp = product.seller?.memberProfile;
    if (!mp) {
      mp = (await this.memberRepo.findOne({ where: { userId: product.sellerId } })) ?? undefined;
    }
    const seller = {
      id: product.sellerId,
      displayName: mp?.displayName ?? mp?.username ?? 'Seller',
      username: mp?.username ?? '',
      isVerifiedSeller: mp?.isVerifiedSeller ?? false,
      avatarUrl: mp?.avatarUrl ?? null,
    };

    const resolveUrl = (path?: string) => {
      if (!path) return undefined;
      if (/^https?:\/\//i.test(path)) return path;
      if (path.startsWith('/uploads/')) return this.mediaResolver.toPublicUrl(path, reqMeta);
      return path;
    };

    const media = parseProductMediaJson(product.mediaJson).map((item) => ({
      ...item,
      url: resolveUrl(item.url) ?? item.url,
      thumbnailUrl: resolveUrl(item.thumbnailUrl),
      previewUrl: resolveUrl(item.previewUrl),
      originalUrl: resolveUrl(item.originalUrl ?? item.url),
    }));

    const analytics = parseAnalytics(product.analyticsJson);

    return {
      id: product.id,
      sellerId: product.sellerId,
      seller,
      categoryId: product.categoryId,
      category: product.category ? { id: product.category.id, name: product.category.name } : { id: product.categoryId, name: '' },
      title: product.title,
      slug: product.slug,
      tags: parseTagsJson(product.tagsJson),
      media,
      description: product.description,
      price: product.price,
      productType: product.productType,
      stock: product.stock,
      stockUnit: product.stockUnit,
      status: product.status,
      analytics: {
        views: Number(analytics.views ?? 0),
        saves: Number(analytics.saves ?? 0),
        shares: Number(analytics.shares ?? 0),
        avgRating: Number(analytics.avgRating ?? 0),
        totalRatings: Number(analytics.totalRatings ?? 0),
      },
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      publishedAt: product.publishedAt?.toISOString() ?? null,
    };
  }

  private canView(product: ProductEntity, viewerId?: string): boolean {
    if (product.status === 'REMOVED') return viewerId === product.sellerId;
    if (product.status === 'PUBLISHED') return true;
    return viewerId === product.sellerId;
  }

  async createProduct(sellerId: string, dto: CreateProductDto, reqMeta: CommerceReqMeta) {
    const cat = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
    if (!cat) throw new BadRequestException('Invalid category');

    const slug = await this.uniqueSlug(dto.title);
    const mediaJson = dto.media?.length ? JSON.stringify(dto.media) : null;
    const tagsJson = dto.tags?.length ? JSON.stringify(dto.tags.map((t) => t.trim()).filter(Boolean)) : null;

    const entity = this.productRepo.create({
      sellerId,
      categoryId: dto.categoryId,
      title: dto.title.trim(),
      slug,
      description: this.sanitizeDescription(dto.description),
      price: dto.price,
      productType: dto.productType,
      stock: dto.stock,
      stockUnit: dto.stockUnit?.trim() || DEFAULT_STOCK_UNIT,
      status: 'DRAFT',
      mediaJson,
      tagsJson,
      analyticsJson: DEFAULT_ANALYTICS_JSON,
    });

    const saved = await this.productRepo.save(entity);
    await this.syncTags(saved.id, dto.tags);
    const full = await this.productRepo.findOne({
      where: { id: saved.id },
      relations: ['category', 'seller', 'seller.memberProfile'],
    });
    if (!full) throw new NotFoundException();
    return this.serializeProduct(full, reqMeta);
  }

  private async syncTags(productId: string, tags?: string[]) {
    await this.productTagRepo.delete({ productId });
    if (!tags?.length) return;
    for (const raw of tags) {
      const name = raw.trim();
      if (!name) continue;
      const tag = await this.tagsService.findOrCreate(name);
      await this.productTagRepo.save(this.productTagRepo.create({ productId, tagId: tag.id }));
    }
  }

  async findPublic(query: QueryPublicProductsDto, reqMeta: CommerceReqMeta) {
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.seller', 'seller')
      .leftJoinAndSelect('seller.memberProfile', 'memberProfile')
      .where('p.status = :st', { st: 'PUBLISHED' });

    if (query.categoryId) qb.andWhere('p.category_id = :cid', { cid: query.categoryId });
    if (query.productType) qb.andWhere('p.product_type = :pt', { pt: query.productType });
    if (query.search?.trim()) qb.andWhere('p.title LIKE :q', { q: `%${query.search.trim()}%` });
    if (query.minPrice != null) qb.andWhere('p.price >= :minp', { minp: query.minPrice });
    if (query.maxPrice != null) qb.andWhere('p.price <= :maxp', { maxp: query.maxPrice });

    const sortBy = query.sortBy ?? 'newest';
    if (sortBy === 'price_asc') qb.orderBy('p.price', 'ASC').addOrderBy('p.id', 'DESC');
    else if (sortBy === 'price_desc') qb.orderBy('p.price', 'DESC').addOrderBy('p.id', 'DESC');
    else if (sortBy === 'popular') {
      qb.addSelect(
        "ISNULL(CAST(JSON_VALUE(p.analytics_json, '$.views') AS INT), 0)",
        'pop_views',
      )
        .orderBy('pop_views', 'DESC')
        .addOrderBy('p.createdAt', 'DESC');
    } else {
      qb.orderBy('p.createdAt', 'DESC').addOrderBy('p.id', 'DESC');
    }

    if (query.cursor) {
      const { createdAt, id } = decodeProductCursor(query.cursor);
      qb.andWhere('(p.created_at < :ca OR (p.created_at = :ca AND p.id < :cid))', {
        ca: createdAt,
        cid: id,
      });
    }

    const rows = await qb.take(limit + 1).getMany();
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor =
      hasMore && slice.length > 0
        ? encodeProductCursor(slice[slice.length - 1].createdAt, slice[slice.length - 1].id)
        : null;

    const total = await this.productRepo.count({ where: { status: 'PUBLISHED' } });
    const items = await Promise.all(slice.map((p) => this.serializeProduct(p, reqMeta)));
    return { items, nextCursor, total };
  }

  async findMine(sellerId: string, query: QueryMyProductsDto, reqMeta: CommerceReqMeta) {
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.seller', 'seller')
      .leftJoinAndSelect('seller.memberProfile', 'memberProfile')
      .where('p.seller_id = :sid', { sid: sellerId });

    if (query.status) qb.andWhere('p.status = :st', { st: query.status });

    qb.orderBy('p.updatedAt', 'DESC').addOrderBy('p.id', 'DESC');

    if (query.cursor) {
      const { createdAt, id } = decodeProductCursor(query.cursor);
      qb.andWhere('(p.updated_at < :ca OR (p.updated_at = :ca AND p.id < :cid))', {
        ca: createdAt,
        cid: id,
      });
    }

    const rows = await qb.take(limit + 1).getMany();
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor =
      hasMore && slice.length > 0
        ? encodeProductCursor(slice[slice.length - 1].updatedAt, slice[slice.length - 1].id)
        : null;

    const items = await Promise.all(slice.map((p) => this.serializeProduct(p, reqMeta)));
    return { items, nextCursor, total: slice.length };
  }

  async findOne(id: string, viewerId: string | undefined, reqMeta: CommerceReqMeta) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['category', 'seller', 'seller.memberProfile'],
    });
    if (!product) throw new NotFoundException('Product not found');
    if (!this.canView(product, viewerId)) throw new NotFoundException('Product not found');

    if (product.status === 'PUBLISHED' && viewerId !== product.sellerId) {
      const analytics = parseAnalytics(product.analyticsJson);
      analytics.views = Number(analytics.views ?? 0) + 1;
      product.analyticsJson = JSON.stringify(analytics);
      await this.productRepo.save(product);
    }

    return this.serializeProduct(product, reqMeta);
  }

  async updateProduct(sellerId: string, id: string, dto: UpdateProductDto, reqMeta: CommerceReqMeta) {
    const product = await this.productRepo.findOne({ where: { id }, relations: ['category', 'seller', 'seller.memberProfile'] });
    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId !== sellerId) throw new ForbiddenException('Not owner');
    if (product.status === 'BLOCKED') throw new BadRequestException('Product is blocked');

    if (dto.categoryId) {
      const cat = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
      if (!cat) throw new BadRequestException('Invalid category');
      product.categoryId = dto.categoryId;
    }
    if (dto.title != null) product.title = dto.title.trim();
    if (dto.description != null) product.description = this.sanitizeDescription(dto.description);
    if (dto.price != null) product.price = dto.price;
    if (dto.productType != null) product.productType = dto.productType;
    if (dto.stock != null) product.stock = dto.stock;
    if (dto.stockUnit != null) product.stockUnit = dto.stockUnit.trim() || DEFAULT_STOCK_UNIT;
    if (dto.media != null) product.mediaJson = dto.media.length ? JSON.stringify(dto.media) : null;
    if (dto.tags != null) product.tagsJson = dto.tags.length ? JSON.stringify(dto.tags.map((t) => t.trim()).filter(Boolean)) : null;

    await this.productRepo.save(product);
    if (dto.tags != null) await this.syncTags(product.id, dto.tags);

    const full = await this.productRepo.findOne({
      where: { id: product.id },
      relations: ['category', 'seller', 'seller.memberProfile'],
    });
    if (!full) throw new NotFoundException();
    return this.serializeProduct(full, reqMeta);
  }

  async publishProduct(sellerId: string, id: string, reqMeta: CommerceReqMeta) {
    const product = await this.productRepo.findOne({ where: { id }, relations: ['category', 'seller', 'seller.memberProfile'] });
    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId !== sellerId) throw new ForbiddenException('Not owner');

    const media = parseProductMediaJson(product.mediaJson);
    if (media.length === 0) throw new BadRequestException('At least one image is required');
    if (!product.title?.trim()) throw new BadRequestException('Title required');
    if (product.price <= 0) throw new BadRequestException('Price must be positive');
    if (product.stock <= 0) throw new BadRequestException('Stock must be positive');

    product.status = 'PUBLISHED';
    product.publishedAt = new Date();
    await this.productRepo.save(product);

    return this.serializeProduct(product, reqMeta);
  }

  async softDeleteProduct(sellerId: string, id: string) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId !== sellerId) throw new ForbiddenException('Not owner');
    product.status = 'REMOVED';
    await this.productRepo.save(product);
    return { ok: true as const };
  }
}
