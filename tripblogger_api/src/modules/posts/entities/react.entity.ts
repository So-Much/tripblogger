import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { CommentEntity } from './comment.entity';
import { PostEntity } from './post.entity';
import { ReactTypeEntity } from './react-type.entity';

@Entity('reacts')
export class ReactEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'post_id', type: 'uniqueidentifier', nullable: true })
  postId!: string | null;

  @ManyToOne(() => PostEntity, (p) => p.reacts, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'post_id' })
  post!: PostEntity | null;

  @Column({ name: 'comment_id', type: 'uniqueidentifier', nullable: true })
  commentId!: string | null;

  @ManyToOne(() => CommentEntity, (c) => c.reacts, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'comment_id' })
  comment!: CommentEntity | null;

  @Column({ name: 'type_id' })
  typeId!: string;

  @ManyToOne(() => ReactTypeEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'type_id' })
  type!: ReactTypeEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
