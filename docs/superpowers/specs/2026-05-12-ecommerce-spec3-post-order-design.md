# Spec 3: Post-Order — Design Document

## Overview

Complete the e-commerce lifecycle with payment tracking, shipment management, and product ratings/reviews. After this spec, the full order lifecycle from checkout to delivery to review is functional.

**Goal:** Track COD payments, manage shipments with mock carrier integration, and allow buyers to rate products after delivery.

**Tech Stack:** NestJS + TypeORM + MSSQL (backend), Expo Router + React Native + Zustand + React Query (frontend).

**Depends on:** Spec 1 (Product & Catalog) and Spec 2 (Shopping Flow) must be implemented first.

---

## 1. Data Models

### 1.1 PaymentEntity

Table: `payments`

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID (PK) | auto-generated |
| order_id | UUID (FK -> orders.id) | NOT NULL, UNIQUE |
| method | nvarchar(32) | NOT NULL | Currently only `COD` |
| status | nvarchar(32) | NOT NULL, default 'PENDING' |
| amount | decimal(18,2) | NOT NULL | Same as order.total_amount |
| transaction_ref | nvarchar(256) | nullable | Transaction reference from payment gateway (future use) |
| gateway_response | text | nullable | Raw response from payment gateway (future use) |
| paid_at | datetime | nullable | Set when status transitions to PAID |
| created_at | datetime | auto |

**Payment Status Enum:** `PENDING`, `PAID`, `FAILED`, `REFUNDED`

**Payment Method Enum:** `COD`, `MOMO`, `VNPAY`, `BANKING`, `STRIPE` — Only COD is implemented in this spec. The others are defined as enum values for future use.

**COD flow:**
- Payment is created automatically during checkout (Spec 2) with status = PENDING
- When shipment is delivered and buyer confirms receipt, payment status -> PAID, paid_at = now
- When order is cancelled, payment status -> FAILED
- When order is refunded, payment status -> REFUNDED

### 1.2 ShipmentEntity

Table: `shipments`

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID (PK) | auto-generated |
| order_id | UUID (FK -> orders.id) | NOT NULL |
| seller_id | UUID (FK -> users.id) | NOT NULL |
| tracking_code | nvarchar(128) | nullable | Seller inputs this manually |
| carrier | nvarchar(32) | NOT NULL, default 'OTHER' |
| status | nvarchar(32) | NOT NULL, default 'WAITING' |
| estimated_delivery | datetime | nullable |
| created_at | datetime | auto |
| updated_at | datetime | auto |

**Carrier Enum:** `GHN`, `GHTK`, `VNPOST`, `OTHER`

**Shipment Status Enum:** `WAITING`, `PICKING`, `INTRANSIT`, `DELIVERED`, `FAILED`

