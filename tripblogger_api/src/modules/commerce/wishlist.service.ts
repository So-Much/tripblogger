import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WishlistEntity } from './entities/wishlist.entity';
import { ProductEntity } from './entities/product.entity';
import { CommerceService, CommerceReqMeta } from './commerce.service';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(WishlistEntity)
    private readonly wishRepo: Repository<WishlistEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    private readonly commerceService: CommerceService,
  ) {}

  async toggle(userId: string, productId: string) {
    const existed = await this.wishRepo.findOne({ where: { userId, productId } });
    if (existed) {
      await this.wishRepo.remove(existed);
      return { wishlisted: false as const };
    }
    const product = await this.productRepo.findOne({ where: { id: productId, status: 'PUBLISHED' } });
    if (!product) return { wishlisted: false as const };
    await this.wishRepo.save(this.wishRepo.create({ userId, productId }));
    return { wishlisted: true as const };
  }

  async list(userId: string, limit = 20, cursor?: string, reqMeta?: CommerceReqMeta) {
    const qb = this.wishRepo
      .createQueryBuilder('w')
      .innerJoinAndSelect('w.product', 'p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.seller', 'seller')
      .leftJoinAndSelect('seller.memberProfile', 'memberProfile')
      .where('w.user_id = :uid', { uid: userId })
      .andWhere('p.status = :pst', { pst: 'PUBLISHED' })
      .orderBy('w.createdAt', 'DESC')
      .addOrderBy('w.id', 'DESC')
      .take(limit + 1);

    if (cursor) {
      const [createdAt, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
      qb.andWhere('(w.created_at < :ca OR (w.created_at = :ca AND w.id < :cid))', {
        ca: new Date(createdAt),
        cid: id,
      });
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const meta = reqMeta ?? { protocol: 'http', host: 'localhost' };
    const items = await Promise.all(
      slice.map((w) => this.commerceService.serializeProduct(w.product, meta)),
    );
    const last = slice[slice.length - 1];
    const nextCursor =
      hasMore && last
        ? Buffer.from(`${last.createdAt.toISOString()}|${last.id}`, 'utf8').toString('base64url')
        : null;
    return { items, nextCursor, total: items.length };
  }
}
