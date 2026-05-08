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
import { PostEntity } from './post.entity';
import { ReactEntity } from './react.entity';

@Entity('comments')
export class CommentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'post_id' })
  postId!: string;

  @ManyToOne(() => PostEntity, (p) => p.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post!: PostEntity;

  @Column({ name: 'content', type: 'text' })
  content!: string;

  @Column({ name: 'parent_comment_id', type: 'uniqueidentifier', nullable: true })
  parentCommentId!: string | null;

  @ManyToOne(() => CommentEntity, (c) => c.replies, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'parent_comment_id' })
  parent?: CommentEntity | null;

  @OneToMany(() => CommentEntity, (c) => c.parent)
  replies!: CommentEntity[];

  @OneToMany(() => ReactEntity, (r) => r.comment)
  reacts!: ReactEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
