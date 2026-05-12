import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductRatingEntity } from './entities/product-rating.entity';
import { OrderProductEntity } from './entities/order-product.entity';
import { ProductEntity } from './entities/product.entity';
import { CreateRatingDto, QueryRatingsDto } from './dto/shopping.dto';
import { DEFAULT_ANALYTICS_JSON } from './constants';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(ProductRatingEntity)
    private readonly ratingRepo: Repository<ProductRatingEntity>,
    @InjectRepository(OrderProductEntity)
    private readonly opRepo: Repository<OrderProductEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
  ) {}

  async createRating(userId: string, productId: string, dto: CreateRatingDto) {
    const op = await this.opRepo.findOne({ where: { id: dto.orderProductId }, relations: ['order'] });
    if (!op || op.productId !== productId) throw new NotFoundException('Order line not found');
    if (op.order.buyerId !== userId) throw new ForbiddenException();
    if (op.status !== 'DELIVERED') throw new BadRequestException('Order line not delivered');
    const existed = await this.ratingRepo.findOne({
      where: { productId, userId, orderProductId: dto.orderProductId },
    });
    if (existed) throw new BadRequestException('Already rated');

    const row = await this.ratingRepo.save(
      this.ratingRepo.create({
        productId,
        userId,
        orderProductId: dto.orderProductId,
        score: dto.score,
        review: dto.review?.trim() || null,
      }),
    );
    await this.recalculateProductAnalytics(productId);
    return {
      id: row.id,
      productId: row.productId,
      userId: row.userId,
      orderProductId: row.orderProductId,
      score: row.score,
      review: row.review,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async recalculateProductAnalytics(productId: string) {
    const raw = await this.ratingRepo
      .createQueryBuilder('r')
      .select('AVG(CAST(r.score AS FLOAT))', 'avg')
      .addSelect('COUNT(*)', 'cnt')
      .where('r.product_id = :pid', { pid: productId })
      .getRawOne<{ avg: string; cnt: string }>();

    const dist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    const rows = await this.ratingRepo
      .createQueryBuilder('r')
      .select('r.score', 'score')
      .addSelect('COUNT(*)', 'c')
      .where('r.product_id = :pid', { pid: productId })
      .groupBy('r.score')
      .getRawMany<{ score: number; c: string }>();
    for (const r of rows) {
      dist[String(r.score)] = Number(r.c);
    }

    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) return;
    let base: Record<string, unknown>;
    try {
      base = product.analyticsJson ? (JSON.parse(product.analyticsJson) as Record<string, unknown>) : JSON.parse(DEFAULT_ANALYTICS_JSON);
    } catch {
      base = JSON.parse(DEFAULT_ANALYTICS_JSON) as Record<string, unknown>;
    }
    base.avgRating = Number(raw?.avg ?? 0);
    base.totalRatings = Number(raw?.cnt ?? 0);
    base.ratingDistribution = dist;
    product.analyticsJson = JSON.stringify(base);
    await this.productRepo.save(product);
  }

  async listRatings(productId: string, query: QueryRatingsDto) {
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const qb = this.ratingRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'u')
      .leftJoinAndSelect('u.memberProfile', 'mp')
      .where('r.product_id = :pid', { pid: productId })
      .take(limit + 1);

    const sort = query.sort ?? 'newest';
    if (sort === 'highest') qb.orderBy('r.score', 'DESC').addOrderBy('r.createdAt', 'DESC');
    else if (sort === 'lowest') qb.orderBy('r.score', 'ASC').addOrderBy('r.createdAt', 'DESC');
    else qb.orderBy('r.createdAt', 'DESC').addOrderBy('r.id', 'DESC');

    if (query.score != null) qb.andWhere('r.score = :sc', { sc: query.score });

    if (query.cursor) {
      const [iso, id] = Buffer.from(query.cursor, 'base64url').toString('utf8').split('|');
      qb.andWhere('(r.created_at < :ca OR (r.created_at = :ca AND r.id < :cid))', {
        ca: new Date(iso),
        cid: id,
      });
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const items = slice.map((r) => ({
      id: r.id,
      productId: r.productId,
      userId: r.userId,
      orderProductId: r.orderProductId,
      score: r.score,
      review: r.review,
      createdAt: r.createdAt.toISOString(),
      displayName: r.user?.memberProfile?.displayName ?? r.user?.memberProfile?.username ?? 'Buyer',
      avatarUrl: r.user?.memberProfile?.avatarUrl ?? null,
    }));
    const last = slice[slice.length - 1];
    const nextCursor =
      hasMore && last
        ? Buffer.from(`${last.createdAt.toISOString()}|${last.id}`, 'utf8').toString('base64url')
        : null;
    const total = await this.ratingRepo.count({ where: { productId } });
    return { items, nextCursor, total };
  }

  async summary(productId: string) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException();
    let analytics: Record<string, unknown>;
    try {
      analytics = product.analyticsJson
        ? (JSON.parse(product.analyticsJson) as Record<string, unknown>)
        : JSON.parse(DEFAULT_ANALYTICS_JSON);
    } catch {
      analytics = JSON.parse(DEFAULT_ANALYTICS_JSON) as Record<string, unknown>;
    }
    const dist = (analytics.ratingDistribution as Record<string, number>) ?? {};
    return {
      avgRating: Number(analytics.avgRating ?? 0),
      totalRatings: Number(analytics.totalRatings ?? 0),
      distribution: dist,
    };
  }
}
