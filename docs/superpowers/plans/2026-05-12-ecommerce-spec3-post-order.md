# Post-Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the order lifecycle with payment tracking (COD), shipment management (mock carrier), and product ratings/reviews.

**Architecture:** Extends existing `CommerceModule` with shipment and rating entities, services, and controllers. Enhances existing OrderDetailScreen and ProductDetailScreen with new sections.

**Tech Stack:** NestJS + TypeORM + MSSQL, Expo SDK 54 + React Native 0.81 + Zustand + React Query + Axios

**Depends on:** Spec 1 and Spec 2 must be completed first.

---

### Task 1: Backend — Shipment & Rating Entities

**Files:**
- Create: `tripblogger_api/src/modules/commerce/entities/shipment.entity.ts`
- Create: `tripblogger_api/src/modules/commerce/entities/product-rating.entity.ts`
- Modify: `tripblogger_api/src/modules/commerce/constants.ts`

- [ ] **Step 1: Add shipment and rating constants**

Add to `constants.ts`:

```typescript
export const SHIPMENT_CARRIERS = ['GHN', 'GHTK', 'VNPOST', 'OTHER'] as const;
export type ShipmentCarrier = (typeof SHIPMENT_CARRIERS)[number];

export const SHIPMENT_STATUSES = ['WAITING', 'PICKING', 'INTRANSIT', 'DELIVERED', 'FAILED'] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  WAITING: ['PICKING', 'INTRANSIT'],
  PICKING: ['INTRANSIT'],
  INTRANSIT: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  FAILED: [],
};
```

- [ ] **Step 2: Create ShipmentEntity**

```typescript
// tripblogger_api/src/modules/commerce/entities/shipment.entity.ts
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

  @Column({ type: 'nvarchar', length: 32, default: "'OTHER'" })
  carrier!: ShipmentCarrier;

  @Column({ type: 'nvarchar', length: 32, default: "'WAITING'" })
  status!: ShipmentStatus;

  @Column({ name: 'estimated_delivery', type: 'datetime2', nullable: true })
  estimatedDelivery!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
```

- [ ] **Step 3: Create ProductRatingEntity**

```typescript
// tripblogger_api/src/modules/commerce/entities/product-rating.entity.ts
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

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
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
```

- [ ] **Step 4: Commit**

```bash
git add tripblogger_api/src/modules/commerce/entities/shipment.entity.ts
git add tripblogger_api/src/modules/commerce/entities/product-rating.entity.ts
git add tripblogger_api/src/modules/commerce/constants.ts
git commit -m "feat(commerce): add shipment and product rating entities"
```

---

### Task 2: Backend — Post-Order Migration

**Files:**
- Create: `tripblogger_api/src/migrations/1760000006000-commerce-post-order.ts`

- [ ] **Step 1: Create migration**

Creates tables: `shipments`, `product_ratings`.

```sql
CREATE TABLE shipments (
  id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
  order_id uniqueidentifier NOT NULL,
  seller_id uniqueidentifier NOT NULL,
  tracking_code nvarchar(128) NULL,
  carrier nvarchar(32) NOT NULL DEFAULT 'OTHER',
  status nvarchar(32) NOT NULL DEFAULT 'WAITING',
  estimated_delivery datetime2 NULL,
  created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
  updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT CK_shipment_carrier CHECK (carrier IN ('GHN','GHTK','VNPOST','OTHER')),
  CONSTRAINT CK_shipment_status CHECK (status IN ('WAITING','PICKING','INTRANSIT','DELIVERED','FAILED')),
  CONSTRAINT FK_shipment_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT FK_shipment_seller FOREIGN KEY (seller_id) REFERENCES users(id)
);
CREATE INDEX IX_shipments_order ON shipments(order_id);

CREATE TABLE product_ratings (
  id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
  product_id uniqueidentifier NOT NULL,
  user_id uniqueidentifier NOT NULL,
  order_product_id uniqueidentifier NOT NULL,
  score int NOT NULL,
  review nvarchar(max) NULL,
  created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT CK_rating_score CHECK (score BETWEEN 1 AND 5),
  CONSTRAINT FK_rating_product FOREIGN KEY (product_id) REFERENCES products_commerce(id) ON DELETE CASCADE,
  CONSTRAINT FK_rating_order_product FOREIGN KEY (order_product_id) REFERENCES order_products(id),
  CONSTRAINT UQ_rating UNIQUE (product_id, user_id, order_product_id)
);
CREATE INDEX IX_ratings_product ON product_ratings(product_id);
```

