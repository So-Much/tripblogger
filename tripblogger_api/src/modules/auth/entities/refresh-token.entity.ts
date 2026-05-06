import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('refresh_tokens')
@Index(['tokenJti'], { unique: true })
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'token_jti' })
  tokenJti!: string;

  @Column({ name: 'token_hash' })
  tokenHash!: string;

  @Column({ name: 'device_info', nullable: true })
  deviceInfo?: string;

  @Column({ name: 'expires_at', type: 'datetime2' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'datetime2', nullable: true })
  revokedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
