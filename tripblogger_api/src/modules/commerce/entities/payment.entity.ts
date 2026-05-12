import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { OrderEntity } from './order.entity';
import { PaymentMethod, PaymentStatus } from '../constants';

@Entity('payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', unique: true })
  orderId!: string;

  @ManyToOne(() => OrderEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity;

  @Column({ type: 'nvarchar', length: 32 })
  method!: PaymentMethod;

  @Column({ type: 'nvarchar', length: 32, default: 'PENDING' })
  status!: PaymentStatus;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount!: number;

  @Column({ name: 'transaction_ref', type: 'nvarchar', length: 256, nullable: true })
  transactionRef!: string | null;

  @Column({ name: 'gateway_response', type: 'nvarchar', length: 'MAX', nullable: true })
  gatewayResponse!: string | null;

  @Column({ name: 'paid_at', type: 'datetime2', nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
