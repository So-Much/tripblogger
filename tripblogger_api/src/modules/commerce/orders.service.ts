import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { OrderEntity } from './entities/order.entity';
import { OrderProductEntity } from './entities/order-product.entity';
import { CartEntity } from './entities/cart.entity';
import { CartProductEntity } from './entities/cart-product.entity';
import { ProductEntity } from './entities/product.entity';
import { AddressEntity } from './entities/address.entity';
import { CouponUsageEntity } from './entities/coupon-usage.entity';
import { ShipmentEntity } from './entities/shipment.entity';
import { ProductRatingEntity } from './entities/product-rating.entity';
import { CheckoutDto, QueryOrdersDto } from './dto/shopping.dto';
import { CouponsService } from './coupons.service';
import { PaymentsService } from './payments.service';
import { toIsoString } from '../../common/utils/iso-date';
import { parseProductMediaJson } from './commerce-media.util';
import { FREE_SHIPPING_THRESHOLD, ORDER_STATUSES, SHIPPING_FEE } from './constants';

function orderCursorFrom(row: OrderEntity) {
  return Buffer.from(`${row.createdAt.toISOString()}|${row.id}`, 'utf8').toString('base64url');
}

function decodeOrderCursor(c: string) {
  const [iso, id] = Buffer.from(c, 'base64url').toString('utf8').split('|');
  return { createdAt: new Date(iso), id };
}

const ORDER_STATUS_SET = new Set<string>(ORDER_STATUSES);

