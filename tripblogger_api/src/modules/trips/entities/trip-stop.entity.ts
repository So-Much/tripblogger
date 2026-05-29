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

export type TripStopStatus = 'PLANNED' | 'VISITING' | 'VISITED' | 'SKIPPED';
export type TransportMode =
  | 'WALK'
  | 'MOTORBIKE'
  | 'CAR'
  | 'TAXI'
  | 'BUS'
  | 'BOAT'
  | 'TRAIN'
  | 'PLANE';

@Entity('trip_stops')
export class TripStopEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'trip_day_id' })
  tripDayId!: string;

  @ManyToOne(() => TripDayEntity, (d) => d.stops, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_day_id' })
  tripDay!: TripDayEntity;

  @Column({ name: 'location_id', type: 'uniqueidentifier', nullable: true })
  locationId!: string | null;

  @ManyToOne(() => LocationEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'location_id' })
  location!: LocationEntity | null;

  @Column({ name: 'custom_name', type: 'nvarchar', length: 255, nullable: true })
  customName!: string | null;

  @Column({ name: 'custom_address', type: 'nvarchar', length: 'max', nullable: true })
  customAddress!: string | null;

  @Column({ name: 'custom_latitude', type: 'decimal', precision: 10, scale: 8, nullable: true })
  customLatitude!: string | null;

  @Column({ name: 'custom_longitude', type: 'decimal', precision: 11, scale: 8, nullable: true })
  customLongitude!: string | null;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex!: number;

  @Column({ name: 'arrival_time', type: 'time', nullable: true })
  arrivalTime!: string | null;

  @Column({ name: 'departure_time', type: 'time', nullable: true })
  departureTime!: string | null;

  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes!: number | null;

  @Column({ length: 20, default: 'PLANNED' })
  status!: TripStopStatus;

  @Column({ name: 'transport_mode', length: 20, default: 'WALK' })
  transportMode!: TransportMode;

  @Column({ name: 'distance_from_prev_km', type: 'decimal', precision: 6, scale: 2, nullable: true })
  distanceFromPrevKm!: string | null;

  @Column({ name: 'estimated_travel_min', type: 'int', nullable: true })
  estimatedTravelMin!: number | null;

  @Column({ name: 'budget_estimate', type: 'decimal', precision: 10, scale: 2, nullable: true })
  budgetEstimate!: string | null;

  @Column({ name: 'actual_spent', type: 'decimal', precision: 10, scale: 2, nullable: true })
  actualSpent!: string | null;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  notes!: string | null;

  @Column({ name: 'visited_at', type: 'datetime2', nullable: true })
  visitedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
