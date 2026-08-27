import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

export type PlanTravelMode = 'motorbike' | 'car' | 'foot' | 'bike';
export type TripStatus = 'draft' | 'active' | 'completed' | 'archived';

@Entity('trips')
export class TripEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uniqueidentifier' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'nvarchar', length: 255 })
  title!: string;

  @Column({ name: 'destination_label', type: 'nvarchar', length: 255 })
  destinationLabel!: string;

  @Column({ name: 'destination_lat', type: 'decimal', precision: 10, scale: 8 })
  destinationLat!: string;

  @Column({ name: 'destination_lng', type: 'decimal', precision: 11, scale: 8 })
  destinationLng!: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ name: 'default_travel_mode', type: 'nvarchar', length: 16, default: 'motorbike' })
  defaultTravelMode!: PlanTravelMode;

  @Column({ name: 'default_buffer_minutes', type: 'int', default: 15 })
  defaultBufferMinutes!: number;

  @Column({ name: 'default_day_start_time', type: 'nvarchar', length: 8, default: '08:00' })
  defaultDayStartTime!: string;

  @Column({ type: 'nvarchar', length: 16, default: 'draft' })
  status!: TripStatus;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ name: 'budget_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  budgetAmount!: string | null;

  @Column({ name: 'budget_currency', type: 'nvarchar', length: 8, nullable: true })
  budgetCurrency!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
