import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MediaEntity } from '../../media/entities/media.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { DestinationEntity } from './destination.entity';
import { TripDayEntity } from './trip-day.entity';
import { TripMemberEntity } from './trip-member.entity';
import { TripTemplateEntity } from './trip-template.entity';

export type TripStatus =
  | 'DRAFT'
  | 'PLANNING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'ARCHIVED'
  | 'CANCELLED';

export type TripEditMode = 'AUTO' | 'MANUAL';

@Entity('trips')
export class TripEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ length: 255 })
  title!: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  description!: string | null;

  @Column({ name: 'destination_name', type: 'nvarchar', length: 255, nullable: true })
  destinationName!: string | null;

  @Column({ name: 'destination_id', type: 'uniqueidentifier', nullable: true })
  destinationId!: string | null;

  @ManyToOne(() => DestinationEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'destination_id' })
  destination!: DestinationEntity | null;

  @Column({ name: 'template_id', type: 'uniqueidentifier', nullable: true })
  templateId!: string | null;

  @ManyToOne(() => TripTemplateEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'template_id' })
  template!: TripTemplateEntity | null;

  @Column({ name: 'night_count', type: 'int', nullable: true })
  nightCount!: number | null;

  @Column({ name: 'edit_mode', type: 'nvarchar', length: 20, default: 'AUTO' })
  editMode!: TripEditMode;

  /** JSON array of location UUID strings */
  @Column({ name: 'pick_location_ids', type: 'nvarchar', length: 'max', nullable: true })
  pickLocationIds!: string | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ length: 50, default: 'DRAFT' })
  status!: TripStatus;

  @Column({ name: 'is_public', default: false })
  isPublic!: boolean;

  @Column({ name: 'is_favorite', default: false })
  isFavorite!: boolean;

  @Column({ name: 'cover_media_id', type: 'uniqueidentifier', nullable: true })
  coverMediaId!: string | null;

  @ManyToOne(() => MediaEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'cover_media_id' })
  coverMedia!: MediaEntity | null;

  @Column({ name: 'total_budget', type: 'decimal', precision: 15, scale: 2, nullable: true })
  totalBudget!: string | null;

  @Column({ name: 'actual_budget', type: 'decimal', precision: 15, scale: 2, nullable: true })
  actualBudget!: string | null;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  notes!: string | null;

  @OneToMany(() => TripDayEntity, (d) => d.trip)
  days!: TripDayEntity[];

  @OneToMany(() => TripMemberEntity, (m) => m.trip)
  members!: TripMemberEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
