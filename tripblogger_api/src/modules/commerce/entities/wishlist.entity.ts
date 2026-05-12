import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, Column } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { ProductEntity } from './product.entity';

@Entity('wishlists')
@Unique(['userId', 'productId'])
export class WishlistEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'product_id' })
  productId!: string;

  @ManyToOne(() => ProductEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
