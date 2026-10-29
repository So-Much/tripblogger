import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TripStopEntity } from './trip-stop.entity';

export type SystemStopTag = 'accommodation';

@Entity('trip_stop_tags')
export class TripStopTagEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'trip_stop_id', type: 'uniqueidentifier' })
  tripStopId!: string;

  @ManyToOne(() => TripStopEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_stop_id' })
  tripStop!: TripStopEntity;

  @Column({ type: 'nvarchar', length: 64 })
  tag!: string;

  @Column({ name: 'is_system', type: 'bit', default: false })
  isSystem!: boolean;
}
