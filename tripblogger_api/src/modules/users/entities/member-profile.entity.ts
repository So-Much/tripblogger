import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('member_profiles')
export class MemberProfileEntity {
  @PrimaryColumn({ name: 'user_id' })
  userId!: string;

  @OneToOne(() => UserEntity, (user) => user.memberProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ unique: true })
  username!: string;

  @Column({ type: 'nvarchar', length: 255, unique: true, nullable: true })
  email?: string | null;

  @Column({ name: 'password_hash' })
  passwordHash!: string;

  @Column({ name: 'display_name', nullable: true })
  displayName?: string;

  @Column({ name: 'avatar_url', type: 'nvarchar', length: 512, nullable: true })
  avatarUrl?: string | null;
}
