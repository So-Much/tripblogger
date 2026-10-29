import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AddressEntity } from './entities/address.entity';
import { OrderEntity } from './entities/order.entity';
import { CreateAddressDto, UpdateAddressDto } from './dto/shopping.dto';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(AddressEntity)
    private readonly addrRepo: Repository<AddressEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
  ) {}

  async list(userId: string) {
    return this.addrRepo.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async create(userId: string, dto: CreateAddressDto) {
    const count = await this.addrRepo.count({ where: { userId } });
    const isDefault = dto.isDefault === true || count === 0;
    if (isDefault) {
      await this.addrRepo.update({ userId }, { isDefault: false });
    }
    return this.addrRepo.save(
      this.addrRepo.create({
        userId,
        label: dto.label.trim(),
        recipientName: dto.recipientName.trim(),
        phone: dto.phone.trim(),
        province: dto.province.trim(),
        district: dto.district.trim(),
        ward: dto.ward.trim(),
        street: dto.street.trim(),
        isDefault,
      }),
    );
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    const entity = await this.addrRepo.findOne({ where: { id, userId } });
    if (!entity) throw new NotFoundException('Address not found');
    if (dto.label != null) entity.label = dto.label.trim();
    if (dto.recipientName != null) entity.recipientName = dto.recipientName.trim();
    if (dto.phone != null) entity.phone = dto.phone.trim();
    if (dto.province != null) entity.province = dto.province.trim();
    if (dto.district != null) entity.district = dto.district.trim();
    if (dto.ward != null) entity.ward = dto.ward.trim();
    if (dto.street != null) entity.street = dto.street.trim();
    if (dto.isDefault === true) {
      await this.addrRepo.update({ userId }, { isDefault: false });
      entity.isDefault = true;
    }
    return this.addrRepo.save(entity);
  }

  async remove(userId: string, id: string) {
    const entity = await this.addrRepo.findOne({ where: { id, userId } });
    if (!entity) throw new NotFoundException('Address not found');
    const active = await this.orderRepo.count({
      where: { addressId: id, status: In(['PENDING', 'CONFIRMED', 'SHIPPING']) },
    });
    if (active > 0) throw new BadRequestException('Address is used by an active order');
    const wasDefault = entity.isDefault;
    await this.addrRepo.remove(entity);
    if (wasDefault) {
      const next = await this.addrRepo.findOne({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      if (next) {
        next.isDefault = true;
        await this.addrRepo.save(next);
      }
    }
    return { ok: true as const };
  }

  async setDefault(userId: string, id: string) {
    const entity = await this.addrRepo.findOne({ where: { id, userId } });
    if (!entity) throw new NotFoundException('Address not found');
    await this.addrRepo.update({ userId }, { isDefault: false });
    entity.isDefault = true;
    return this.addrRepo.save(entity);
  }
}
