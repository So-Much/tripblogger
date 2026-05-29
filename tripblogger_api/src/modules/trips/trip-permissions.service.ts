import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripEntity } from './entities/trip.entity';
import { TripMemberEntity, TripMemberRole, TripMemberStatus } from './entities/trip-member.entity';

export type TripAction =
  | 'view'
  | 'edit_trip'
  | 'edit_stops'
  | 'manage_accommodations'
  | 'invite_members'
  | 'remove_members'
  | 'delete_trip'
  | 'change_public'
  | 'transfer_owner';

const MATRIX: Record<TripAction, TripMemberRole[]> = {
  view: ['OWNER', 'EDITOR', 'VIEWER'],
  edit_trip: ['OWNER', 'EDITOR'],
  edit_stops: ['OWNER', 'EDITOR'],
  manage_accommodations: ['OWNER', 'EDITOR'],
  invite_members: ['OWNER', 'EDITOR'],
  remove_members: ['OWNER'],
  delete_trip: ['OWNER'],
  change_public: ['OWNER'],
  transfer_owner: ['OWNER'],
};

@Injectable()
export class TripPermissionsService {
  constructor(
    @InjectRepository(TripEntity)
    private readonly tripsRepo: Repository<TripEntity>,
    @InjectRepository(TripMemberEntity)
    private readonly membersRepo: Repository<TripMemberEntity>,
  ) {}

  async getMembership(tripId: string, userId: string): Promise<TripMemberEntity | null> {
    return this.membersRepo.findOne({
      where: { tripId, userId, status: 'ACCEPTED' },
    });
  }

  async assertCan(tripId: string, userId: string, action: TripAction): Promise<TripMemberEntity> {
    const trip = await this.tripsRepo.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');

    const member = await this.getMembership(tripId, userId);
    if (!member) {
      if (action === 'view' && trip.isPublic) {
        return {
          id: '',
          tripId,
          userId,
          role: 'VIEWER',
          status: 'ACCEPTED' as TripMemberStatus,
          note: null,
          joinedAt: null,
          createdAt: new Date(),
        } as TripMemberEntity;
      }
      throw new ForbiddenException('Not a member of this trip');
    }

    const allowed = MATRIX[action];
    if (!allowed.includes(member.role)) {
      throw new ForbiddenException(`Cannot perform ${action} with role ${member.role}`);
    }

    if (['edit_trip', 'edit_stops', 'manage_accommodations', 'invite_members'].includes(action)) {
      if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
        throw new ForbiddenException('Trip is read-only');
      }
    }

    return member;
  }

  async assertOwner(tripId: string, userId: string): Promise<TripMemberEntity> {
    const member = await this.assertCan(tripId, userId, 'delete_trip');
    return member;
  }
}