Note: `FK_rating_user` uses `NO ACTION` instead of `CASCADE` since `product_id` already cascades.

- [ ] **Step 2: Update typeorm datasource**

Add ShipmentEntity, ProductRatingEntity to entities array.

- [ ] **Step 3: Run migration**

```bash
cd tripblogger_api
npm run migration:run
```

- [ ] **Step 4: Commit**

```bash
git add tripblogger_api/src/migrations/1760000006000-commerce-post-order.ts
git add tripblogger_api/src/config/db/typeorm.datasource.ts
git commit -m "feat(commerce): add migration for shipments and product ratings"
```

---

### Task 3: Backend — Shipment DTOs

**Files:**
- Create: `tripblogger_api/src/modules/commerce/dto/create-shipment.dto.ts`
- Create: `tripblogger_api/src/modules/commerce/dto/update-shipment.dto.ts`
- Create: `tripblogger_api/src/modules/commerce/dto/update-shipment-status.dto.ts`
- Create: `tripblogger_api/src/modules/commerce/dto/create-rating.dto.ts`

- [ ] **Step 1: Create shipment DTOs**

```typescript
// create-shipment.dto.ts
export class CreateShipmentDto {
  @IsOptional() @IsString() @MaxLength(128)
  trackingCode?: string;

  @IsIn([...SHIPMENT_CARRIERS])
  carrier!: ShipmentCarrier;

  @IsOptional() @IsDateString()
  estimatedDelivery?: string;
}

// update-shipment-status.dto.ts
export class UpdateShipmentStatusDto {
  @IsIn([...SHIPMENT_STATUSES])
  status!: ShipmentStatus;

  @IsOptional() @IsString() @MaxLength(128)
  trackingCode?: string;
}

// update-shipment.dto.ts
export class UpdateShipmentDto {
  @IsOptional() @IsString() @MaxLength(128)
  trackingCode?: string;

  @IsOptional() @IsIn([...SHIPMENT_CARRIERS])
  carrier?: ShipmentCarrier;

  @IsOptional() @IsDateString()
  estimatedDelivery?: string;
}
```

- [ ] **Step 2: Create rating DTO**

```typescript
// create-rating.dto.ts
export class CreateRatingDto {
  @IsString()
  orderProductId!: string;

  @IsInt() @Min(1) @Max(5)
  @Type(() => Number)
  score!: number;

  @IsOptional() @IsString() @MaxLength(2000)
  review?: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add tripblogger_api/src/modules/commerce/dto/
git commit -m "feat(commerce): add DTOs for shipment and rating endpoints"
```

---

### Task 4: Backend — Shipment Service & Controller

**Files:**
- Create: `tripblogger_api/src/modules/commerce/shipments.service.ts`
- Create: `tripblogger_api/src/modules/commerce/shipments.controller.ts`

- [ ] **Step 1: Create shipment service**

Methods:
- `createShipment(sellerId, orderId, dto)`:
  - Validate order exists and has seller's products
  - Validate order status is CONFIRMED
  - Create shipment (WAITING)
  - Update order status -> SHIPPING
  - Return ShipmentDto

- `getByOrderId(orderId)`: return shipment for order

- `updateStatus(sellerId, shipmentId, dto)`:
  - Validate seller owns the shipment
  - Validate status transition is allowed (using SHIPMENT_TRANSITIONS map)
  - Update shipment status
  - If trackingCode provided, update it
  - **If status = DELIVERED**, trigger side effects:
    - Order status -> DELIVERED
    - All order products status -> DELIVERED
    - Payment (COD) status -> PAID, paidAt = now
  - Return updated ShipmentDto

- `updateShipment(sellerId, shipmentId, dto)`: update metadata (tracking, carrier, estimated delivery)

- [ ] **Step 2: Create shipment controller**

```
@Controller('commerce')
POST /orders/:orderId/shipment — create shipment (seller)
GET /orders/:orderId/shipment — get shipment info

@Controller('commerce/shipments')
PATCH /:id/status — update shipment status (seller)
PATCH /:id — update shipment metadata (seller)
```

- [ ] **Step 3: Commit**

```bash
git add tripblogger_api/src/modules/commerce/shipments.service.ts
git add tripblogger_api/src/modules/commerce/shipments.controller.ts
git commit -m "feat(commerce): add shipment management with delivery side effects"
```

---

### Task 5: Backend — Rating Service & Controller