function parseStatusIn(raw?: string): string[] | undefined {
  if (!raw?.trim()) return undefined;
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => ORDER_STATUS_SET.has(s));
  return parts.length ? parts : undefined;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderProductEntity)
    private readonly opRepo: Repository<OrderProductEntity>,
    @InjectRepository(CartEntity)
    private readonly cartRepo: Repository<CartEntity>,
    @InjectRepository(CartProductEntity)
    private readonly lineRepo: Repository<CartProductEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(AddressEntity)
    private readonly addrRepo: Repository<AddressEntity>,
    @InjectRepository(ShipmentEntity)
    private readonly shipmentRepo: Repository<ShipmentEntity>,
    @InjectRepository(ProductRatingEntity)
    private readonly ratingRepo: Repository<ProductRatingEntity>,
    private readonly couponsService: CouponsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  private serializeAddress(a: AddressEntity) {
    return {
      id: a.id,
      label: a.label,
      recipientName: a.recipientName,
      phone: a.phone,
      province: a.province,
      district: a.district,
      ward: a.ward,
      street: a.street,
      isDefault: !!a.isDefault,
      createdAt: a.createdAt.toISOString(),
    };
  }

  private async serializeOrder(
    o: OrderEntity,
    opts: { includePayment?: boolean; viewerId?: string } = {},
  ) {
    const includePayment = opts.includePayment ?? false;
    const viewerId = opts.viewerId;
    const addr = o.address ?? (o.addressId ? await this.addrRepo.findOne({ where: { id: o.addressId } }) : null);
    const lines = o.orderProducts?.length
      ? o.orderProducts
      : await this.opRepo.find({
          where: { orderId: o.id },
          relations: ['product', 'product.category', 'product.seller', 'product.seller.memberProfile'],
        });
    let items = (lines ?? []).map((l) => ({
      id: l.id,
      productId: l.productId,
      sellerId: l.sellerId,
      quantity: l.quantity,
      priceSnapshot: Number(l.priceSnapshot),
      productTitleSnapshot: l.productTitleSnapshot,
      status: l.status,
      product: l.product
        ? {
            id: l.product.id,
            title: l.product.title,
            media: parseProductMediaJson(l.product.mediaJson).map((m) => ({
              type: m.type === 'video' ? 'video' : 'image',
              url: m.url,
              thumbnailUrl: m.thumbnailUrl,
              previewUrl: m.previewUrl,
              originalUrl: m.originalUrl,
            })),
            price: Number(l.product.price),
            status: l.product.status,
          }
        : undefined,
    }));
    if (viewerId === o.buyerId && (lines ?? []).length > 0) {
      const ids = (lines ?? []).map((l) => l.id);
      const ratedRows = await this.ratingRepo.find({
        where: { userId: o.buyerId, orderProductId: In(ids) },
        select: ['orderProductId'],
      });
      const ratedSet = new Set(ratedRows.map((r) => r.orderProductId));
      items = items.map((item) => ({ ...item, rated: ratedSet.has(item.id) }));
    }
    const payment = includePayment ? await this.paymentsService.findByOrderId(o.id) : undefined;
    return {
      id: o.id,
      orderCode: o.orderCode,
      buyerId: o.buyerId,
      addressId: o.addressId,
      couponId: o.couponId,
      status: o.status,
      subTotal: Number(o.subTotal),
      shippingFee: Number(o.shippingFee),
      discountAmount: Number(o.discountAmount),
      totalAmount: Number(o.totalAmount),
      note: o.note,
      createdAt: toIsoString(o.createdAt)!,
      updatedAt: toIsoString(o.updatedAt)!,
      address: addr ? this.serializeAddress(addr) : undefined,
      guestAddress:
        o.guestRecipientName || o.guestPhone || o.guestStreet
          ? {
              recipientName: o.guestRecipientName,
              phone: o.guestPhone,
              email: o.guestEmail,
              province: o.guestProvince,
              district: o.guestDistrict,
              ward: o.guestWard,
              street: o.guestStreet,
            }
          : null,
      items,
      payment: payment
        ? {
            id: payment.id,
            orderId: payment.orderId,
            method: payment.method,
            status: payment.status,
            amount: Number(payment.amount),
            paidAt: toIsoString(payment.paidAt),
            createdAt: toIsoString(payment.createdAt)!,
          }
        : undefined,
    };
  }

  async checkout(buyerId: string, buyerRole: string, dto: CheckoutDto) {
    const cart = await this.cartRepo.findOne({
      where: { userId: buyerId, status: 'ACTIVE' },
      relations: ['items', 'items.product', 'items.product.category'],
    });
    if (!cart?.items?.length) throw new BadRequestException('Cart is empty');

    for (const line of cart.items) {
      const p = line.product;
      if (!p || p.status !== 'PUBLISHED') throw new BadRequestException('Product no longer available');
      if (p.stock < line.quantity) throw new BadRequestException('Insufficient stock');
      if (p.sellerId === buyerId) throw new BadRequestException('Cannot purchase own product');
    }

    const isGuest = buyerRole === 'GUEST';
    const address = isGuest
      ? null
      : await this.addrRepo.findOne({
          where: { id: dto.addressId, userId: buyerId },
        });
    if (!isGuest && !address) throw new BadRequestException('Invalid address');
    if (isGuest && !dto.guestInfo) throw new BadRequestException('Guest checkout requires recipient information');

    const subTotal = cart.items.reduce((s, l) => s + Number(l.priceSnapshot) * l.quantity, 0);
    let discountAmount = 0;
    let couponId: string | null = null;
    const categoryIds = [...new Set(cart.items.map((l) => l.product.categoryId))];
    const productIds = cart.items.map((l) => l.productId);

    if (dto.couponCode?.trim()) {
      const v = await this.couponsService.validate(dto.couponCode.trim(), subTotal, categoryIds, productIds);
      if (!v.valid || !('coupon' in v)) throw new BadRequestException(v.reason ?? 'Invalid coupon');
      discountAmount = v.discountAmount ?? 0;
      couponId = v.coupon.id;
    }

    const shippingFee = subTotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const totalAmount = Math.max(0, subTotal + shippingFee - discountAmount);

    const orderCode =
      'TB' + Date.now().toString(36).toUpperCase() + randomUUID().replace(/-/g, '').slice(0, 4).toUpperCase();

    let savedOrderId = '';
    await this.orderRepo.manager.transaction(async (em) => {
      const oRepo = em.getRepository(OrderEntity);
      const opRepo = em.getRepository(OrderProductEntity);
      const pRepo = em.getRepository(ProductEntity);
      const cRepo = em.getRepository(CartEntity);

      const order = oRepo.create({
        orderCode,
        buyerId,
        addressId: address?.id ?? null,
        guestRecipientName: dto.guestInfo?.recipientName ?? null,
        guestPhone: dto.guestInfo?.phone ?? null,
        guestEmail: dto.guestInfo?.email ?? null,
        guestProvince: dto.guestInfo?.province ?? null,
        guestDistrict: dto.guestInfo?.district ?? null,
        guestWard: dto.guestInfo?.ward ?? null,
        guestStreet: dto.guestInfo?.street ?? null,
        couponId,
        status: 'PENDING',
        subTotal,
        shippingFee,
        discountAmount,
        totalAmount,
        note: dto.note?.trim() || null,
      });
      const saved = await oRepo.save(order);
      savedOrderId = saved.id;

      for (const line of cart.items) {
        const p = line.product;
        await opRepo.save(
          opRepo.create({
            orderId: saved.id,
            productId: p.id,
            sellerId: p.sellerId,
            quantity: line.quantity,
            priceSnapshot: line.priceSnapshot,
            productTitleSnapshot: p.title,
            status: 'PROCESSING',
          }),
        );
        const decResult = await pRepo
          .createQueryBuilder()
          .update(ProductEntity)
          .set({ stock: () => `stock - ${line.quantity}` })
          .where('id = :id AND stock >= :qty', { id: p.id, qty: line.quantity })
          .execute();
        if (!decResult.affected) {
          throw new BadRequestException(`Insufficient stock for ${p.title}`);
        }
        const updated = await pRepo.findOne({ where: { id: p.id } });
        if (updated && updated.stock <= 0) {
          updated.stock = 0;
          updated.status = 'OUTOFSTOCK';
          await pRepo.save(updated);
        }
      }

      if (couponId) {
        await this.couponsService.recordUsage(em, couponId, buyerId, saved.id);
      }

      cart.status = 'INACTIVE';
      await cRepo.save(cart);

      await this.paymentsService.createCodPayment(em, saved.id, totalAmount);
    });

    const full = await this.orderRepo.findOne({
      where: { id: savedOrderId },
      relations: ['address', 'orderProducts', 'orderProducts.product'],
    });
    if (!full) throw new NotFoundException();
    return this.serializeOrder(full, { includePayment: true, viewerId: buyerId });
  }

  async listBuyerOrders(buyerId: string, query: QueryOrdersDto) {
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.buyer_id = :bid', { bid: buyerId })
      .orderBy('o.createdAt', 'DESC')
      .addOrderBy('o.id', 'DESC')
      .take(limit + 1);
    const statusIn = parseStatusIn(query.statusIn);
    if (statusIn?.length) qb.andWhere('o.status IN (:...sts)', { sts: statusIn });
    else if (query.status) qb.andWhere('o.status = :st', { st: query.status });
    if (query.cursor) {
      const { createdAt, id } = decodeOrderCursor(query.cursor);
      qb.andWhere('(o.created_at < :ca OR (o.created_at = :ca AND o.id < :cid))', { ca: createdAt, cid: id });
    }
    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const items = await Promise.all(slice.map((o) => this.serializeOrder(o, {})));
    const nextCursor = hasMore && slice.length ? orderCursorFrom(slice[slice.length - 1]) : null;
    return { items, nextCursor, total: items.length };
  }

  async listSellerOrders(sellerId: string, query: QueryOrdersDto) {
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where(
        `o.id IN (SELECT DISTINCT order_id FROM order_products WHERE seller_id = :sid)`,
        { sid: sellerId },
      )
      .orderBy('o.createdAt', 'DESC')
      .addOrderBy('o.id', 'DESC')
      .take(limit + 1);
    const statusIn = parseStatusIn(query.statusIn);
    if (statusIn?.length) qb.andWhere('o.status IN (:...sts)', { sts: statusIn });
    else if (query.status) qb.andWhere('o.status = :st', { st: query.status });
    if (query.cursor) {
      const { createdAt, id } = decodeOrderCursor(query.cursor);
      qb.andWhere('(o.created_at < :ca OR (o.created_at = :ca AND o.id < :cid))', { ca: createdAt, cid: id });
    }
    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const items = await Promise.all(slice.map((o) => this.serializeOrder(o, {})));
    const nextCursor = hasMore && slice.length ? orderCursorFrom(slice[slice.length - 1]) : null;
    return { items, nextCursor, total: items.length };
  }

  async getOrder(id: string, userId: string) {
    const o = await this.orderRepo.findOne({
      where: { id },
      relations: ['address', 'orderProducts', 'orderProducts.product'],
    });
    if (!o) throw new NotFoundException('Order not found');
    const isBuyer = o.buyerId === userId;
    const isSeller = (o.orderProducts ?? []).some((l) => l.sellerId === userId);
    if (!isBuyer && !isSeller) throw new ForbiddenException();
    return this.serializeOrder(o, { includePayment: isBuyer || isSeller, viewerId: userId });
  }

  async cancelOrder(buyerId: string, id: string) {
    await this.orderRepo.manager.transaction(async (em) => {
      const o = await em.findOne(OrderEntity, { where: { id, buyerId }, relations: ['orderProducts'] });
      if (!o) throw new NotFoundException('Order not found');
      if (o.status !== 'PENDING') throw new BadRequestException('Order cannot be cancelled');
      o.status = 'CANCELLED';
      await em.save(o);
      for (const line of o.orderProducts ?? []) {
        await em.getRepository(ProductEntity).increment({ id: line.productId }, 'stock', line.quantity);
        const p = await em.findOne(ProductEntity, { where: { id: line.productId } });
        if (p && p.status === 'OUTOFSTOCK' && p.stock > 0) {
          p.status = 'PUBLISHED';
          await em.save(p);
        }
      }
      if (o.couponId) {
        await this.couponsService.rollbackUsage(em, o.couponId, o.id);
      }
      await this.paymentsService.markAsFailed(em, o.id);
    });
    const full = await this.orderRepo.findOne({ where: { id }, relations: ['address', 'orderProducts'] });
    if (!full) throw new NotFoundException();
    return this.serializeOrder(full, { includePayment: true, viewerId: buyerId });
  }

  async confirmOrder(sellerId: string, id: string) {
    const o = await this.orderRepo.findOne({
      where: { id },
      relations: ['orderProducts'],
    });
    if (!o) throw new NotFoundException('Order not found');
    const isSeller = (o.orderProducts ?? []).some((l) => l.sellerId === sellerId);
    if (!isSeller) throw new ForbiddenException();
    if (o.status !== 'PENDING') throw new BadRequestException('Invalid order status');
    o.status = 'CONFIRMED';
    await this.orderRepo.save(o);
    return this.serializeOrder(o, { viewerId: sellerId });
  }

  async confirmReceived(buyerId: string, orderId: string) {
    await this.orderRepo.manager.transaction(async (em) => {
      const o = await em.findOne(OrderEntity, {
        where: { id: orderId, buyerId },
        relations: ['orderProducts'],
      });
      if (!o) throw new NotFoundException('Order not found');
      if (o.status !== 'SHIPPING') throw new BadRequestException('Order not in shipping state');
      const shipments = await em.find(ShipmentEntity, { where: { orderId } });
      for (const s of shipments) {
        if (s.status !== 'DELIVERED' && s.status !== 'FAILED') {
          s.status = 'DELIVERED';
          await em.save(s);
        }
      }
      o.status = 'DELIVERED';
      await em.save(o);
      for (const line of o.orderProducts ?? []) {
        line.status = 'DELIVERED';
        await em.save(line);
      }
      await this.paymentsService.markAsPaid(em, o.id);
    });
    const full = await this.orderRepo.findOne({ where: { id: orderId }, relations: ['address', 'orderProducts'] });
    if (!full) throw new NotFoundException();
    return this.serializeOrder(full, { includePayment: true, viewerId: buyerId });
  }
}
