import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('guest_profiles')
export class GuestProfileEntity {
  @PrimaryColumn({ name: 'user_id' })
  userId!: string;

  @OneToOne(() => UserEntity, (user) => user.guestProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'session_id', unique: true })
  sessionId!: string;

  @Column({ name: 'browsing_history', type: 'nvarchar', length: 'max', nullable: true })
  browsingHistory?: string;
}