**Files:**
- Create: `tripblogger_api/src/modules/commerce/ratings.service.ts`
- Create: `tripblogger_api/src/modules/commerce/ratings.controller.ts`

- [ ] **Step 1: Create rating service**

Methods:
- `createRating(userId, productId, dto)`:
  - Validate orderProduct exists, belongs to user (as buyer), status = DELIVERED
  - Validate not already rated for this orderProduct
  - Validate score 1-5
  - Create ProductRatingEntity
  - Update product `analytics_json`: recalculate avgRating, totalRatings, ratingDistribution
  - Return RatingDto with user info

- `listRatings(productId, params)`:
  - Cursor-based pagination
  - Join user for display name
  - Sort by: newest (default), highest, lowest
  - Return { items, nextCursor, total }

- `getRatingSummary(productId)`:
  - Query: AVG(score), COUNT(*), and count per score (1-5)
  - Or read from product analytics_json (denormalized)
  - Return { avgRating, totalRatings, distribution }

Helper — `recalculateProductAnalytics(productId)`:
  - Query all ratings for product
  - Calculate avg, total, distribution
  - Update product analytics_json
  - Used after rating creation

- [ ] **Step 2: Create rating controller**

```
@Controller('commerce/products')
POST /:productId/ratings — create rating (MEMBER, must be buyer with DELIVERED order)
GET /:productId/ratings — list ratings (public, paginated)
GET /:productId/ratings/summary — rating summary (public)
```

- [ ] **Step 3: Commit**

```bash
git add tripblogger_api/src/modules/commerce/ratings.service.ts
git add tripblogger_api/src/modules/commerce/ratings.controller.ts
git commit -m "feat(commerce): add product rating service with analytics update"
```

---

### Task 6: Backend — Buyer Confirm Delivery & Extend Payment Service

**Files:**
- Modify: `tripblogger_api/src/modules/commerce/orders.service.ts`
- Modify: `tripblogger_api/src/modules/commerce/orders.controller.ts`
- Modify: `tripblogger_api/src/modules/commerce/payments.service.ts`

- [ ] **Step 1: Add confirmReceived to orders service**

```typescript
async confirmReceived(buyerId: string, orderId: string) {
  // 1. Validate order exists, buyer owns it, status = SHIPPING
  // 2. Find shipment, set status -> DELIVERED
  // 3. Set order status -> DELIVERED
  // 4. Set all order products status -> DELIVERED
  // 5. Set payment status -> PAID, paidAt = now
  // Return updated OrderDto
}
```

- [ ] **Step 2: Add endpoint to orders controller**

```typescript
@Post(':id/received')
@UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
@Roles('MEMBER')
@RequiredStatuses('ACTIVE')
confirmReceived(@Req() req: { user: { sub: string } }, @Param('id', ParseUUIDPipe) id: string) {
  return this.ordersService.confirmReceived(req.user.sub, id);
}
```

- [ ] **Step 3: Extend payment service**

Add methods:
- `markAsPaid(orderId)`: status -> PAID, paidAt = now
- `markAsFailed(orderId)`: status -> FAILED
- `markAsRefunded(orderId)`: status -> REFUNDED

- [ ] **Step 4: Add GET payment endpoint to orders controller**

```typescript
@Get(':id/payment')
getOrderPayment(@Req() req: { user: { sub: string } }, @Param('id', ParseUUIDPipe) id: string) {
  return this.paymentsService.findByOrderId(id);
}
```

- [ ] **Step 5: Commit**

```bash
git add tripblogger_api/src/modules/commerce/orders.service.ts
git add tripblogger_api/src/modules/commerce/orders.controller.ts
git add tripblogger_api/src/modules/commerce/payments.service.ts
git commit -m "feat(commerce): add buyer delivery confirmation and extend payment service"
```

---

### Task 7: Backend — Update Commerce Module & Verify

**Files:**
- Modify: `tripblogger_api/src/modules/commerce/commerce.module.ts`

- [ ] **Step 1: Register new entities, services, controllers**

Add to TypeOrmModule.forFeature: ShipmentEntity, ProductRatingEntity.
Add controllers: ShipmentsController, RatingsController.
Add providers: ShipmentsService, RatingsService.

- [ ] **Step 2: Verify compilation and app startup**

```bash
cd tripblogger_api
npx tsc --noEmit && npm run start:dev
```

- [ ] **Step 3: Commit**

```bash
git add tripblogger_api/src/modules/commerce/commerce.module.ts
git commit -m "feat(commerce): register post-order services in CommerceModule"
```

---

### Task 8: Frontend — Post-Order Types & API

