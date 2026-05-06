import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { RoleEntity } from './role.entity';
import { GuestProfileEntity } from './guest-profile.entity';
import { MemberProfileEntity } from './member-profile.entity';
import { UserStatusEntity } from './user-status.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'role_id' })
  roleId!: string;

  @ManyToOne(() => RoleEntity, (role) => role.users, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role!: RoleEntity;

  @OneToOne(() => GuestProfileEntity, (profile) => profile.user)
  guestProfile?: GuestProfileEntity;

  @OneToOne(() => MemberProfileEntity, (profile) => profile.user)
  memberProfile?: MemberProfileEntity;

  @OneToMany(() => UserStatusEntity, (status) => status.user)
  statuses!: UserStatusEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
