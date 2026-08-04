import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { PostEntity } from '../../posts/entities/post.entity';
import { TripEntity } from './trip.entity';

@Entity('trip_posts')
export class TripPostEntity {
  @PrimaryColumn({ name: 'trip_id' })
  tripId!: string;

  @PrimaryColumn({ name: 'post_id' })
  postId!: string;

  @ManyToOne(() => TripEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip!: TripEntity;

  @ManyToOne(() => PostEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'post_id' })
  post!: PostEntity;

  @CreateDateColumn({ name: 'linked_at' })
  linkedAt!: Date;

  @Column({ name: 'assemble_kind', type: 'nvarchar', length: 32, nullable: true })
  assembleKind!: 'BLOG_DRAFT' | null;
}
