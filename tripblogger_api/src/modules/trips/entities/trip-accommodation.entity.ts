import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { LocationEntity } from '../../locations/entities/location.entity';
import { TripEntity } from './trip.entity';

@Entity('trip_accommodations')
export class TripAccommodationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'trip_id' })
  tripId!: string;

  @ManyToOne(() => TripEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip!: TripEntity;

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

  @Column({ name: 'check_in', type: 'date' })
  checkIn!: string;

  @Column({ name: 'check_out', type: 'date' })
  checkOut!: string;

  @Column({ name: 'room_type', type: 'nvarchar', length: 100, nullable: true })
  roomType!: string | null;

  @Column({ name: 'confirmation_code', type: 'nvarchar', length: 100, nullable: true })
  confirmationCode!: string | null;

  @Column({ name: 'price_per_night', type: 'decimal', precision: 10, scale: 2, nullable: true })
  pricePerNight!: string | null;

  @Column({ name: 'price_currency', length: 3, default: 'VND' })
  priceCurrency!: string;

  @Column({ name: 'is_primary', default: true })
  isPrimary!: boolean;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
