import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ShipmentEntity } from './entities/shipment.entity';
import { OrderEntity } from './entities/order.entity';
import { OrderProductEntity } from './entities/order-product.entity';
import { PaymentsService } from './payments.service';
import { SHIPMENT_TRANSITIONS } from './constants';
import { CreateShipmentDto, UpdateShipmentDto, UpdateShipmentStatusDto } from './dto/shopping.dto';

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectRepository(ShipmentEntity)
    private readonly shipRepo: Repository<ShipmentEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    private readonly paymentsService: PaymentsService,
  ) {}

  private async finalizeOrderIfAllDelivered(em: EntityManager, orderId: string) {
    const pending = await em
      .getRepository(ShipmentEntity)
      .createQueryBuilder('sh')
      .where('sh.order_id = :oid', { oid: orderId })
      .andWhere('sh.status != :del', { del: 'DELIVERED' })
      .getCount();
    if (pending > 0) return;

    const oRepo = em.getRepository(OrderEntity);
    const opRepo = em.getRepository(OrderProductEntity);
    const order = await oRepo.findOne({ where: { id: orderId }, relations: ['orderProducts'] });
    if (!order) return;
    order.status = 'DELIVERED';
    await oRepo.save(order);
    for (const line of order.orderProducts ?? []) {
      line.status = 'DELIVERED';
      await opRepo.save(line);
    }
    await this.paymentsService.markAsPaid(em, orderId);
  }

  async createShipment(sellerId: string, orderId: string, dto: CreateShipmentDto) {
    const order = await this.orderRepo.findOne({ where: { id: orderId }, relations: ['orderProducts'] });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'CONFIRMED' && order.status !== 'SHIPPING') {
      throw new BadRequestException('Order not ready for shipment');
    }
    const hasLine = (order.orderProducts ?? []).some((l) => l.sellerId === sellerId);
    if (!hasLine) throw new ForbiddenException();
    const existing = await this.shipRepo.findOne({ where: { orderId, sellerId } });
    if (existing) throw new BadRequestException('Shipment already exists for this seller');

    const s = this.shipRepo.create({
      orderId,
      sellerId,
      trackingCode: dto.trackingCode?.trim() || null,
      carrier: dto.carrier,
      status: 'WAITING',
      estimatedDelivery: dto.estimatedDelivery ? new Date(dto.estimatedDelivery) : null,
    });
    const saved = await this.shipRepo.save(s);
    if (order.status === 'CONFIRMED') {
      order.status = 'SHIPPING';
      await this.orderRepo.save(order);
    }
    return this.toDto(saved);
  }

  async listByOrder(orderId: string, userId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['orderProducts'],
    });
    if (!order) throw new NotFoundException('Order not found');
    const ok =
      order.buyerId === userId || (order.orderProducts ?? []).some((l) => l.sellerId === userId);
    if (!ok) throw new ForbiddenException();
    const rows = await this.shipRepo.find({ where: { orderId } });
    return rows.map((r) => this.toDto(r));
  }

  private toDto(s: ShipmentEntity) {
    return {
      id: s.id,
      orderId: s.orderId,
      sellerId: s.sellerId,
      trackingCode: s.trackingCode,
      carrier: s.carrier,
      status: s.status,
      estimatedDelivery: s.estimatedDelivery?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }

  async updateStatus(sellerId: string, shipmentId: string, dto: UpdateShipmentStatusDto) {
    return this.orderRepo.manager.transaction(async (em) => {
      const shipRepo = em.getRepository(ShipmentEntity);
      const s = await shipRepo.findOne({ where: { id: shipmentId } });
      if (!s) throw new NotFoundException('Shipment not found');
      if (s.sellerId !== sellerId) throw new ForbiddenException();
      const allowed = SHIPMENT_TRANSITIONS[s.status];
      if (!allowed.includes(dto.status)) throw new BadRequestException('Invalid status transition');
      s.status = dto.status;
      if (dto.trackingCode != null) s.trackingCode = dto.trackingCode.trim() || null;
      await shipRepo.save(s);
      if (dto.status === 'DELIVERED') {
        await this.finalizeOrderIfAllDelivered(em, s.orderId);
      }
      const reloaded = await shipRepo.findOne({ where: { id: shipmentId } });
      return this.toDto(reloaded!);
    });
  }

  async updateShipment(sellerId: string, shipmentId: string, dto: UpdateShipmentDto) {
    const s = await this.shipRepo.findOne({ where: { id: shipmentId } });
    if (!s) throw new NotFoundException('Shipment not found');
    if (s.sellerId !== sellerId) throw new ForbiddenException();
    if (dto.trackingCode != null) s.trackingCode = dto.trackingCode.trim() || null;
    if (dto.carrier != null) s.carrier = dto.carrier;
    if (dto.estimatedDelivery != null) s.estimatedDelivery = new Date(dto.estimatedDelivery);
    return this.toDto(await this.shipRepo.save(s));
  }
}
