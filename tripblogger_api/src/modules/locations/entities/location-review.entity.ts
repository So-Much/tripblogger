import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { LocationEntity } from './location.entity';

@Entity('location_reviews')
export class LocationReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'location_id', type: 'uniqueidentifier' })
  locationId!: string;

  @ManyToOne(() => LocationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location!: LocationEntity;

  @Column({ name: 'user_id', type: 'uniqueidentifier' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'tinyint' })
  rating!: number;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  content!: string | null;

  @Column({ name: 'trip_id', type: 'uniqueidentifier', nullable: true })
  tripId!: string | null;

  @Column({ name: 'trip_stop_id', type: 'uniqueidentifier', nullable: true })
  tripStopId!: string | null;

  @Column({ name: 'tags_json', type: 'nvarchar', length: 'max', nullable: true })
  tagsJson!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
