import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { MediaEntity } from '../../media/entities/media.entity';
import { TripCheckInEntity } from './trip-check-in.entity';

@Entity('trip_check_in_media')
export class TripCheckInMediaEntity {
  @PrimaryColumn({ name: 'check_in_id' })
  checkInId!: string;

  @PrimaryColumn({ name: 'media_id' })
  mediaId!: string;

  @ManyToOne(() => TripCheckInEntity, (c) => c.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'check_in_id' })
  checkIn!: TripCheckInEntity;

  @ManyToOne(() => MediaEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'media_id' })
  media!: MediaEntity;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