**Business rules:**
- One shipment per order (simplified model — in a real multi-seller marketplace you'd have one shipment per seller per order, but we simplify here)
- Seller creates shipment when they confirm the order
- Seller manually updates shipment status (mock carrier — no real API calls)
- When shipment status -> DELIVERED:
  - Order status -> DELIVERED
  - Order products status -> DELIVERED  
  - Payment (COD) status -> PAID
- When shipment status -> FAILED:
  - Order remains in SHIPPING status (seller needs to retry or cancel)

### 1.3 ProductRatingEntity

Table: `product_ratings`

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID (PK) | auto-generated |
| product_id | UUID (FK -> products_commerce.id) | NOT NULL, ON DELETE CASCADE |
| user_id | UUID (FK -> users.id) | NOT NULL, ON DELETE CASCADE |
| order_product_id | UUID (FK -> order_products.id) | NOT NULL | Links rating to specific order item |
| score | int | NOT NULL, CHECK BETWEEN 1 AND 5 |
| review | text | nullable | Text review (optional) |
| created_at | datetime | auto |

Unique constraint: `(product_id, user_id, order_product_id)` — one rating per product per user per order.

**Business rules:**
- Can only rate a product from a DELIVERED order
- Can only rate once per order item
- Rating updates the product's analytics (average rating, total ratings count)

**Product analytics_json extension:**
The existing `analytics_json` column in `products_commerce` is extended to include:
```json
{
  "views": 0,
  "saves": 0,
  "shares": 0,
  "avgRating": 0,
  "totalRatings": 0,
  "ratingDistribution": { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }
}
```

These values are denormalized for fast reads. Updated whenever a new rating is created.

---

## 2. Backend API Design

### 2.1 Payment API

**GET /commerce/orders/:id/payment**
- Auth: JWT + MEMBER + ACTIVE
- Must be buyer or seller of the order
- Returns: `PaymentDto` or 404 if no payment exists

Payment is created internally during checkout. No public endpoint for creating payments.

### 2.2 Shipment API

**POST /commerce/orders/:orderId/shipment**
- Auth: JWT + MEMBER + ACTIVE
- Must be seller of at least one order product
- Body: `{ trackingCode?, carrier, estimatedDelivery? }`
- Creates shipment with status = WAITING
- Updates order status -> SHIPPING
- Returns: ShipmentDto

**GET /commerce/orders/:orderId/shipment**
- Auth: JWT + MEMBER + ACTIVE
- Must be buyer or seller
- Returns: ShipmentDto or 404

**PATCH /commerce/shipments/:id/status**
- Auth: JWT + MEMBER + ACTIVE (must be seller)
- Body: `{ status, trackingCode? }`
- Validates status transition:
  - WAITING -> PICKING
  - PICKING -> INTRANSIT
  - INTRANSIT -> DELIVERED
  - INTRANSIT -> FAILED
  - WAITING -> INTRANSIT (skip picking)
- When status = DELIVERED:
  - Auto-update order status -> DELIVERED
  - Auto-update all order products status -> DELIVERED
  - Auto-update payment (COD) status -> PAID, set paid_at
- Returns: updated ShipmentDto

**PATCH /commerce/shipments/:id**
- Auth: JWT + MEMBER + ACTIVE (must be seller)
- Body: `{ trackingCode?, carrier?, estimatedDelivery? }`
- Update shipment metadata (not status)

### 2.3 Product Rating API

**POST /commerce/products/:productId/ratings**
- Auth: JWT + MEMBER + ACTIVE
- Body: `{ orderProductId, score, review? }`
- Validates:
  - Order product exists and belongs to current user (as buyer)
  - Order product status = DELIVERED
  - Not already rated for this order product
  - Score is integer 1-5
- Creates rating
- Updates product analytics_json (recalculate avgRating, totalRatings, ratingDistribution)
- Returns: RatingDto

**GET /commerce/products/:productId/ratings**
- Auth: optional (public)
- Query: `{ limit?, cursor?, sortBy? }`
- sortBy: `newest` (default), `highest`, `lowest`
- Returns: `{ items: RatingDto[], nextCursor, total }`

**GET /commerce/products/:productId/ratings/summary**
- Auth: optional (public)
- Returns: `{ avgRating, totalRatings, distribution: { "1": n, "2": n, "3": n, "4": n, "5": n } }`

### 2.4 Order Status Update (Buyer confirms delivery)

**POST /commerce/orders/:id/received**
- Auth: JWT + MEMBER + ACTIVE (must be buyer)
- Only allowed when order status = SHIPPING
- Business logic:
  - Shipment status -> DELIVERED
  - Order status -> DELIVERED
  - All order products status -> DELIVERED
  - Payment (COD) status -> PAID, paid_at = now
- Returns: updated OrderDto

This provides an alternative path to delivery confirmation besides the seller updating shipment status — the buyer can confirm they received the goods.

---

## 3. Frontend Architecture

### 3.1 Existing Screen Modifications

**OrderDetailScreen (from Spec 2) — enhanced:**

Add these new sections:

1. **Payment Section**
   - Shows: Method (COD icon + text), Status badge, Amount
   - If PAID: shows paid_at date
   - Simple info display, no actions

2. **Shipment Section**
   - Shows: Status timeline (WAITING -> PICKING -> INTRANSIT -> DELIVERED)
   - Tracking code (copyable)
   - Carrier name
   - Estimated delivery date
   - If order is SHIPPING and user is buyer: "Đã nhận hàng" (Confirm Receipt) button

3. **Rating Section (buyer view)**
   - Shows after order is DELIVERED
   - For each order product: "Đánh giá" button -> RatingFormModal
   - If already rated: shows the existing rating (stars + review text)

**SellerOrdersScreen (from Spec 2) — enhanced:**

Add new actions:
- For CONFIRMED orders: "Gửi hàng" button -> ShipmentFormModal
- For SHIPPING orders: "Cập nhật vận chuyển" button -> ShipmentUpdateModal

**ProductDetailScreen (from Spec 1) — enhanced:**

Add new section at bottom:
- **Ratings & Reviews Section**
  - Average rating (large stars display + numeric)
  - Total reviews count
  - Rating distribution bar chart (5 bars for 1-5 stars)
  - List of review cards (limited to 3, "Xem tất cả" for more)
  - Each review card: user avatar, display name, stars, review text, date

### 3.2 New Screens

**RatingFormScreen (`shop/rate.tsx`)**
- Navigate here from OrderDetail after delivery
- Shows: Product image + title
- Star rating selector (1-5, tap to select)
- Text review input (optional, multiline)
- "Gửi đánh giá" button
- Success: navigate back with toast notification

**AllRatingsScreen (`shop/ratings/[productId].tsx`)**
- Full list of ratings for a product
- Filter tabs: Tất cả / 5 sao / 4 sao / 3 sao / 2 sao / 1 sao
- Each card: avatar, name, stars, text, date
- Infinite scroll pagination

### 3.3 New Components

In `src/components/commerce/`:

- `PaymentInfoCard.tsx` — Payment method + status display
- `ShipmentTimeline.tsx` — Visual shipment status timeline with steps
- `ShipmentFormModal.tsx` — Modal for seller to create shipment (tracking code, carrier picker, estimated delivery)
- `ShipmentUpdateModal.tsx` — Modal for seller to update shipment status
- `StarRating.tsx` — Interactive star rating selector (tap stars)
- `StarRatingDisplay.tsx` — Read-only star rating display
- `RatingCard.tsx` — Single review card (avatar, name, stars, text, date)
- `RatingsSummary.tsx` — Average rating + distribution chart
- `RatingSectionPreview.tsx` — Preview of ratings on ProductDetail (limited list)
- `ConfirmDeliveryButton.tsx` — Buyer button to confirm goods received
- `CarrierPicker.tsx` — Picker for carrier selection (GHN/GHTK/VNPOST/OTHER)

### 3.4 API Service Extension

Extend `src/services/api/commerce.service.ts`:

Payment:
- `getOrderPayment(orderId: string): Promise<PaymentDto>`

Shipment:
- `createShipment(orderId: string, body: CreateShipmentBody): Promise<ShipmentDto>`
- `getOrderShipment(orderId: string): Promise<ShipmentDto>`
- `updateShipmentStatus(shipmentId: string, body: UpdateShipmentStatusBody): Promise<ShipmentDto>`
- `updateShipment(shipmentId: string, body: UpdateShipmentBody): Promise<ShipmentDto>`

Rating:
- `createRating(productId: string, body: CreateRatingBody): Promise<RatingDto>`
- `listRatings(productId: string, params: ListRatingsParams): Promise<PaginatedRatings>`
- `getRatingSummary(productId: string): Promise<RatingSummaryDto>`

Order:
- `confirmReceived(orderId: string): Promise<OrderDto>`

### 3.5 Types Extension

Extend `src/types/commerce.ts`:

```typescript
export type PaymentMethod = 'COD' | 'MOMO' | 'VNPAY' | 'BANKING' | 'STRIPE';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface PaymentDto {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  transactionRef: string | null;
  paidAt: string | null;
  createdAt: string;
}

export type ShipmentCarrier = 'GHN' | 'GHTK' | 'VNPOST' | 'OTHER';
export type ShipmentStatus = 'WAITING' | 'PICKING' | 'INTRANSIT' | 'DELIVERED' | 'FAILED';

export interface ShipmentDto {
  id: string;
  orderId: string;
  sellerId: string;
  trackingCode: string | null;
  carrier: ShipmentCarrier;
  status: ShipmentStatus;
  estimatedDelivery: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RatingDto {
  id: string;
  productId: string;
  userId: string;
  user: { displayName: string; username: string };
  orderProductId: string;
  score: number;
  review: string | null;
  createdAt: string;
}

export interface RatingSummaryDto {
  avgRating: number;
  totalRatings: number;
  distribution: Record<string, number>;
}

export interface PaginatedRatings {
  items: RatingDto[];
  nextCursor: string | null;
  total: number;
}

export interface CreateShipmentBody {
  trackingCode?: string;
  carrier: ShipmentCarrier;
  estimatedDelivery?: string;
}

export interface UpdateShipmentStatusBody {
  status: ShipmentStatus;
  trackingCode?: string;
}

export interface CreateRatingBody {
  orderProductId: string;
  score: number;
  review?: string;
}
```

---

## 4. State Machine & Side Effects

### 4.1 Order Lifecycle (Complete)

```
Checkout:
  Cart -> Order (PENDING) + Payment (PENDING) + Stock decremented

Seller Confirms:
  Order: PENDING -> CONFIRMED

Seller Ships:
  Order: CONFIRMED -> SHIPPING
  Shipment created (WAITING)

Shipment Updates:
  WAITING -> PICKING -> INTRANSIT -> DELIVERED

Delivery Confirmed (by buyer or seller):
  Shipment: -> DELIVERED
  Order: -> DELIVERED
  Order Products: -> DELIVERED
  Payment (COD): -> PAID

Buyer Cancels (only if PENDING):
  Order: -> CANCELLED
  Payment: -> FAILED
  Stock: restored
  Coupon: usage rolled back

Admin Refund (future):
  Order: DELIVERED -> REFUNDED
  Payment: -> REFUNDED
```

### 4.2 Side Effect Matrix

| Trigger | Side Effects |
|---------|-------------|
| Checkout | Create Order, OrderProducts, Payment. Decrement stock. Record coupon usage. Deactivate cart. |
| Order Cancelled | Restore stock. Roll back coupon usage. Payment -> FAILED. |
| Shipment DELIVERED | Order -> DELIVERED. OrderProducts -> DELIVERED. Payment (COD) -> PAID. |
| Rating Created | Update product analytics_json (avgRating, totalRatings, distribution). |

---

## 5. Migration

New migration: `1760000006000-commerce-post-order.ts`

Creates tables: `payments`, `shipments`, `product_ratings`

Note: Payment creation logic is called during checkout (Spec 2), but the entity and table are defined here because they're conceptually part of the post-order flow.

**Implementation note:** The checkout endpoint in Spec 2's `orders.service.ts` should call a `PaymentService.createPayment()` method that creates the Payment record. This creates a dependency where Spec 2 checkout needs to import Spec 3's PaymentService. To handle this cleanly:
- Option A: Create PaymentEntity and a basic PaymentService in Spec 2 with just the `createPayment()` method. Spec 3 extends the service.
- Option B: Create Payment record inline in checkout without a separate service. Spec 3 adds the service.
- **Chosen: Option A** — cleaner separation, PaymentService exists from Spec 2 onward.

---

## 6. File Structure Updates

### Backend

```
tripblogger_api/src/modules/commerce/
├── (existing from Spec 1 & 2)
├── payments.controller.ts
├── payments.service.ts          — Basic version created in Spec 2, extended here
├── shipments.controller.ts
├── shipments.service.ts
├── ratings.controller.ts
├── ratings.service.ts
├── dto/
│   ├── (existing)
│   ├── create-shipment.dto.ts
│   ├── update-shipment.dto.ts
│   ├── update-shipment-status.dto.ts
│   └── create-rating.dto.ts
├── entities/
│   ├── (existing)
│   ├── payment.entity.ts        — Created in Spec 2, entity defined here for completeness
│   ├── shipment.entity.ts
│   └── product-rating.entity.ts
```

### Frontend

```
tripblogger_app/
├── app/(tabs)/shop/
│   ├── (existing)
│   ├── rate.tsx
│   └── ratings/[productId].tsx
├── src/
│   ├── components/commerce/
│   │   ├── (existing)
│   │   ├── PaymentInfoCard.tsx
│   │   ├── ShipmentTimeline.tsx
│   │   ├── ShipmentFormModal.tsx
│   │   ├── ShipmentUpdateModal.tsx
│   │   ├── StarRating.tsx
│   │   ├── StarRatingDisplay.tsx
│   │   ├── RatingCard.tsx
│   │   ├── RatingsSummary.tsx
│   │   ├── RatingSectionPreview.tsx
│   │   ├── ConfirmDeliveryButton.tsx
│   │   └── CarrierPicker.tsx
│   ├── screens/
│   │   ├── (existing — OrderDetailScreen enhanced)
│   │   ├── RatingFormScreen.tsx
│   │   └── AllRatingsScreen.tsx
```

---

## 7. i18n Keys (all 3 specs combined)

The following i18n key groups need to be added across all 3 specs:

**Shop tab & navigation:** `tabShop`, `shopTitle`, `shopSearch`, `shopCategories`, `shopAllProducts`

**Product:** `productNew`, `productSecondhand`, `productDraft`, `productPublished`, `productOutOfStock`, `productSold`, `productRemoved`, `productPrice`, `productStock`, `productStockUnit`, `productDescription`, `productTags`, `productCreate`, `productEdit`, `productPublish`, `productSaveDraft`, `productDelete`, `productDeleteConfirm`, `productMyProducts`, `productEmpty`, `productSearchPlaceholder`, `productFilterCategory`, `productFilterType`, `productFilterPrice`

**Seller:** `sellerVerified`, `sellerRequestVerification`, `sellerVerificationPending`, `sellerVerificationApproved`, `sellerVerificationRejected`

**Cart:** `cartTitle`, `cartEmpty`, `cartAddItem`, `cartRemoveItem`, `cartUpdateQuantity`, `cartCheckout`, `cartSubTotal`, `cartItemCount`

**Wishlist:** `wishlistTitle`, `wishlistEmpty`, `wishlistAdd`, `wishlistRemove`

**Address:** `addressTitle`, `addressAdd`, `addressEdit`, `addressDelete`, `addressDefault`, `addressLabel`, `addressRecipientName`, `addressPhone`, `addressProvince`, `addressDistrict`, `addressWard`, `addressStreet`

**Checkout:** `checkoutTitle`, `checkoutAddress`, `checkoutChangeAddress`, `checkoutOrderSummary`, `checkoutCoupon`, `checkoutApplyCoupon`, `checkoutPaymentMethod`, `checkoutCOD`, `checkoutShippingFee`, `checkoutFreeShipping`, `checkoutSubTotal`, `checkoutDiscount`, `checkoutTotal`, `checkoutNote`, `checkoutPlaceOrder`, `checkoutSuccess`

**Order:** `orderTitle`, `orderCode`, `orderStatus`, `orderPending`, `orderConfirmed`, `orderShipping`, `orderDelivered`, `orderCancelled`, `orderRefunded`, `orderCancel`, `orderCancelConfirm`, `orderConfirm`, `orderMyOrders`, `orderSellerOrders`, `orderEmpty`, `orderDetail`, `orderReceived`

**Payment:** `paymentMethod`, `paymentStatus`, `paymentPending`, `paymentPaid`, `paymentFailed`, `paymentRefunded`, `paymentCOD`

**Shipment:** `shipmentTitle`, `shipmentCreate`, `shipmentTrackingCode`, `shipmentCarrier`, `shipmentStatus`, `shipmentEstimatedDelivery`, `shipmentWaiting`, `shipmentPicking`, `shipmentInTransit`, `shipmentDelivered`, `shipmentFailed`, `shipmentUpdate`

**Rating:** `ratingTitle`, `ratingEmpty`, `ratingSend`, `ratingScore`, `ratingReview`, `ratingReviewPlaceholder`, `ratingAll`, `ratingStar`, `ratingAverage`, `ratingTotal`, `ratingViewAll`
