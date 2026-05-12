import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { ProductEntity } from './product.entity';
import { OrderProductEntity } from './order-product.entity';

@Entity('product_ratings')
@Unique(['productId', 'userId', 'orderProductId'])
export class ProductRatingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id' })
  productId!: string;

  @ManyToOne(() => ProductEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'order_product_id' })
  orderProductId!: string;

  @ManyToOne(() => OrderProductEntity)
  @JoinColumn({ name: 'order_product_id' })
  orderProduct!: OrderProductEntity;

  @Column({ type: 'int' })
  score!: number;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  review!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
