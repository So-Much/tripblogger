import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CompositionEntity } from '../../compositions/entities/composition.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { PostEntity } from './post.entity';

@Entity('media')
export class MediaEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'post_id', nullable: true })
  postId!: string | null;

  @ManyToOne(() => PostEntity, (p) => p.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post!: PostEntity | null;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ length: 32 })
  type!: 'icon' | 'image' | 'video';

  @Column({ type: 'nvarchar', length: 1024 })
  url!: string;

  @Column({ name: 'thumbnail_url', type: 'nvarchar', length: 1024, nullable: true })
  thumbnailUrl!: string | null;

  @Column({ name: 'preview_url', type: 'nvarchar', length: 1024, nullable: true })
  previewUrl!: string | null;

  @Column({ name: 'original_url', type: 'nvarchar', length: 1024, nullable: true })
  originalUrl!: string | null;

  @Column({ name: 'mime_type', type: 'nvarchar', length: 128, nullable: true })
  mimeType!: string | null;

  @Column({ type: 'int', nullable: true })
  width!: number | null;

  @Column({ type: 'int', nullable: true })
  height!: number | null;

  @Column({ type: 'bigint', nullable: true })
  size!: string | null;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  placeholder!: string | null;

  @Column({ type: 'nvarchar', length: 32, nullable: true, default: 'local' })
  storage!: string | null;

  @Column({ name: 'source_path', type: 'nvarchar', length: 512, nullable: true })
  sourcePath!: string | null;

  @Column({ name: 'composition_id', nullable: true })
  compositionId!: string | null;

  @ManyToOne(() => CompositionEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'composition_id' })
  composition!: CompositionEntity | null;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
