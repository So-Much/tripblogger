import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { ProductEntity } from './product.entity';
import { OrderEntity } from './order.entity';
import { OrderProductStatus } from '../constants';

@Entity('order_products')
export class OrderProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id' })
  orderId!: string;

  @ManyToOne(() => OrderEntity, (o) => o.orderProducts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity;

  @Column({ name: 'product_id' })
  productId!: string;

  @ManyToOne(() => ProductEntity)
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  @Column({ name: 'seller_id' })
  sellerId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'seller_id' })
  seller!: UserEntity;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ name: 'price_snapshot', type: 'decimal', precision: 18, scale: 2 })
  priceSnapshot!: number;

  @Column({ name: 'product_title_snapshot', type: 'nvarchar', length: 512 })
  productTitleSnapshot!: string;

  @Column({ type: 'nvarchar', length: 32, default: 'PROCESSING' })
  status!: OrderProductStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
