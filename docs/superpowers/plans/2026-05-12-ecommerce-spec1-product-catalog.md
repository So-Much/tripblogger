# Product & Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete product catalog system with a new "Shop" tab, enabling members to create, manage, and browse travel-related products.

**Architecture:** Single `CommerceModule` in NestJS backend with entities for Product, Category, Tag, ProductTag, and SellerVerification. Frontend uses Expo Router file-based routing with a new `shop/` tab stack. Follows existing PostsModule patterns.

**Tech Stack:** NestJS + TypeORM + MSSQL, Expo SDK 54 + React Native 0.81 + Zustand + React Query + Axios

---

### Task 1: Backend — Entity Definitions

**Files:**
- Create: `tripblogger_api/src/modules/commerce/entities/category.entity.ts`
- Create: `tripblogger_api/src/modules/commerce/entities/tag.entity.ts`
- Create: `tripblogger_api/src/modules/commerce/entities/product.entity.ts`
- Create: `tripblogger_api/src/modules/commerce/entities/product-tag.entity.ts`
- Create: `tripblogger_api/src/modules/commerce/entities/seller-verification.entity.ts`
- Create: `tripblogger_api/src/modules/commerce/constants.ts`

- [ ] **Step 1: Create commerce constants file**

```typescript
// tripblogger_api/src/modules/commerce/constants.ts
export const PRODUCT_STATUSES = [
  'DRAFT', 'PENDING_REVIEW', 'PENDING_VERIFICATION', 'PUBLISHED',
  'RESERVED', 'OUTOFSTOCK', 'SOLD', 'RETURNED', 'REFUNDED',
  'BLOCKED', 'REMOVED', 'PREORDER', 'NEEDSPHOTOS',
] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_TYPES = ['NEW', 'SECONDHAND'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const SELLER_VERIFICATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type SellerVerificationStatus = (typeof SELLER_VERIFICATION_STATUSES)[number];

export const DEFAULT_STOCK_UNIT = 'cái';
```

- [ ] **Step 2: Create CategoryEntity**

```typescript
// tripblogger_api/src/modules/commerce/entities/category.entity.ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('categories')
export class CategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'nvarchar', length: 256, unique: true })
  name!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

- [ ] **Step 3: Create TagEntity**

```typescript
// tripblogger_api/src/modules/commerce/entities/tag.entity.ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tags')
export class TagEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'nvarchar', length: 128, unique: true })
  name!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

- [ ] **Step 4: Create ProductEntity**

```typescript
// tripblogger_api/src/modules/commerce/entities/product.entity.ts
import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
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

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  price!: number;

  @Column({ name: 'product_type', type: 'nvarchar', length: 32, default: "'NEW'" })
  productType!: ProductType;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  @Column({ name: 'stock_unit', type: 'nvarchar', length: 64, default: "'cái'" })
  stockUnit!: string;

  @Column({ type: 'nvarchar', length: 32, default: "'DRAFT'" })
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
```

- [ ] **Step 5: Create ProductTagEntity**

```typescript
// tripblogger_api/src/modules/commerce/entities/product-tag.entity.ts
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
```

- [ ] **Step 6: Create SellerVerificationEntity**

```typescript
// tripblogger_api/src/modules/commerce/entities/seller-verification.entity.ts
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { SellerVerificationStatus } from '../constants';

@Entity('seller_verifications')
export class SellerVerificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'nvarchar', length: 32, default: "'PENDING'" })
  status!: SellerVerificationStatus;

  @CreateDateColumn({ name: 'requested_at' })
  requestedAt!: Date;

  @Column({ name: 'reviewed_at', type: 'datetime2', nullable: true })
  reviewedAt!: Date | null;

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedBy!: string | null;
}
```

- [ ] **Step 7: Add is_verified_seller to MemberProfileEntity**

Modify: `tripblogger_api/src/modules/users/entities/member-profile.entity.ts`

Add column:
```typescript
@Column({ name: 'is_verified_seller', type: 'bit', default: false })
isVerifiedSeller!: boolean;
```

- [ ] **Step 8: Commit**

```bash
git add tripblogger_api/src/modules/commerce/
git add tripblogger_api/src/modules/users/entities/member-profile.entity.ts
git commit -m "feat(commerce): add entity definitions for product catalog"
```

---

### Task 2: Backend — Database Migration

**Files:**
- Create: `tripblogger_api/src/migrations/1760000004000-commerce-foundation.ts`
- Modify: `tripblogger_api/src/config/db/typeorm.datasource.ts`

- [ ] **Step 1: Create commerce foundation migration**

