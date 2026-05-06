import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { UserStatusEntity } from './entities/user-status.entity';
import { UserStatusCode } from './enums/status.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity) private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(UserStatusEntity) private readonly userStatusesRepo: Repository<UserStatusEntity>,
  ) {}

  async findByIdOrThrow(id: string): Promise<UserEntity> {
    const user = await this.usersRepo.findOne({ where: { id }, relations: ['memberProfile', 'guestProfile'] });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getActiveStatuses(userId: string): Promise<UserStatusCode[]> {
    const statuses = await this.userStatusesRepo.find({
      where: {
        userId,
        isActive: true,
        statusCode: In(Object.values(UserStatusCode)),
      },
    });
    return statuses.map((s) => s.statusCode as UserStatusCode);
  }
}
