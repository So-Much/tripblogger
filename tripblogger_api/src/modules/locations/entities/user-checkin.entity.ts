import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { LocationEntity } from './location.entity';

export type CheckinPrivacyLevel = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';

@Entity('user_checkins')
export class UserCheckinEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uniqueidentifier' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'location_id', type: 'uniqueidentifier' })
  locationId!: string;

  @ManyToOne(() => LocationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location!: LocationEntity;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude!: string;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude!: string;

  @Column({ name: 'privacy_level', type: 'nvarchar', length: 16, default: 'PUBLIC' })
  privacyLevel!: CheckinPrivacyLevel;

  @Column({ name: 'checkin_time', type: 'datetime2', default: () => 'GETUTCDATE()' })
  checkinTime!: Date;
}
