import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MediaEntity } from '../../media/entities/media.entity';
import { PostEntity } from './post.entity';

/** Links a post to shared media rows (ordered gallery). */
@Entity('post_media')
export class PostMediaEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'post_id' })
  postId!: string;

  @ManyToOne(() => PostEntity, (p) => p.postMedia, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post!: PostEntity;

  @Column({ name: 'media_id' })
  mediaId!: string;

  @ManyToOne(() => MediaEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'media_id' })
  media!: MediaEntity;

  @Column({ type: 'int', default: 0 })
  position!: number;
}
