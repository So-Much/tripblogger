import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CouponEntity } from './entities/coupon.entity';
import { CouponUsageEntity } from './entities/coupon-usage.entity';
import { CreateCouponDto } from './dto/shopping.dto';
import { COUPON_STATUSES, CouponType } from './constants';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(CouponEntity)
    private readonly couponRepo: Repository<CouponEntity>,
    @InjectRepository(CouponUsageEntity)
    private readonly usageRepo: Repository<CouponUsageEntity>,
  ) {}

  calculateDiscount(coupon: CouponEntity, subTotal: number): number {
    if (coupon.type === 'FIXED') return Math.min(Number(coupon.value), subTotal);
    const pct = Number(coupon.value);
    let disc = (subTotal * pct) / 100;
    if (coupon.maxDiscountAmount != null) {
      disc = Math.min(disc, Number(coupon.maxDiscountAmount));
    }
    return Math.min(disc, subTotal);
  }

  async validate(
    code: string,
    cartSubTotal: number,
    categoryIds: string[],
    productIds: string[],
    userId?: string,
  ) {
    const c = await this.couponRepo.findOne({ where: { code: code.trim().toUpperCase() } });
    if (!c) return { valid: false as const, reason: 'Coupon not found' };
    if (c.status !== 'ACTIVE') return { valid: false as const, reason: 'Coupon inactive' };
    const now = new Date();
    if (now < new Date(c.activeAt)) return { valid: false as const, reason: 'Coupon not active yet' };
    if (now > new Date(c.expiresAt)) return { valid: false as const, reason: 'Coupon expired' };
    if (c.maxUses != null && c.usedCount >= c.maxUses) return { valid: false as const, reason: 'Coupon usage limit reached' };
    if (userId) {
      const perUserUses = await this.usageRepo.count({ where: { couponId: c.id, userId } });
      if (perUserUses > 0) return { valid: false as const, reason: 'Coupon already used' };
    }
    if (c.minOrderValue != null && cartSubTotal < Number(c.minOrderValue)) {
      return { valid: false as const, reason: 'Order below minimum value' };
    }
    if (c.appliesTo === 'CATEGORY') {
      const ids = this.parseIds(c.appliesToIdsJson);
      if (!categoryIds.some((id) => ids.includes(id))) return { valid: false as const, reason: 'Coupon not applicable to cart' };
    }
    if (c.appliesTo === 'PRODUCT') {
      const ids = this.parseIds(c.appliesToIdsJson);
      if (!productIds.some((id) => ids.includes(id))) return { valid: false as const, reason: 'Coupon not applicable to cart' };
    }
    const discountAmount = this.calculateDiscount(c, cartSubTotal);
    return {
      valid: true as const,
      coupon: this.toDto(c),
      discountAmount,
    };
  }

  private parseIds(json: string | null): string[] {
    if (!json) return [];
    try {
      const v = JSON.parse(json) as unknown;
      return Array.isArray(v) ? v.map(String) : [];
    } catch {
      return [];
    }
  }

  private toDto(c: CouponEntity) {
    return {
      id: c.id,
      code: c.code,
      type: c.type as CouponType,
      value: Number(c.value),
      minOrderValue: c.minOrderValue != null ? Number(c.minOrderValue) : null,
      maxDiscountAmount: c.maxDiscountAmount != null ? Number(c.maxDiscountAmount) : null,
      appliesTo: c.appliesTo,
      status: c.status,
      expiresAt: c.expiresAt.toISOString(),
    };
  }

  async listAvailable(cartSubTotal?: number) {
    const qb = this.couponRepo
      .createQueryBuilder('c')
      .where('c.status = :st', { st: 'ACTIVE' })
      .andWhere('c.active_at <= GETUTCDATE()')
      .andWhere('c.expires_at >= GETUTCDATE()');
    if (cartSubTotal != null && cartSubTotal > 0) {
      qb.andWhere('(c.min_order_value IS NULL OR c.min_order_value <= :sub)', { sub: cartSubTotal });
    }
    const rows = await qb.orderBy('c.expiresAt', 'ASC').getMany();
    return rows.map((c) => this.toDto(c));
  }

  async create(dto: CreateCouponDto) {
    const code = dto.code.trim().toUpperCase();
    const existed = await this.couponRepo.findOne({ where: { code } });
    if (existed) throw new BadRequestException('Code already exists');
    return this.couponRepo.save(
      this.couponRepo.create({
        code,
        type: dto.type,
        value: dto.value,
        minOrderValue: dto.minOrderValue ?? null,
        maxDiscountAmount: dto.maxDiscountAmount ?? null,
        maxUses: dto.maxUses ?? null,
        appliesTo: dto.appliesTo,
        appliesToIdsJson: dto.appliesToIdsJson ?? null,
        status: 'ACTIVE',
        activeAt: new Date(dto.activeAt),
        expiresAt: new Date(dto.expiresAt),
      }),
    );
  }

  async update(id: string, dto: Partial<CreateCouponDto>) {
    const c = await this.couponRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Coupon not found');
    if (dto.value != null) c.value = dto.value;
    if (dto.minOrderValue !== undefined) c.minOrderValue = dto.minOrderValue ?? null;
    if (dto.maxDiscountAmount !== undefined) c.maxDiscountAmount = dto.maxDiscountAmount ?? null;
    if (dto.maxUses !== undefined) c.maxUses = dto.maxUses ?? null;
    if (dto.appliesTo != null) c.appliesTo = dto.appliesTo;
    if (dto.appliesToIdsJson !== undefined) c.appliesToIdsJson = dto.appliesToIdsJson ?? null;
    if (dto.activeAt != null) c.activeAt = new Date(dto.activeAt);
    if (dto.expiresAt != null) c.expiresAt = new Date(dto.expiresAt);
    return this.couponRepo.save(c);
  }

  async disable(id: string) {
    const c = await this.couponRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Coupon not found');
    c.status = 'DISABLED';
    return this.couponRepo.save(c);
  }

  async recordUsage(em: import('typeorm').EntityManager | null, couponId: string, userId: string, orderId: string) {
    const repo = em ? em.getRepository(CouponUsageEntity) : this.usageRepo;
    const cup = em ? em.getRepository(CouponEntity) : this.couponRepo;
    await repo.save(repo.create({ couponId, userId, orderId }));
    await cup.increment({ id: couponId }, 'usedCount', 1);
  }

  async rollbackUsage(em: import('typeorm').EntityManager | null, couponId: string, orderId: string) {
    const repo = em ? em.getRepository(CouponUsageEntity) : this.usageRepo;
    const cup = em ? em.getRepository(CouponEntity) : this.couponRepo;
    await repo.delete({ couponId, orderId });
    await cup.decrement({ id: couponId }, 'usedCount', 1);
  }
}
