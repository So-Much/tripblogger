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
import { TripEntity } from './trip.entity';
import { TripStopEntity } from './trip-stop.entity';

@Entity('trip_days')
export class TripDayEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'trip_id' })
  tripId!: string;

  @ManyToOne(() => TripEntity, (t) => t.days, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip!: TripEntity;

  @Column({ type: 'date' })
  date!: string;

  @Column({ name: 'day_number', type: 'int' })
  dayNumber!: number;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  title!: string | null;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  theme!: string | null;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  notes!: string | null;

  @Column({ name: 'total_distance_km', type: 'decimal', precision: 6, scale: 2, nullable: true })
  totalDistanceKm!: string | null;

  @OneToMany(() => TripStopEntity, (s) => s.tripDay)
  stops!: TripStopEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