```typescript
// tripblogger_api/src/migrations/1760000004000-commerce-foundation.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommerceFoundation1760000004000 implements MigrationInterface {
  name = 'CommerceFoundation1760000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE categories (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        name nvarchar(256) NOT NULL UNIQUE,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE tags (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        name nvarchar(128) NOT NULL UNIQUE,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE products_commerce (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        seller_id uniqueidentifier NOT NULL,
        category_id uniqueidentifier NOT NULL,
        title nvarchar(512) NOT NULL,
        slug nvarchar(512) NOT NULL UNIQUE,
        tags_json nvarchar(max) NULL,
        media_json nvarchar(max) NULL,
        description nvarchar(max) NOT NULL,
        price decimal(18,2) NOT NULL,
        product_type nvarchar(32) NOT NULL DEFAULT 'NEW',
        stock int NOT NULL DEFAULT 0,
        stock_unit nvarchar(64) NOT NULL DEFAULT N'cái',
        status nvarchar(32) NOT NULL DEFAULT 'DRAFT',
        analytics_json nvarchar(max) NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        published_at datetime2 NULL,
        CONSTRAINT CK_products_type CHECK (product_type IN ('NEW', 'SECONDHAND')),
        CONSTRAINT CK_products_status CHECK (status IN (
          'DRAFT','PENDING_REVIEW','PENDING_VERIFICATION','PUBLISHED',
          'RESERVED','OUTOFSTOCK','SOLD','RETURNED','REFUNDED',
          'BLOCKED','REMOVED','PREORDER','NEEDSPHOTOS'
        )),
        CONSTRAINT CK_products_price CHECK (price >= 0),
        CONSTRAINT CK_products_stock CHECK (stock >= 0),
        CONSTRAINT FK_products_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IX_products_seller ON products_commerce(seller_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IX_products_category ON products_commerce(category_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IX_products_status ON products_commerce(status);
    `);

    await queryRunner.query(`
      CREATE TABLE product_tags (
        product_id uniqueidentifier NOT NULL,
        tag_id uniqueidentifier NOT NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_product_tags PRIMARY KEY (product_id, tag_id),
        CONSTRAINT FK_pt_product FOREIGN KEY (product_id) REFERENCES products_commerce(id) ON DELETE CASCADE,
        CONSTRAINT FK_pt_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE seller_verifications (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        user_id uniqueidentifier NOT NULL,
        status nvarchar(32) NOT NULL DEFAULT 'PENDING',
        requested_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        reviewed_at datetime2 NULL,
        reviewed_by uniqueidentifier NULL,
        CONSTRAINT CK_sv_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
        CONSTRAINT FK_sv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_sv_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)
      );
    `);

    await queryRunner.query(`
      ALTER TABLE member_profiles ADD is_verified_seller bit NOT NULL DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE member_profiles DROP COLUMN is_verified_seller;`);
    await queryRunner.query(`DROP TABLE IF EXISTS seller_verifications;`);
    await queryRunner.query(`DROP TABLE IF EXISTS product_tags;`);
    await queryRunner.query(`DROP TABLE IF EXISTS products_commerce;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tags;`);
    await queryRunner.query(`DROP TABLE IF EXISTS categories;`);
  }
}
```

- [ ] **Step 2: Add new entities to typeorm datasource**

Modify `tripblogger_api/src/config/db/typeorm.datasource.ts` — add imports for all new commerce entities and include them in the `entities` array.

- [ ] **Step 3: Run migration**

```bash
cd tripblogger_api
npm run migration:run
```

Expected: Migration runs successfully, tables are created.

- [ ] **Step 4: Commit**

```bash
git add tripblogger_api/src/migrations/1760000004000-commerce-foundation.ts
git add tripblogger_api/src/config/db/typeorm.datasource.ts
git commit -m "feat(commerce): add database migration for product catalog tables"
```

---

### Task 3: Backend — Seed Categories

**Files:**
- Create: `tripblogger_api/src/scripts/seed-categories.ts`

- [ ] **Step 1: Create seed script**

```typescript
// tripblogger_api/src/scripts/seed-categories.ts
import 'dotenv/config';
import 'reflect-metadata';
import dataSource from '../config/db/typeorm.datasource';

const CATEGORIES = [
  'Outdoor Gear',
  'Travel Tech',
  'Luggage & Bags',
  'Clothing',
  'Accessories',
  'Camping',
  'Photography',
  'Books & Maps',
];

