import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { OrderEntity } from './order.entity';
import { ShipmentCarrier, ShipmentStatus } from '../constants';

@Entity('shipments')
export class ShipmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id' })
  orderId!: string;

  @ManyToOne(() => OrderEntity)
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity;

  @Column({ name: 'seller_id' })
  sellerId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'seller_id' })
  seller!: UserEntity;

  @Column({ name: 'tracking_code', type: 'nvarchar', length: 128, nullable: true })
  trackingCode!: string | null;

  @Column({ type: 'nvarchar', length: 32, default: 'OTHER' })
  carrier!: ShipmentCarrier;

  @Column({ type: 'nvarchar', length: 32, default: 'WAITING' })
  status!: ShipmentStatus;

  @Column({ name: 'estimated_delivery', type: 'datetime2', nullable: true })
  estimatedDelivery!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
