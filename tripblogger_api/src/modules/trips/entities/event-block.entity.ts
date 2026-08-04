import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LocationEntity } from '../../locations/entities/location.entity';
import { TripDayEntity } from './trip-day.entity';
import { TripEntity } from './trip.entity';

export type EventBlockSlotType = 'POI' | 'FOOD' | 'STAY' | 'CUSTOM';
export type EventBlockStatus = 'PLANNED' | 'DONE' | 'SKIPPED';
export type EventBlockSource = 'TEMPLATE' | 'PICK' | 'SWAP' | 'MANUAL';

@Entity('event_blocks')
export class EventBlockEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'trip_id' })
  tripId!: string;

  @ManyToOne(() => TripEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip!: TripEntity;

  @Column({ name: 'trip_day_id', type: 'uniqueidentifier', nullable: true })
  tripDayId!: string | null;

  @ManyToOne(() => TripDayEntity, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'trip_day_id' })
  tripDay!: TripDayEntity | null;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex!: number;

  @Column({ name: 'location_id', type: 'uniqueidentifier', nullable: true })
  locationId!: string | null;

  @ManyToOne(() => LocationEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'location_id' })
  location!: LocationEntity | null;

  @Column({ name: 'custom_name', type: 'nvarchar', length: 255, nullable: true })
  customName!: string | null;

  @Column({ name: 'custom_address', type: 'nvarchar', length: 'max', nullable: true })
  customAddress!: string | null;

  @Column({ name: 'custom_lat', type: 'decimal', precision: 10, scale: 8, nullable: true })
  customLat!: string | null;

  @Column({ name: 'custom_lng', type: 'decimal', precision: 11, scale: 8, nullable: true })
  customLng!: string | null;

  @Column({ name: 'slot_type', type: 'nvarchar', length: 20, default: 'POI' })
  slotType!: EventBlockSlotType;

  @Column({ type: 'nvarchar', length: 20, default: 'PLANNED' })
  status!: EventBlockStatus;

  @Column({ type: 'nvarchar', length: 20, default: 'PICK' })
  source!: EventBlockSource;

  @Column({ name: 'planned_duration_min', type: 'int', default: 60 })
  plannedDurationMin!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
