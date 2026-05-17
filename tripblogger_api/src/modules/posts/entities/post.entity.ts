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
import { UserEntity } from '../../users/entities/user.entity';
import { CommentEntity } from './comment.entity';
import { MediaEntity } from './media.entity';
import { ReactEntity } from './react.entity';

export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'DELETED';
export type PostVisibility = 'PUBLIC' | 'PRIVATE';

@Entity('posts')
export class PostEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ length: 512 })
  title!: string;

  @Column({ name: 'content_html', type: 'text' })
  contentHtml!: string;

  @Column({ type: 'nvarchar', length: 128, nullable: true })
  category!: string | null;

  @Column({ name: 'tags_json', type: 'text', nullable: true })
  tagsJson!: string | null;

  @Column({ length: 32, default: 'PUBLIC' })
  visibility!: PostVisibility;

  @Column({ name: 'location_json', type: 'text', nullable: true })
  locationJson!: string | null;

  @Column({ length: 32, default: 'DRAFT' })
  status!: PostStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => MediaEntity, (m) => m.post)
  media!: MediaEntity[];

  @OneToMany(() => CommentEntity, (c) => c.post)
  comments!: CommentEntity[];

  @OneToMany(() => ReactEntity, (r) => r.post)
  reacts!: ReactEntity[];
}
