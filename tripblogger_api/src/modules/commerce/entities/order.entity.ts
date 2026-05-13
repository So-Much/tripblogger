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
import { AddressEntity } from './address.entity';
import { CouponEntity } from './coupon.entity';
import { OrderProductEntity } from './order-product.entity';
import { OrderStatus } from '../constants';

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_code', type: 'nvarchar', length: 32, unique: true })
  orderCode!: string;

  @Column({ name: 'buyer_id' })
  buyerId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'buyer_id' })
  buyer!: UserEntity;

  @Column({ name: 'address_id', nullable: true })
  addressId!: string | null;

  @ManyToOne(() => AddressEntity, { nullable: true })
  @JoinColumn({ name: 'address_id' })
  address!: AddressEntity | null;

  @Column({ name: 'guest_recipient_name', type: 'nvarchar', length: 256, nullable: true })
  guestRecipientName!: string | null;

  @Column({ name: 'guest_phone', type: 'nvarchar', length: 20, nullable: true })
  guestPhone!: string | null;

  @Column({ name: 'guest_email', type: 'nvarchar', length: 256, nullable: true })
  guestEmail!: string | null;

  @Column({ name: 'guest_province', type: 'nvarchar', length: 128, nullable: true })
  guestProvince!: string | null;

  @Column({ name: 'guest_district', type: 'nvarchar', length: 128, nullable: true })
  guestDistrict!: string | null;

  @Column({ name: 'guest_ward', type: 'nvarchar', length: 128, nullable: true })
  guestWard!: string | null;

  @Column({ name: 'guest_street', type: 'nvarchar', length: 512, nullable: true })
  guestStreet!: string | null;

  @Column({ name: 'coupon_id', nullable: true })
  couponId!: string | null;

  @ManyToOne(() => CouponEntity, { nullable: true })
  @JoinColumn({ name: 'coupon_id' })
  coupon!: CouponEntity | null;

  @Column({ type: 'nvarchar', length: 32, default: 'PENDING' })
  status!: OrderStatus;

  @Column({ name: 'sub_total', type: 'decimal', precision: 18, scale: 2 })
  subTotal!: number;

  @Column({ name: 'shipping_fee', type: 'decimal', precision: 18, scale: 2, default: 0 })
  shippingFee!: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  discountAmount!: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 18, scale: 2 })
  totalAmount!: number;

  @Column({ type: 'nvarchar', length: 1024, nullable: true })
  note!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => OrderProductEntity, (op) => op.order)
  orderProducts!: OrderProductEntity[];
}
