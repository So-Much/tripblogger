import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EventBlockEntity } from './event-block.entity';
import { TripCheckInMediaEntity } from './trip-check-in-media.entity';
import { TripEntity } from './trip.entity';

@Entity('trip_check_ins')
export class TripCheckInEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'trip_id' })
  tripId!: string;

  @ManyToOne(() => TripEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip!: TripEntity;

  @Column({ name: 'event_block_id', type: 'uniqueidentifier', nullable: true })
  eventBlockId!: string | null;

  @ManyToOne(() => EventBlockEntity, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'event_block_id' })
  eventBlock!: EventBlockEntity | null;

  @Column({ name: 'checked_in_at', type: 'datetime2' })
  checkedInAt!: Date;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude!: string | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude!: string | null;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  note!: string | null;

  @OneToMany(() => TripCheckInMediaEntity, (m) => m.checkIn)
  media!: TripCheckInMediaEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
