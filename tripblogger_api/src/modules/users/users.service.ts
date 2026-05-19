import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MemberProfileEntity } from './entities/member-profile.entity';
import { In, Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { UserStatusEntity } from './entities/user-status.entity';
import { UserStatusCode } from './enums/status.enum';
import { PostEntity } from '../posts/entities/post.entity';
import { ProductEntity } from '../commerce/entities/product.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity) private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(UserStatusEntity) private readonly userStatusesRepo: Repository<UserStatusEntity>,
    @InjectRepository(MemberProfileEntity) private readonly memberProfilesRepo: Repository<MemberProfileEntity>,
    @InjectRepository(PostEntity) private readonly postsRepo: Repository<PostEntity>,
    @InjectRepository(ProductEntity) private readonly productsRepo: Repository<ProductEntity>,
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

  async updateMyProfile(
    userId: string,
    payload: { displayName?: string; avatarUrl?: string | null; email?: string | null },
  ) {
    const profile = await this.memberProfilesRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Member profile not found');

    if (payload.displayName !== undefined) {
      const nextName = payload.displayName.trim();
      profile.displayName = nextName.length > 0 ? nextName : profile.username;
    }
    if (payload.avatarUrl !== undefined) {
      profile.avatarUrl = payload.avatarUrl;
    }
    if (payload.email !== undefined) {
      const trimmed = payload.email?.trim() ?? '';
      profile.email = trimmed.length > 0 ? trimmed : null;
    }

    await this.memberProfilesRepo.save(profile);
    return this.getMeProfile(userId);
  }

  async getMemberStats(userId: string) {
    const [postsCount, productsCount] = await Promise.all([
      this.postsRepo.count({ where: { userId, status: 'PUBLISHED' } }),
      this.productsRepo.count({ where: { sellerId: userId, status: 'PUBLISHED' } }),
    ]);
    return { postsCount, productsCount };
  }

  async getMeProfile(userId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ['role', 'memberProfile', 'statuses'],
    });
    if (!user) throw new NotFoundException('User not found');
    const statuses = user.statuses.filter((status) => status.isActive).map((status) => status.statusCode as UserStatusCode);

    return {
      id: user.id,
      role: user.role.code,
      statuses,
      profile: user.memberProfile
        ? {
            username: user.memberProfile.username,
            email: user.memberProfile.email ?? null,
            displayName: user.memberProfile.displayName ?? null,
            avatarUrl: user.memberProfile.avatarUrl ?? null,
          }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
