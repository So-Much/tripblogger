import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InviteMemberDto, TransferOwnerDto, UpdateMemberDto } from './dto/trip.dto';
import { TripMemberEntity } from './entities/trip-member.entity';
import { TripPermissionsService } from './trip-permissions.service';
import { mapMember } from './trips.mapper';

const MAX_MEMBERS_FREE = 10;

@Injectable()
export class TripMembersService {
  constructor(
    @InjectRepository(TripMemberEntity)
    private readonly membersRepo: Repository<TripMemberEntity>,
    private readonly permissions: TripPermissionsService,
  ) {}

  async list(tripId: string, userId: string) {
    await this.permissions.assertCan(tripId, userId, 'view');
    const members = await this.membersRepo.find({
      where: { tripId },
      relations: ['user', 'user.memberProfile'],
    });
    return members.map(mapMember);
  }

  async invite(tripId: string, userId: string, dto: InviteMemberDto) {
    await this.permissions.assertCan(tripId, userId, 'invite_members');
    const count = await this.membersRepo.count({
      where: { tripId, status: 'ACCEPTED' },
    });
    if (count >= MAX_MEMBERS_FREE) {
      throw new BadRequestException('Member limit reached');
    }
    const existing = await this.membersRepo.findOne({
      where: { tripId, userId: dto.userId },
    });
    if (existing && existing.status !== 'REMOVED') {
      throw new ConflictException('User already invited or member');
    }
    const member = await this.membersRepo.save(
      this.membersRepo.create({
        tripId,
        userId: dto.userId,
        role: dto.role,
        status: 'PENDING',
        note: dto.note ?? null,
      }),
    );
    return mapMember(
      await this.membersRepo.findOneOrFail({
        where: { id: member.id },
        relations: ['user', 'user.memberProfile'],
      }),
    );
  }

  async updateMember(tripId: string, memberId: string, userId: string, dto: UpdateMemberDto) {
    const member = await this.membersRepo.findOne({ where: { id: memberId, tripId } });
    if (!member) throw new NotFoundException('Member not found');

    if (dto.status === 'ACCEPTED' || dto.status === 'DECLINED') {
      if (member.userId !== userId) {
        throw new BadRequestException('Only invitee can accept or decline');
      }
      member.status = dto.status;
      if (dto.status === 'ACCEPTED') member.joinedAt = new Date();
    } else if (dto.role) {
      await this.permissions.assertCan(tripId, userId, 'invite_members');
      if (member.role === 'OWNER') throw new BadRequestException('Cannot change owner role here');
      member.role = dto.role;
    }

    await this.membersRepo.save(member);
    return mapMember(
      await this.membersRepo.findOneOrFail({
        where: { id: memberId },
        relations: ['user', 'user.memberProfile'],
      }),
    );
  }

  async remove(tripId: string, memberId: string, userId: string) {
    await this.permissions.assertCan(tripId, userId, 'remove_members');
    const member = await this.membersRepo.findOne({ where: { id: memberId, tripId } });
    if (!member) throw new NotFoundException('Member not found');
    if (member.role === 'OWNER') throw new BadRequestException('Cannot remove owner');
    member.status = 'REMOVED';
    await this.membersRepo.save(member);
    return { removed: true };
  }

  async transfer(tripId: string, userId: string, dto: TransferOwnerDto) {
    await this.permissions.assertCan(tripId, userId, 'transfer_owner');
    const owner = await this.membersRepo.findOne({
      where: { tripId, userId, role: 'OWNER', status: 'ACCEPTED' },
    });
    const target = await this.membersRepo.findOne({
      where: { tripId, userId: dto.newOwnerUserId, status: 'ACCEPTED' },
    });
    if (!owner || !target) throw new NotFoundException('Owner or target member not found');
    owner.role = 'EDITOR';
    target.role = 'OWNER';
    await this.membersRepo.save([owner, target]);
    return this.list(tripId, userId);
  }
}