**Files:**
- Modify: `tripblogger_app/src/types/commerce.ts`
- Modify: `tripblogger_app/src/services/api/commerce.service.ts`

- [ ] **Step 1: Add post-order types**

Add: PaymentDto, ShipmentDto, RatingDto, RatingSummaryDto, PaginatedRatings, CreateShipmentBody, UpdateShipmentStatusBody, CreateRatingBody, and related types.

- [ ] **Step 2: Add post-order API methods**

Add to `commerceService`:
- `getOrderPayment(orderId)`
- `createShipment(orderId, body)`
- `getOrderShipment(orderId)`
- `updateShipmentStatus(shipmentId, body)`
- `updateShipment(shipmentId, body)`
- `confirmReceived(orderId)`
- `createRating(productId, body)`
- `listRatings(productId, params)`
- `getRatingSummary(productId)`

- [ ] **Step 3: Commit**

```bash
git add tripblogger_app/src/types/commerce.ts
git add tripblogger_app/src/services/api/commerce.service.ts
git commit -m "feat(commerce): add post-order types and API methods"
```

---

### Task 9: Frontend — Post-Order i18n

**Files:**
- Modify: `tripblogger_app/src/i18n/index.ts`

- [ ] **Step 1: Add post-order i18n keys**

Add keys for payment, shipment, and rating sections in both `vi` and `en`.

- [ ] **Step 2: Commit**

```bash
git add tripblogger_app/src/i18n/index.ts
git commit -m "feat(commerce): add i18n keys for payment, shipment, and rating"
```

---

### Task 10: Frontend — Post-Order Components

**Files:**
- Create: `tripblogger_app/src/components/commerce/PaymentInfoCard.tsx`
- Create: `tripblogger_app/src/components/commerce/ShipmentTimeline.tsx`
- Create: `tripblogger_app/src/components/commerce/ShipmentFormModal.tsx`
- Create: `tripblogger_app/src/components/commerce/ShipmentUpdateModal.tsx`
- Create: `tripblogger_app/src/components/commerce/StarRating.tsx`
- Create: `tripblogger_app/src/components/commerce/StarRatingDisplay.tsx`
- Create: `tripblogger_app/src/components/commerce/RatingCard.tsx`
- Create: `tripblogger_app/src/components/commerce/RatingsSummary.tsx`
- Create: `tripblogger_app/src/components/commerce/ConfirmDeliveryButton.tsx`
- Create: `tripblogger_app/src/components/commerce/CarrierPicker.tsx`

- [ ] **Step 1: Create PaymentInfoCard**

Displays: Method icon (COD), Status badge, Amount, PaidAt date if paid. Simple info card.

- [ ] **Step 2: Create ShipmentTimeline**

Vertical timeline with 5 steps: WAITING -> PICKING -> INTRANSIT -> DELIVERED. Active step highlighted with accent color. Failed state shows red. Each step shows label and optional timestamp.

- [ ] **Step 3: Create CarrierPicker**

Simple picker/dropdown for carrier selection: GHN, GHTK, VNPost, Khác.

- [ ] **Step 4: Create ShipmentFormModal**

Modal with: TrackingCode input, CarrierPicker, EstimatedDelivery date picker, "Gửi hàng" button. Uses `useMutation` for `commerceService.createShipment`.

- [ ] **Step 5: Create ShipmentUpdateModal**

Modal with: Status picker (shows allowed transitions), TrackingCode update. Uses `useMutation` for `commerceService.updateShipmentStatus`.

- [ ] **Step 6: Create StarRating (interactive)**

Row of 5 star icons. Tap to select rating (1-5). Selected stars filled, unselected outlined.

- [ ] **Step 7: Create StarRatingDisplay (read-only)**

Row of 5 small star icons, filled proportionally. Shows numeric average beside stars.

- [ ] **Step 8: Create RatingCard**

Card: user avatar (placeholder), display name, StarRatingDisplay, review text, date.

- [ ] **Step 9: Create RatingsSummary**

Average rating (large number + StarRatingDisplay), total count. Distribution bars (5 horizontal bars for 1-5 stars with percentage fill).

- [ ] **Step 10: Create ConfirmDeliveryButton**

"Đã nhận hàng" button with confirmation alert. Uses `useMutation` for `commerceService.confirmReceived`.

- [ ] **Step 11: Commit**

```bash
git add tripblogger_app/src/components/commerce/
git commit -m "feat(commerce): add post-order UI components"
```

---

### Task 11: Frontend — Enhance OrderDetailScreen

