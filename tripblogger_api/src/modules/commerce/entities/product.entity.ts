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
import { CategoryEntity } from './category.entity';
import { ProductTagEntity } from './product-tag.entity';
import { ProductStatus, ProductType } from '../constants';

@Entity('products_commerce')
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'seller_id' })
  sellerId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller!: UserEntity;

  @Column({ name: 'category_id' })
  categoryId!: string;

  @ManyToOne(() => CategoryEntity)
  @JoinColumn({ name: 'category_id' })
  category!: CategoryEntity;

  @Column({ type: 'nvarchar', length: 512 })
  title!: string;

  @Column({ type: 'nvarchar', length: 512, unique: true })
  slug!: string;

  @Column({ name: 'tags_json', type: 'nvarchar', length: 'MAX', nullable: true })
  tagsJson!: string | null;

  @Column({ name: 'media_json', type: 'nvarchar', length: 'MAX', nullable: true })
  mediaJson!: string | null;

  @Column({ type: 'nvarchar', length: 'MAX' })
  description!: string;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => (v == null ? 0 : parseFloat(v)),
    },
  })
  price!: number;

  @Column({ name: 'product_type', type: 'nvarchar', length: 32, default: 'NEW' })
  productType!: ProductType;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  @Column({ name: 'stock_unit', type: 'nvarchar', length: 64, default: 'cái' })
  stockUnit!: string;

  @Column({ type: 'nvarchar', length: 32, default: 'DRAFT' })
  status!: ProductStatus;

  @Column({ name: 'analytics_json', type: 'nvarchar', length: 'MAX', nullable: true })
  analyticsJson!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'published_at', type: 'datetime2', nullable: true })
  publishedAt!: Date | null;

  @OneToMany(() => ProductTagEntity, (pt) => pt.product)
  productTags!: ProductTagEntity[];
}
