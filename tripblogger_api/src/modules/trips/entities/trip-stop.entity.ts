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
import { TripEntity } from './trip.entity';
import { TripDayEntity } from './trip-day.entity';
import type { PlanTravelMode } from './trip.entity';

export type StopPriority = 'must' | 'nice';
export type StopStatus = 'todo' | 'doing' | 'done' | 'skipped';

@Entity('trip_stops')
export class TripStopEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'trip_id', type: 'uniqueidentifier' })
  tripId!: string;

  @ManyToOne(() => TripEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip!: TripEntity;

  /** Null = idea bucket (not assigned to a day). */
  @Column({ name: 'trip_day_id', type: 'uniqueidentifier', nullable: true })
  tripDayId!: string | null;

  @ManyToOne(() => TripDayEntity, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'trip_day_id' })
  tripDay!: TripDayEntity | null;

  @Column({ type: 'int' })
  position!: number;

  @Column({ type: 'nvarchar', length: 255 })
  name!: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  address!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  lat!: string;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  lng!: string;

  @Column({ type: 'nvarchar', length: 64, nullable: true })
  category!: string | null;

  @Column({ name: 'external_place_id', type: 'nvarchar', length: 255, nullable: true })
  externalPlaceId!: string | null;

  @Column({ name: 'opening_hours_raw', type: 'nvarchar', length: 'max', nullable: true })
  openingHoursRaw!: string | null;

  @Column({ name: 'location_id', type: 'uniqueidentifier', nullable: true })
  locationId!: string | null;

  @ManyToOne(() => LocationEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'location_id' })
  location!: LocationEntity | null;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes!: number;

  @Column({ name: 'buffer_after_minutes', type: 'int', nullable: true })
  bufferAfterMinutes!: number | null;

  @Column({ name: 'travel_mode_override', type: 'nvarchar', length: 16, nullable: true })
  travelModeOverride!: PlanTravelMode | null;

  @Column({ name: 'anchor_time', type: 'nvarchar', length: 8, nullable: true })
  anchorTime!: string | null;

  @Column({ type: 'nvarchar', length: 16, default: 'nice' })
  priority!: StopPriority;

  @Column({ type: 'nvarchar', length: 16, default: 'todo' })
  status!: StopStatus;

  @Column({ name: 'travel_from_prev_seconds', type: 'int', nullable: true })
  travelFromPrevSeconds!: number | null;

  @Column({ name: 'travel_from_prev_distance_m', type: 'int', nullable: true })
  travelFromPrevDistanceM!: number | null;

  @Column({ name: 'travel_mode_used', type: 'nvarchar', length: 16, nullable: true })
  travelModeUsed!: PlanTravelMode | null;

  @Column({ name: 'travel_computed_at', type: 'datetime2', nullable: true })
  travelComputedAt!: Date | null;

  /** Reserved — no UI in wave 1. */
  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  note!: string | null;

  /** Reserved — wave 2. */
  @Column({ name: 'estimated_cost_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  estimatedCostAmount!: string | null;

  /** Reserved — wave 2. */
  @Column({ name: 'estimated_cost_currency', type: 'nvarchar', length: 8, nullable: true })
  estimatedCostCurrency!: string | null;

  /** JSON array of { id, label, unitAmount, quantity }. */
  @Column({ name: 'cost_items_json', type: 'nvarchar', length: 'max', nullable: true })
  costItemsJson!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
