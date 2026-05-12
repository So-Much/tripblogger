import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PaymentEntity } from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
  ) {}

  private repo(em: EntityManager | null) {
    return em ? em.getRepository(PaymentEntity) : this.paymentRepo;
  }

  async createCodPayment(em: EntityManager | null, orderId: string, amount: number) {
    const repo = this.repo(em);
    const entity = repo.create({
      orderId,
      method: 'COD',
      status: 'PENDING',
      amount,
    });
    return repo.save(entity);
  }

  async findByOrderId(orderId: string) {
    return this.paymentRepo.findOne({ where: { orderId } });
  }

  async markAsPaid(em: EntityManager | null, orderId: string) {
    const repo = this.repo(em);
    const p = await repo.findOne({ where: { orderId } });
    if (!p) return null;
    p.status = 'PAID';
    p.paidAt = new Date();
    return repo.save(p);
  }

  async markAsFailed(em: EntityManager | null, orderId: string) {
    const repo = this.repo(em);
    const p = await repo.findOne({ where: { orderId } });
    if (!p || p.status !== 'PENDING') return null;
    p.status = 'FAILED';
    return repo.save(p);
  }

  async markAsRefunded(orderId: string) {
    const p = await this.paymentRepo.findOne({ where: { orderId } });
    if (!p) return null;
    p.status = 'REFUNDED';
    return this.paymentRepo.save(p);
  }
}
