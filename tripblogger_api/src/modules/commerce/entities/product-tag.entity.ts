import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ProductEntity } from './product.entity';
import { TagEntity } from './tag.entity';

@Entity('product_tags')
export class ProductTagEntity {
  @PrimaryColumn({ name: 'product_id' })
  productId!: string;

  @PrimaryColumn({ name: 'tag_id' })
  tagId!: string;

  @ManyToOne(() => ProductEntity, (p) => p.productTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  @ManyToOne(() => TagEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag!: TagEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