**Files:**
- Modify: `tripblogger_app/src/screens/OrderDetailScreen.tsx`

- [ ] **Step 1: Add Payment section**

After order info, add PaymentInfoCard. Fetch with `useQuery(['orderPayment', orderId])`.

- [ ] **Step 2: Add Shipment section**

After payment, add ShipmentTimeline. Fetch with `useQuery(['orderShipment', orderId])`. Show tracking code (copyable), carrier name, estimated delivery.

- [ ] **Step 3: Add Buyer actions**

If order status = SHIPPING: show ConfirmDeliveryButton.
If order status = DELIVERED: show "Đánh giá" buttons for each order product (navigate to RatingFormScreen).

- [ ] **Step 4: Commit**

```bash
git add tripblogger_app/src/screens/OrderDetailScreen.tsx
git commit -m "feat(commerce): enhance OrderDetailScreen with payment, shipment, and rating sections"
```

---

### Task 12: Frontend — Enhance SellerOrdersScreen

**Files:**
- Modify: `tripblogger_app/src/screens/SellerOrdersScreen.tsx`

- [ ] **Step 1: Add shipment actions**

For CONFIRMED orders: show "Gửi hàng" button -> opens ShipmentFormModal.
For SHIPPING orders: show "Cập nhật vận chuyển" -> opens ShipmentUpdateModal.

- [ ] **Step 2: Commit**

```bash
git add tripblogger_app/src/screens/SellerOrdersScreen.tsx
git commit -m "feat(commerce): add shipment management to SellerOrdersScreen"
```

---

### Task 13: Frontend — Rating Screens

**Files:**
- Create: `tripblogger_app/src/screens/RatingFormScreen.tsx`
- Create: `tripblogger_app/src/screens/AllRatingsScreen.tsx`
- Create: `tripblogger_app/app/(tabs)/shop/rate.tsx`
- Create: `tripblogger_app/app/(tabs)/shop/ratings/[productId].tsx`

- [ ] **Step 1: Implement RatingFormScreen**

- Receives: productId, orderProductId via route params
- Shows: product image + title (fetch product)
- StarRating selector (interactive)
- Text review input (multiline, optional)
- "Gửi đánh giá" button
- On success: navigate back, invalidate queries

- [ ] **Step 2: Implement AllRatingsScreen**

- Receives: productId via route params
- RatingsSummary at top
- Filter tabs: Tất cả / 5 / 4 / 3 / 2 / 1 sao
- FlatList of RatingCards with infinite scroll

- [ ] **Step 3: Create route files**

- [ ] **Step 4: Commit**

```bash
git add tripblogger_app/src/screens/RatingFormScreen.tsx
git add tripblogger_app/src/screens/AllRatingsScreen.tsx
git add tripblogger_app/app/(tabs)/shop/rate.tsx
git add tripblogger_app/app/(tabs)/shop/ratings/
git commit -m "feat(commerce): implement rating form and all ratings screens"
```

---

### Task 14: Frontend — Enhance ProductDetailScreen with Ratings

**Files:**
- Modify: `tripblogger_app/src/screens/ProductDetailScreen.tsx`

- [ ] **Step 1: Add ratings section**

At the bottom of ProductDetailScreen, add:
- RatingsSummary component (fetch with `useQuery(['ratingSummary', productId])`)
- Preview of 3 latest RatingCards (fetch with `useQuery(['ratings', productId])`)
- "Xem tất cả ({totalRatings})" button -> navigate to AllRatingsScreen

- [ ] **Step 2: Commit**

```bash
git add tripblogger_app/src/screens/ProductDetailScreen.tsx
git commit -m "feat(commerce): add ratings section to ProductDetailScreen"
```

---

### Task 15: End-to-End Verification

- [ ] **Step 1: Test complete order lifecycle**

1. Create product, publish it
2. Another user adds to cart, checks out (COD)
3. Seller confirms order -> CONFIRMED
4. Seller creates shipment (enters tracking code, selects carrier) -> SHIPPING
5. Seller updates shipment: WAITING -> INTRANSIT
6. Buyer confirms receipt -> DELIVERED, Payment -> PAID
7. Buyer rates product (4 stars + review)
8. Rating appears on product detail page

- [ ] **Step 2: Test cancellation flow**

1. Create order
2. Cancel order (PENDING)
3. Verify stock restored
4. Verify coupon usage rolled back (if used)

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(commerce): complete Spec 3 - Post-Order (payment, shipment, ratings)"
```
