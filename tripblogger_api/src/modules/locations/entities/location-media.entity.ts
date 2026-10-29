import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MediaEntity } from '../../media/entities/media.entity';
import { LocationEntity } from './location.entity';

@Entity('location_media')
export class LocationMediaEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'location_id', type: 'uniqueidentifier' })
  locationId!: string;

  @ManyToOne(() => LocationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location!: LocationEntity;

  @Column({ name: 'media_id', type: 'uniqueidentifier' })
  mediaId!: string;

  @ManyToOne(() => MediaEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  media!: MediaEntity;

  @Column({ name: 'is_primary', type: 'bit', default: false })
  isPrimary!: boolean;

  @Column({ name: 'aesthetic_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  aestheticScore!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
