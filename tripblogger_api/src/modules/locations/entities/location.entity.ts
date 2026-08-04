import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LocationTypeEntity } from './location-type.entity';

export type LocationStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'INACTIVE';
export type LocationSourceType = 'MANUAL' | 'PHOTON' | 'NOMINATIM' | 'GOOGLE';
export type LocationSlotType = 'POI' | 'FOOD' | 'STAY';

@Entity('locations')
export class LocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'location_type_id', type: 'uniqueidentifier', nullable: true })
  locationTypeId!: string | null;

  @ManyToOne(() => LocationTypeEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'location_type_id' })
  locationType!: LocationTypeEntity | null;

  @Column({ type: 'nvarchar', length: 255 })
  name!: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  address!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude!: string;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude!: string;

  @Column({ type: 'nvarchar', length: 32, default: 'ACTIVE' })
  status!: LocationStatus;

  @Column({ name: 'source_type', type: 'nvarchar', length: 32, default: 'MANUAL' })
  sourceType!: LocationSourceType;

  @Column({ name: 'external_source', type: 'nvarchar', length: 32, nullable: true })
  externalSource!: string | null;

  @Column({ name: 'external_id', type: 'nvarchar', length: 255, nullable: true })
  externalId!: string | null;

  @Column({ name: 'google_place_id', type: 'nvarchar', length: 255, nullable: true })
  googlePlaceId!: string | null;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  phone!: string | null;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  website!: string | null;

  @Column({ name: 'avg_rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  avgRating!: string;

  @Column({ name: 'total_review', type: 'int', default: 0 })
  totalReview!: number;

  @Column({ name: 'popularity_score', type: 'decimal', precision: 8, scale: 4, default: 0 })
  popularityScore!: string;

  @Column({ name: 'price_level', type: 'tinyint', nullable: true })
  priceLevel!: number | null;

  @Column({ name: 'open_hours_json', type: 'nvarchar', length: 'max', nullable: true })
  openHoursJson!: string | null;

  @Column({ name: 'destination_id', type: 'uniqueidentifier', nullable: true })
  destinationId!: string | null;

  @Column({ name: 'featured_rank', type: 'int', nullable: true })
  featuredRank!: number | null;

  @Column({ name: 'default_duration_min', type: 'int', nullable: true })
  defaultDurationMin!: number | null;

  @Column({ name: 'slot_type', type: 'nvarchar', length: 20, nullable: true })
  slotType!: LocationSlotType | null;

  /** JSON string array, e.g. ["GLAMPING","CENTRAL"] */
  @Column({ name: 'vibe_tags', type: 'nvarchar', length: 'max', nullable: true })
  vibeTags!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
