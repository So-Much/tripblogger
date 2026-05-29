import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LocationEntity } from '../../locations/entities/location.entity';
import { TripAccommodationEntity } from './trip-accommodation.entity';
import { TripEntity } from './trip.entity';

@Entity('trip_recommendations')
export class TripRecommendationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'trip_id' })
  tripId!: string;

  @ManyToOne(() => TripEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip!: TripEntity;

  @Column({ name: 'location_id' })
  locationId!: string;

  @ManyToOne(() => LocationEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'location_id' })
  location!: LocationEntity;

  @Column({ name: 'based_on_accommodation_id', type: 'uniqueidentifier', nullable: true })
  basedOnAccommodationId!: string | null;

  @ManyToOne(() => TripAccommodationEntity, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'based_on_accommodation_id' })
  basedOnAccommodation!: TripAccommodationEntity | null;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0 })
  score!: string;

  @Column({ name: 'recommendation_basis_json', type: 'nvarchar', length: 'max', nullable: true })
  recommendationBasisJson!: string | null;

  @Column({ name: 'distance_km', type: 'decimal', precision: 6, scale: 2, nullable: true })
  distanceKm!: string | null;

  @Column({ name: 'estimated_duration_min', type: 'int', nullable: true })
  estimatedDurationMin!: number | null;

  @Column({ name: 'is_dismissed', default: false })
  isDismissed!: boolean;

  @Column({ name: 'is_added', default: false })
  isAdded!: boolean;

  @Column({ name: 'generated_at', type: 'datetime2' })
  generatedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