async function main() {
  await dataSource.initialize();
  for (const name of CATEGORIES) {
    const exists = await dataSource.query(
      `SELECT 1 FROM categories WHERE name = @0`, [name],
    );
    if (exists.length === 0) {
      await dataSource.query(
        `INSERT INTO categories (id, name) VALUES (NEWID(), @0)`, [name],
      );
      console.log(`Seeded category: ${name}`);
    } else {
      console.log(`Category already exists: ${name}`);
    }
  }
  await dataSource.destroy();
  console.log('Done.');
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Add npm script**

Add to `tripblogger_api/package.json` scripts:
```json
"seed:categories": "ts-node src/scripts/seed-categories.ts"
```

- [ ] **Step 3: Run seed**

```bash
cd tripblogger_api
npm run seed:categories
```

Expected: 8 categories seeded.

- [ ] **Step 4: Commit**

```bash
git add tripblogger_api/src/scripts/seed-categories.ts tripblogger_api/package.json
git commit -m "feat(commerce): add category seed script with 8 travel categories"
```

---

### Task 4: Backend — DTOs

**Files:**
- Create: `tripblogger_api/src/modules/commerce/dto/create-product.dto.ts`
- Create: `tripblogger_api/src/modules/commerce/dto/update-product.dto.ts`
- Create: `tripblogger_api/src/modules/commerce/dto/query-products.dto.ts`
- Create: `tripblogger_api/src/modules/commerce/dto/create-category.dto.ts`

- [ ] **Step 1: Create CreateProductDto**

```typescript
// tripblogger_api/src/modules/commerce/dto/create-product.dto.ts
import { Type } from 'class-transformer';
import {
  IsArray, IsIn, IsNumber, IsOptional, IsString,
  MaxLength, Min, MinLength,
} from 'class-validator';
import { PRODUCT_TYPES, ProductType } from '../constants';

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  title!: string;

  @IsString()
  categoryId!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price!: number;

  @IsIn([...PRODUCT_TYPES])
  productType!: ProductType;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  stock!: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  stockUnit?: string;

  @IsOptional()
  @IsArray()
  media?: Array<{
    type: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
    previewUrl?: string;
    originalUrl?: string;
  }>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
```

- [ ] **Step 2: Create UpdateProductDto**

```typescript
// tripblogger_api/src/modules/commerce/dto/update-product.dto.ts
import { Type } from 'class-transformer';
import {
  IsArray, IsIn, IsNumber, IsOptional, IsString,
  MaxLength, Min, MinLength,
} from 'class-validator';
import { PRODUCT_TYPES, ProductType } from '../constants';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  title?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price?: number;

  @IsOptional()
  @IsIn([...PRODUCT_TYPES])
  productType?: ProductType;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  stockUnit?: string;

  @IsOptional()
  @IsArray()
  media?: Array<{
    type: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
    previewUrl?: string;
    originalUrl?: string;
  }>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
```

- [ ] **Step 3: Create QueryProductsDto**

```typescript
// tripblogger_api/src/modules/commerce/dto/query-products.dto.ts
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryPublicProductsDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['NEW', 'SECONDHAND'])
  productType?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxPrice?: number;

  @IsOptional()
  @IsIn(['newest', 'price_asc', 'price_desc', 'popular'])
  sortBy?: string;
}

export class QueryMyProductsDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
```

- [ ] **Step 4: Create CreateCategoryDto**

```typescript
// tripblogger_api/src/modules/commerce/dto/create-category.dto.ts
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  name!: string;
}
```

- [ ] **Step 5: Commit**

```bash
git add tripblogger_api/src/modules/commerce/dto/
git commit -m "feat(commerce): add DTOs for product and category endpoints"
```

---

### Task 5: Backend — Commerce Service (Products)

**Files:**
- Create: `tripblogger_api/src/modules/commerce/commerce.service.ts`

- [ ] **Step 1: Create commerce service with slug generation and product CRUD**

The service should implement:
- `createProduct(sellerId, dto)` — creates DRAFT product, auto-generates slug from title + random suffix, auto-creates tags, initializes analytics JSON
- `findPublicProducts(query)` — cursor-based pagination, search by title (LIKE), filter by category/type/price, sort options
- `findMyProducts(sellerId, query)` — seller's own products
- `findOneProduct(id, userId?)` — single product detail, increments views
- `updateProduct(sellerId, id, dto)` — owner only, handles tag sync
- `publishProduct(sellerId, id)` — DRAFT -> PUBLISHED, validates required fields
- `softDeleteProduct(sellerId, id)` — sets status to REMOVED

Pattern to follow: `tripblogger_api/src/modules/posts/posts.service.ts` for cursor pagination, error handling, and repository patterns.

Key implementation details:
- Slug: `title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + randomUUID().slice(0, 8)`
- Analytics init: `JSON.stringify({ views: 0, saves: 0, shares: 0, avgRating: 0, totalRatings: 0, ratingDistribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } })`
- Cursor encoding/decoding: reuse pattern from `cursor.util.ts`
- Tags: on create/update, parse tags array, find-or-create TagEntity for each, sync ProductTagEntity
- View increment: `UPDATE products_commerce SET analytics_json = ... WHERE id = @0` (parse, increment, serialize)

- [ ] **Step 2: Verify service compiles**

```bash
cd tripblogger_api
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add tripblogger_api/src/modules/commerce/commerce.service.ts
git commit -m "feat(commerce): implement product CRUD service with pagination and search"
```

---

### Task 6: Backend — Categories & Tags Services

**Files:**
- Create: `tripblogger_api/src/modules/commerce/categories.service.ts`
- Create: `tripblogger_api/src/modules/commerce/tags.service.ts`

- [ ] **Step 1: Create categories service**

```typescript
// tripblogger_api/src/modules/commerce/categories.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
  ) {}

  async findAll() {
    return this.categoryRepo.find({ order: { name: 'ASC' } });
  }

  async create(dto: CreateCategoryDto) {
    const exists = await this.categoryRepo.findOne({ where: { name: dto.name } });
    if (exists) throw new BadRequestException('Category already exists');
    const entity = this.categoryRepo.create({ name: dto.name });
    return this.categoryRepo.save(entity);
  }

  async update(id: string, dto: CreateCategoryDto) {
    const entity = await this.categoryRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Category not found');
    entity.name = dto.name;
    return this.categoryRepo.save(entity);
  }

  async remove(id: string) {
    const entity = await this.categoryRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Category not found');
    await this.categoryRepo.remove(entity);
    return { ok: true };
  }
}
```

- [ ] **Step 2: Create tags service**

```typescript
// tripblogger_api/src/modules/commerce/tags.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { TagEntity } from './entities/tag.entity';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(TagEntity)
    private readonly tagRepo: Repository<TagEntity>,
  ) {}

  async search(query?: string) {
    if (!query) return this.tagRepo.find({ take: 20, order: { name: 'ASC' } });
    return this.tagRepo.find({
      where: { name: Like(`%${query}%`) },
      take: 20,
      order: { name: 'ASC' },
    });
  }

  async findOrCreate(name: string): Promise<TagEntity> {
    const normalized = name.trim().toLowerCase();
    let tag = await this.tagRepo.findOne({ where: { name: normalized } });
    if (!tag) {
      tag = this.tagRepo.create({ name: normalized });
      tag = await this.tagRepo.save(tag);
    }
    return tag;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add tripblogger_api/src/modules/commerce/categories.service.ts
git add tripblogger_api/src/modules/commerce/tags.service.ts
git commit -m "feat(commerce): add categories and tags services"
```

---

### Task 7: Backend — Seller Verification Service

**Files:**
- Create: `tripblogger_api/src/modules/commerce/seller-verification.service.ts`

- [ ] **Step 1: Create seller verification service**

```typescript
// tripblogger_api/src/modules/commerce/seller-verification.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberProfileEntity } from '../users/entities/member-profile.entity';
import { SellerVerificationEntity } from './entities/seller-verification.entity';

@Injectable()
export class SellerVerificationService {
  constructor(
    @InjectRepository(SellerVerificationEntity)
    private readonly verificationRepo: Repository<SellerVerificationEntity>,
    @InjectRepository(MemberProfileEntity)
    private readonly profileRepo: Repository<MemberProfileEntity>,
  ) {}

  async requestVerification(userId: string) {
    const existing = await this.verificationRepo.findOne({
      where: [
        { userId, status: 'PENDING' },
        { userId, status: 'APPROVED' },
      ],
    });
    if (existing?.status === 'APPROVED') {
      throw new BadRequestException('Already verified');
    }
    if (existing?.status === 'PENDING') {
      throw new BadRequestException('Verification request already pending');
    }
    const entity = this.verificationRepo.create({ userId, status: 'PENDING' });
    return this.verificationRepo.save(entity);
  }

  async getStatus(userId: string) {
    return this.verificationRepo.findOne({
      where: { userId },
      order: { requestedAt: 'DESC' },
    });
  }

  async approve(userId: string, adminId: string) {
    const entity = await this.verificationRepo.findOne({
      where: { userId, status: 'PENDING' },
    });
    if (!entity) throw new NotFoundException('No pending verification request');
    entity.status = 'APPROVED';
    entity.reviewedAt = new Date();
    entity.reviewedBy = adminId;
    await this.verificationRepo.save(entity);
    await this.profileRepo.update({ userId }, { isVerifiedSeller: true });
    return entity;
  }

  async reject(userId: string, adminId: string) {
    const entity = await this.verificationRepo.findOne({
      where: { userId, status: 'PENDING' },
    });
    if (!entity) throw new NotFoundException('No pending verification request');
    entity.status = 'REJECTED';
    entity.reviewedAt = new Date();
    entity.reviewedBy = adminId;
    return this.verificationRepo.save(entity);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add tripblogger_api/src/modules/commerce/seller-verification.service.ts
git commit -m "feat(commerce): add seller verification service"
```

---

### Task 8: Backend — Controllers

**Files:**
- Create: `tripblogger_api/src/modules/commerce/commerce.controller.ts`
- Create: `tripblogger_api/src/modules/commerce/categories.controller.ts`
- Create: `tripblogger_api/src/modules/commerce/seller-verification.controller.ts`

- [ ] **Step 1: Create commerce controller (products)**

Follow the pattern from `tripblogger_api/src/modules/posts/posts.controller.ts`:
- Guards: `@UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)`, `@Roles('MEMBER')`, `@RequiredStatuses('ACTIVE')`
- Endpoints: `POST /`, `GET /`, `GET /mine`, `GET /:id`, `PATCH /:id`, `POST /:id/publish`, `DELETE /:id`, `POST /media`
- Media upload: reuse the same multer/sharp pattern but save to `uploads/commerce/`
- Controller prefix: `@Controller('commerce/products')`

- [ ] **Step 2: Create categories controller**

```typescript
// tripblogger_api/src/modules/commerce/categories.controller.ts
@Controller('commerce/categories')
```

Endpoints:
- `GET /` — public, returns all categories
- `POST /` — ADMIN only, creates category
- `PATCH /:id` — ADMIN only, updates category
- `DELETE /:id` — ADMIN only, deletes category

Note: ADMIN role check — the existing `@Roles('ADMIN')` decorator should work since RolesGuard checks `request.user.role`. Need to verify ADMIN role exists in the roles seed.

- [ ] **Step 3: Create seller verification controller**

```typescript
// tripblogger_api/src/modules/commerce/seller-verification.controller.ts
@Controller('commerce')
```

Endpoints:
- `POST /seller/verify` — MEMBER, creates verification request
- `GET /seller/verification-status` — MEMBER, returns status
- `POST /admin/seller/:userId/approve` — ADMIN, approves
- `POST /admin/seller/:userId/reject` — ADMIN, rejects

Also add a `GET /commerce/tags` endpoint (on commerce controller or a separate controller) for tag autocomplete.

- [ ] **Step 4: Verify compilation**

```bash
cd tripblogger_api
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add tripblogger_api/src/modules/commerce/commerce.controller.ts
git add tripblogger_api/src/modules/commerce/categories.controller.ts
git add tripblogger_api/src/modules/commerce/seller-verification.controller.ts
git commit -m "feat(commerce): add controllers for products, categories, and seller verification"
```

---

### Task 9: Backend — Commerce Module & App Integration

**Files:**
- Create: `tripblogger_api/src/modules/commerce/commerce.module.ts`
- Modify: `tripblogger_api/src/app.module.ts`

- [ ] **Step 1: Create commerce module**

```typescript
// tripblogger_api/src/modules/commerce/commerce.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { CategoryEntity } from './entities/category.entity';
import { TagEntity } from './entities/tag.entity';
import { ProductEntity } from './entities/product.entity';
import { ProductTagEntity } from './entities/product-tag.entity';
import { SellerVerificationEntity } from './entities/seller-verification.entity';
import { MemberProfileEntity } from '../users/entities/member-profile.entity';
import { CommerceController } from './commerce.controller';
import { CategoriesController } from './categories.controller';
import { SellerVerificationController } from './seller-verification.controller';
import { CommerceService } from './commerce.service';
import { CategoriesService } from './categories.service';
import { TagsService } from './tags.service';
import { SellerVerificationService } from './seller-verification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductEntity, CategoryEntity, TagEntity,
      ProductTagEntity, SellerVerificationEntity, MemberProfileEntity,
    ]),
    UsersModule,
  ],
  controllers: [CommerceController, CategoriesController, SellerVerificationController],
  providers: [
    CommerceService, CategoriesService, TagsService,
    SellerVerificationService, RolesGuard, StatusesGuard,
  ],
  exports: [CommerceService, CategoriesService, TagsService],
})
export class CommerceModule {}
```

- [ ] **Step 2: Add CommerceModule to AppModule**

Add `CommerceModule` to imports array in `tripblogger_api/src/app.module.ts`.

- [ ] **Step 3: Verify app starts**

```bash
cd tripblogger_api
npm run start:dev
```

Expected: App starts without errors, Swagger shows new endpoints.

- [ ] **Step 4: Commit**

```bash
git add tripblogger_api/src/modules/commerce/commerce.module.ts
git add tripblogger_api/src/app.module.ts
git commit -m "feat(commerce): register CommerceModule in app"
```

---

### Task 10: Frontend — Types & API Service

**Files:**
- Modify: `tripblogger_app/src/types/commerce.ts`
- Create: `tripblogger_app/src/services/api/commerce.service.ts`

- [ ] **Step 1: Update commerce types**

Replace the existing `CommerceDeal` interface in `tripblogger_app/src/types/commerce.ts` with full product types:

```typescript
export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'OUTOFSTOCK' | 'SOLD' | 'REMOVED' | 'BLOCKED' | 'PENDING_REVIEW';
export type ProductType = 'NEW' | 'SECONDHAND';

export interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  originalUrl?: string;
}

export interface SellerInfo {
  id: string;
  displayName: string;
  username: string;
  isVerifiedSeller: boolean;
  avatarUrl?: string | null;
}

export interface CategoryDto {
  id: string;
  name: string;
}

export interface TagDto {
  id: string;
  name: string;
}

export interface ProductDto {
  id: string;
  sellerId: string;
  seller: SellerInfo;
  categoryId: string;
  category: CategoryDto;
  title: string;
  slug: string;
  tags: string[];
  media: MediaItem[];
  description: string;
  price: number;
  productType: ProductType;
  stock: number;
  stockUnit: string;
  status: ProductStatus;
  analytics: { views: number; saves: number; shares: number; avgRating: number; totalRatings: number };
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface PaginatedProducts {
  items: ProductDto[];
  nextCursor: string | null;
  total: number;
}

export interface CommerceDeal {
  id: string;
  title: string;
  shopName: string;
  priceLabel: string;
  soldLabel: string;
  badge: string;
}
```

- [ ] **Step 2: Create commerce API service**

Create `tripblogger_app/src/services/api/commerce.service.ts` following the pattern of `posts.service.ts`:
- Import `apiClient` and `apiBaseUrl` from `./client`
- Add `toAbsolute` and `normalizeProduct` helpers for media URLs
- Methods: `listCategories`, `listPublicProducts`, `listMyProducts`, `getProduct`, `createProduct`, `updateProduct`, `publishProduct`, `deleteProduct`, `uploadMedia`, `searchTags`, `requestSellerVerification`, `getVerificationStatus`

- [ ] **Step 3: Commit**

```bash
git add tripblogger_app/src/types/commerce.ts
git add tripblogger_app/src/services/api/commerce.service.ts
git commit -m "feat(commerce): add frontend types and API service for products"
```

---

### Task 11: Frontend — Shop Tab & Navigation

**Files:**
- Create: `tripblogger_app/app/(tabs)/shop/_layout.tsx`
- Create: `tripblogger_app/app/(tabs)/shop/index.tsx`
- Create: `tripblogger_app/app/(tabs)/shop/[id].tsx`
- Create: `tripblogger_app/app/(tabs)/shop/search.tsx`
- Create: `tripblogger_app/app/(tabs)/shop/my-products.tsx`
- Create: `tripblogger_app/app/(tabs)/shop/create.tsx`
- Modify: `tripblogger_app/app/(tabs)/_layout.tsx`
- Modify: `tripblogger_app/src/i18n/index.ts`

- [ ] **Step 1: Add i18n keys for commerce**

Add commerce keys to both `vi` and `en` dictionaries in `tripblogger_app/src/i18n/index.ts`. Add keys for: `tabShop`, `shopSearch`, `shopCategories`, `shopAllProducts`, `productNew`, `productSecondhand`, `productCreate`, `productEdit`, `productPublish`, `productSaveDraft`, `productDelete`, `productMyProducts`, `productEmpty`, `productPrice`, `productStock`, and more as needed.

- [ ] **Step 2: Create shop stack layout**

```typescript
// tripblogger_app/app/(tabs)/shop/_layout.tsx
import { Stack } from 'expo-router';

export default function ShopLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 3: Add Shop tab to bottom tabs**

Modify `tripblogger_app/app/(tabs)/_layout.tsx`:
- Add `<Tabs.Screen name="shop" ...>` between posts and explore tabs
- Icon: `cart.fill` (SF Symbol)
- Title: `t('tabShop')`

- [ ] **Step 4: Create route files**

Create minimal route files that import screen components:

```typescript
// app/(tabs)/shop/index.tsx
import { ShopScreen } from '@/src/screens/ShopScreen';
export default function ShopTabRoute() { return <ShopScreen />; }
```

Similar for `[id].tsx`, `search.tsx`, `my-products.tsx`, `create.tsx`.

- [ ] **Step 5: Verify app compiles**

```bash
cd tripblogger_app
npx expo start
```

Expected: App loads with 4 tabs, Shop tab shows (even if screen is placeholder).

- [ ] **Step 6: Commit**

```bash
git add tripblogger_app/app/(tabs)/shop/
git add tripblogger_app/app/(tabs)/_layout.tsx
git add tripblogger_app/src/i18n/index.ts
git commit -m "feat(commerce): add Shop tab with navigation stack"
```

---

### Task 12: Frontend — Commerce Components

**Files:**
- Create: `tripblogger_app/src/components/commerce/ProductCard.tsx`
- Create: `tripblogger_app/src/components/commerce/ProductGrid.tsx`
- Create: `tripblogger_app/src/components/commerce/CategoryChip.tsx`
- Create: `tripblogger_app/src/components/commerce/SellerBadge.tsx`
- Create: `tripblogger_app/src/components/commerce/PriceLabel.tsx`
- Create: `tripblogger_app/src/components/commerce/ProductTypeBadge.tsx`
- Create: `tripblogger_app/src/components/commerce/StockInfo.tsx`

- [ ] **Step 1: Create PriceLabel component**

Formats VND price: `1234000` -> `1.234.000 ₫`

```typescript
// Simple formatting with Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
```

- [ ] **Step 2: Create ProductTypeBadge component**

Small badge showing "Mới" (green) or "2nd" (orange).

- [ ] **Step 3: Create SellerBadge component**

Seller name + verified checkmark icon if `isVerifiedSeller`.

- [ ] **Step 4: Create CategoryChip component**

Horizontal pill/badge with category name. Pressable, shows selected state.

- [ ] **Step 5: Create StockInfo component**

Text: "Còn {stock} {stockUnit}" or "Hết hàng" if stock = 0.

- [ ] **Step 6: Create ProductCard component**

Grid card (width ~= screen/2 - gaps):
- expo-image for thumbnail (first media item)
- Title (2 lines max, ellipsis)
- PriceLabel
- ProductTypeBadge
- SellerBadge
- Pressable -> navigate to product detail

- [ ] **Step 7: Create ProductGrid component**

FlatList wrapper with 2 columns, `onEndReached` for infinite scroll, pull-to-refresh.

- [ ] **Step 8: Commit**

```bash
git add tripblogger_app/src/components/commerce/
git commit -m "feat(commerce): add product listing UI components"
```

---

### Task 13: Frontend — ShopScreen

**Files:**
- Create: `tripblogger_app/src/screens/ShopScreen.tsx`

- [ ] **Step 1: Implement ShopScreen**

Layout (vertical):
1. Header: "Shop" title + cart icon + wishlist icon
2. Search bar (tappable, `router.push('/shop/search')`)
3. Categories horizontal ScrollView (use CategoryChip, fetch from API with useQuery)
4. Product grid (ProductGrid component, infinite scroll, fetch PUBLISHED products)

Use `@tanstack/react-query` for data fetching:
- `useQuery(['categories'], commerceService.listCategories)`
- `useInfiniteQuery(['products', filters], ...)` for paginated product list

Handle states: loading, empty, error.

Follow styling patterns from `HomeScreen.tsx`: SafeArea insets, ThemedView, theme colors.

- [ ] **Step 2: Verify screen renders**

Test: Navigate to Shop tab, see categories and product grid (will be empty initially but should render without errors).

- [ ] **Step 3: Commit**

```bash
git add tripblogger_app/src/screens/ShopScreen.tsx
git commit -m "feat(commerce): implement ShopScreen with categories and product grid"
```

---

### Task 14: Frontend — ProductDetailScreen

**Files:**
- Create: `tripblogger_app/src/screens/ProductDetailScreen.tsx`

- [ ] **Step 1: Implement ProductDetailScreen**

Layout:
1. Image carousel (horizontal ScrollView/FlatList with pagination dots)
2. Price + ProductType badge
3. Title
4. Seller card (avatar placeholder, display name, verified badge)
5. Description (expandable with "Xem thêm")
6. Tags (horizontal chips)
7. Stock info
8. Bottom sticky bar: "Thêm vào giỏ" + "Mua ngay" + heart icon (placeholder for Spec 2)

Use `useQuery(['product', id], () => commerceService.getProduct(id))`.

"Thêm vào giỏ" and "Mua ngay" buttons are placeholder (show toast or log for now, will connect in Spec 2).

- [ ] **Step 2: Commit**

```bash
git add tripblogger_app/src/screens/ProductDetailScreen.tsx
git commit -m "feat(commerce): implement ProductDetailScreen with image carousel"
```

---

### Task 15: Frontend — Product Create/Edit Screen

**Files:**
- Create: `tripblogger_app/src/components/commerce/TagInput.tsx`
- Create: `tripblogger_app/src/components/commerce/CategoryPicker.tsx`
- Create: `tripblogger_app/src/components/commerce/MediaPickerGrid.tsx`
- Create: `tripblogger_app/src/screens/ProductCreateScreen.tsx`

- [ ] **Step 1: Create TagInput component**

Text input with autocomplete dropdown. Selected tags shown as removable chips above/below input. Fetches suggestions from `commerceService.searchTags(query)`.

- [ ] **Step 2: Create CategoryPicker component**

Bottom sheet or modal picker. Fetches categories from API. Single selection.

- [ ] **Step 3: Create MediaPickerGrid component**

Grid of image thumbnails with "+" button to add more (up to 10). Uses `expo-image-picker`. Shows remove button on each image.

- [ ] **Step 4: Implement ProductCreateScreen**

Use `react-hook-form` with `zod` resolver (consistent with existing auth forms):
- Title, Category (CategoryPicker), Tags (TagInput), Description, Price, ProductType (toggle), Stock, StockUnit (text input with suggestions), Media (MediaPickerGrid)
- Bottom: "Lưu nháp" (saveDraft) and "Đăng bán" (publish) buttons
- Edit mode: if `route.params.productId`, fetch product and pre-fill form

Mutations: `useMutation` for `commerceService.createProduct` / `commerceService.updateProduct`.
Media upload: upload each image via `commerceService.uploadMedia`, collect URLs, include in create/update payload.

- [ ] **Step 5: Commit**

```bash
git add tripblogger_app/src/components/commerce/TagInput.tsx
git add tripblogger_app/src/components/commerce/CategoryPicker.tsx
git add tripblogger_app/src/components/commerce/MediaPickerGrid.tsx
git add tripblogger_app/src/screens/ProductCreateScreen.tsx
git commit -m "feat(commerce): implement product creation screen with form and media upload"
```

---

### Task 16: Frontend — MyProductsScreen & SearchScreen

**Files:**
- Create: `tripblogger_app/src/screens/MyProductsScreen.tsx`
- Create: `tripblogger_app/src/screens/SearchScreen.tsx`

- [ ] **Step 1: Implement MyProductsScreen**

- Horizontal filter tabs: All / Draft / Published / Sold / Out of Stock
- Product list (FlatList, 1 column, detailed rows)
- Each item: thumbnail, title, price, status badge, stock count
- FAB: "+" button to navigate to create screen
- Swipe to edit/delete
- Fetch with `useInfiniteQuery(['myProducts', status], ...)`

- [ ] **Step 2: Implement SearchScreen**

- Auto-focus text input at top
- Debounced search (300ms)
- Filter options: Category chip bar, ProductType toggle, Price range
- Results: ProductGrid (2 columns)
- Empty state: "Không tìm thấy sản phẩm"

- [ ] **Step 3: Commit**

```bash
git add tripblogger_app/src/screens/MyProductsScreen.tsx
git add tripblogger_app/src/screens/SearchScreen.tsx
git commit -m "feat(commerce): implement MyProducts and Search screens"
```

---

### Task 17: Frontend — Store & Integration Polish

**Files:**
- Create: `tripblogger_app/src/store/commerce.store.ts`
- Modify: `tripblogger_app/src/components/commerce/CommerceWidgetRow.tsx` (update to use real data)
- Modify: `tripblogger_app/src/screens/HomeScreen.tsx` (connect commerce widget to real API)

- [ ] **Step 1: Create commerce store**

```typescript
// tripblogger_app/src/store/commerce.store.ts
import { create } from 'zustand';

interface CommerceState {
  selectedCategoryId: string | null;
  searchQuery: string;
  cartItemCount: number;
  setSelectedCategoryId: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  setCartItemCount: (count: number) => void;
}

export const useCommerceStore = create<CommerceState>((set) => ({
  selectedCategoryId: null,
  searchQuery: '',
  cartItemCount: 0,
  setSelectedCategoryId: (id) => set({ selectedCategoryId: id }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setCartItemCount: (count) => set({ cartItemCount: count }),
}));
```

- [ ] **Step 2: Update HomeScreen commerce widget**

Replace mock `COMMERCE_DEALS` with real product data from API (fetch latest 5 PUBLISHED products). Keep the `CommerceWidgetRow` component but feed it real data, or create a new hook.

- [ ] **Step 3: Commit**

```bash
git add tripblogger_app/src/store/commerce.store.ts
git add tripblogger_app/src/components/commerce/CommerceWidgetRow.tsx
git add tripblogger_app/src/screens/HomeScreen.tsx
git commit -m "feat(commerce): add commerce store and connect HomeScreen widget to real API"
```

---

### Task 18: End-to-End Verification

- [ ] **Step 1: Start backend and verify API**

```bash
cd tripblogger_api
npm run start:dev
```

Test with Swagger or curl:
1. `GET /commerce/categories` — returns 8 seeded categories
2. `POST /commerce/products` — creates a product (need auth token)
3. `GET /commerce/products` — lists public products
4. `GET /commerce/tags?search=...` — tag autocomplete

- [ ] **Step 2: Start frontend and verify UI**

```bash
cd tripblogger_app
npx expo start
```

Verify:
1. 4 tabs visible (Home, Posts, Shop, Settings)
2. Shop tab shows categories and product grid
3. Can navigate to product detail
4. Can create a product (login first)
5. Product appears in listing after publish

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(commerce): complete Spec 1 - Product & Catalog"
```
