import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TripEntity } from './trip.entity';

@Entity('trip_days')
export class TripDayEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'trip_id', type: 'uniqueidentifier' })
  tripId!: string;

  @ManyToOne(() => TripEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip!: TripEntity;

  @Column({ type: 'date' })
  date!: string;

  @Column({ name: 'day_index', type: 'int' })
  dayIndex!: number;

  @Column({ name: 'start_time', type: 'nvarchar', length: 8, nullable: true })
  startTime!: string | null;
}
