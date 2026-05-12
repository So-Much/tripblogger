import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberProfileEntity } from '../users/entities/member-profile.entity';
import { SellerVerificationEntity } from './entities/seller-verification.entity';

@Injectable()
export class SellerVerificationService {
  constructor(
    @InjectRepository(SellerVerificationEntity)
    private readonly verificationRepo: Repository<SellerVerificationEntity>,
    @InjectRepository(MemberProfileEntity)
    private readonly profileRepo: Repository<MemberProfileEntity>,
  ) {}

  async requestVerification(userId: string) {
    const approved = await this.verificationRepo.findOne({
      where: { userId, status: 'APPROVED' },
    });
    if (approved) throw new BadRequestException('Already verified');

    const pending = await this.verificationRepo.findOne({
      where: { userId, status: 'PENDING' },
    });
    if (pending) throw new BadRequestException('Verification request already pending');

    return this.verificationRepo.save(this.verificationRepo.create({ userId, status: 'PENDING' }));
  }

  async getStatus(userId: string) {
    return this.verificationRepo.findOne({
      where: { userId },
      order: { requestedAt: 'DESC' },
    });
  }

  async approve(userId: string, adminId: string) {
    const entity = await this.verificationRepo.findOne({
      where: { userId, status: 'PENDING' },
    });
    if (!entity) throw new NotFoundException('No pending verification request');
    entity.status = 'APPROVED';
    entity.reviewedAt = new Date();
    entity.reviewedBy = adminId;
    await this.verificationRepo.save(entity);
    await this.profileRepo.update({ userId }, { isVerifiedSeller: true });
    return entity;
  }

  async reject(userId: string, adminId: string) {
    const entity = await this.verificationRepo.findOne({
      where: { userId, status: 'PENDING' },
    });
    if (!entity) throw new NotFoundException('No pending verification request');
    entity.status = 'REJECTED';
    entity.reviewedAt = new Date();
    entity.reviewedBy = adminId;
    return this.verificationRepo.save(entity);
  }
}
