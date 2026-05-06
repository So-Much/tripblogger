import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { StatusCatalogEntity } from './status-catalog.entity';

@Entity('user_statuses')
export class UserStatusEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, (user) => user.statuses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'status_code' })
  statusCode!: string;

  @ManyToOne(() => StatusCatalogEntity, { eager: true })
  @JoinColumn({ name: 'status_code', referencedColumnName: 'code' })
  status!: StatusCatalogEntity;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'source', nullable: true })
  source?: string;

  @CreateDateColumn({ name: 'set_at' })
  setAt!: Date;
}
