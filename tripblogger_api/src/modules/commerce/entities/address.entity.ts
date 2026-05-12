import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('addresses')
export class AddressEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'nvarchar', length: 64 })
  label!: string;

  @Column({ name: 'recipient_name', type: 'nvarchar', length: 256 })
  recipientName!: string;

  @Column({ type: 'nvarchar', length: 20 })
  phone!: string;

  @Column({ type: 'nvarchar', length: 128 })
  province!: string;

  @Column({ type: 'nvarchar', length: 128 })
  district!: string;

  @Column({ type: 'nvarchar', length: 128 })
  ward!: string;

  @Column({ type: 'nvarchar', length: 512 })
  street!: string;

  @Column({ name: 'is_default', type: 'bit', default: 0 })
  isDefault!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
