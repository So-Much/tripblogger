import { Column, Entity, Index, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('member_profiles')
@Index('UX_member_profiles_email', ['email'], { unique: true, where: 'email IS NOT NULL' })
export class MemberProfileEntity {
  @PrimaryColumn({ name: 'user_id' })
  userId!: string;

  @OneToOne(() => UserEntity, (user) => user.memberProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ unique: true })
  username!: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ name: 'password_hash' })
  passwordHash!: string;

  @Column({ name: 'display_name', nullable: true })
  displayName?: string;

  @Column({ name: 'avatar_url', type: 'nvarchar', length: 512, nullable: true })
  avatarUrl?: string | null;

  @Column({ name: 'is_verified_seller', type: 'bit', default: false })
  isVerifiedSeller!: boolean;

  @Column({ name: 'total_travel_budget_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  totalTravelBudgetAmount!: string | null;

  @Column({ name: 'total_travel_budget_currency', type: 'nvarchar', length: 8, nullable: true })
  totalTravelBudgetCurrency!: string | null;
}
