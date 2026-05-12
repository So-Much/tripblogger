import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { CartEntity } from './cart.entity';
import { ProductEntity } from './product.entity';

@Entity('cart_products')
@Unique(['cartId', 'productId'])
export class CartProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'cart_id' })
  cartId!: string;

  @ManyToOne(() => CartEntity, (c) => c.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart!: CartEntity;

  @Column({ name: 'product_id' })
  productId!: string;

  @ManyToOne(() => ProductEntity)
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ name: 'price_snapshot', type: 'decimal', precision: 18, scale: 2 })
  priceSnapshot!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
