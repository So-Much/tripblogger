import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { CouponAppliesTo, CouponStatus, CouponType } from '../constants';

@Entity('coupons')
export class CouponEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'nvarchar', length: 64, unique: true })
  code!: string;

  @Column({ type: 'nvarchar', length: 32 })
  type!: CouponType;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  value!: number;

  @Column({ name: 'min_order_value', type: 'decimal', precision: 18, scale: 2, nullable: true })
  minOrderValue!: number | null;

  @Column({ name: 'max_discount_amount', type: 'decimal', precision: 18, scale: 2, nullable: true })
  maxDiscountAmount!: number | null;

  @Column({ name: 'max_uses', type: 'int', nullable: true })
  maxUses!: number | null;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount!: number;

  @Column({ name: 'applies_to', type: 'nvarchar', length: 32, default: 'ALL' })
  appliesTo!: CouponAppliesTo;

  @Column({ name: 'applies_to_ids_json', type: 'nvarchar', length: 'MAX', nullable: true })
  appliesToIdsJson!: string | null;

  @Column({ type: 'nvarchar', length: 32, default: 'ACTIVE' })
  status!: CouponStatus;

  @Column({ name: 'active_at', type: 'datetime2' })
  activeAt!: Date;

  @Column({ name: 'expires_at', type: 'datetime2' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
