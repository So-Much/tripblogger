import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { TripEntity } from './trip.entity';

export type TripMemberRole = 'OWNER' | 'EDITOR' | 'VIEWER';
export type TripMemberStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REMOVED';

@Entity('trip_members')
export class TripMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'trip_id' })
  tripId!: string;

  @ManyToOne(() => TripEntity, (t) => t.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip!: TripEntity;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ length: 20, default: 'VIEWER' })
  role!: TripMemberRole;

  @Column({ length: 20, default: 'PENDING' })
  status!: TripMemberStatus;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  note!: string | null;

  @Column({ name: 'joined_at', type: 'datetime2', nullable: true })
  joinedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
