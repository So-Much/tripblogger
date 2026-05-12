# Spec 2: Shopping Flow — Design Document

## Overview

Build the complete shopping flow on top of Spec 1's product catalog: Wishlist, Cart, Address management, Coupon system, and Checkout/Order creation. After this spec, users can browse products, add them to cart, and place orders with COD payment.

**Goal:** Buyers can wishlist products, add to cart, manage delivery addresses, apply coupons, and checkout to create orders. Sellers can view and confirm incoming orders.

**Tech Stack:** NestJS + TypeORM + MSSQL (backend), Expo Router + React Native + Zustand + React Query (frontend).

**Depends on:** Spec 1 (Product & Catalog) must be implemented first.

---

## 1. Data Models

### 1.1 WishlistEntity

Table: `wishlists`

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID (PK) | auto-generated |
| user_id | UUID (FK -> users.id) | NOT NULL, ON DELETE CASCADE |
| product_id | UUID (FK -> products_commerce.id) | NOT NULL, ON DELETE CASCADE |
| created_at | datetime | auto |

Unique constraint: `(user_id, product_id)` — each user can wishlist a product only once.

### 1.2 CartEntity

Table: `carts`

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID (PK) | auto-generated |
| user_id | UUID (FK -> users.id) | NOT NULL, ON DELETE CASCADE |
| status | nvarchar(32) | NOT NULL, default 'ACTIVE' |
| created_at | datetime | auto |
| updated_at | datetime | auto |

**Cart Status Enum:** `ACTIVE`, `INACTIVE`, `MERGED`, `ABANDONED`

Business rule: Each user has at most 1 ACTIVE cart. When checking out, the ACTIVE cart transitions to INACTIVE and a new ACTIVE cart is created if needed.

### 1.3 CartProductEntity

Table: `cart_products`

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID (PK) | auto-generated |
| cart_id | UUID (FK -> carts.id) | NOT NULL, ON DELETE CASCADE |
| product_id | UUID (FK -> products_commerce.id) | NOT NULL, ON DELETE CASCADE |
| quantity | int | NOT NULL, CHECK > 0 |
| price_snapshot | decimal(18,2) | NOT NULL | Price at time of adding to cart |
| created_at | datetime | auto |

Unique constraint: `(cart_id, product_id)` — same product in same cart only once (update quantity instead).

### 1.4 AddressEntity

Table: `addresses`

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID (PK) | auto-generated |
| user_id | UUID (FK -> users.id) | NOT NULL, ON DELETE CASCADE |
| label | nvarchar(64) | NOT NULL | e.g. "Nhà", "Công ty", "Khác" |
| recipient_name | nvarchar(256) | NOT NULL |
| phone | nvarchar(20) | NOT NULL |
| province | nvarchar(128) | NOT NULL |
| district | nvarchar(128) | NOT NULL |
| ward | nvarchar(128) | NOT NULL |
| street | nvarchar(512) | NOT NULL | Street address / house number |
| is_default | bit | NOT NULL, default 0 |
| created_at | datetime | auto |

Business rule: When setting an address as default, all other addresses for that user are set to `is_default = false`.

### 1.5 CouponEntity

Table: `coupons`

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID (PK) | auto-generated |
| code | nvarchar(64) | NOT NULL, UNIQUE | Uppercase alphanumeric code |
| type | nvarchar(32) | NOT NULL | `PERCENTAGE` or `FIXED` |
| value | decimal(18,2) | NOT NULL | Percentage (0-100) or fixed amount in VND |
| min_order_value | decimal(18,2) | nullable | Minimum order subtotal to apply |
| max_discount_amount | decimal(18,2) | nullable | Cap for percentage discounts |
| max_uses | int | nullable | Total uses allowed (null = unlimited) |
| used_count | int | NOT NULL, default 0 |
| applies_to | nvarchar(32) | NOT NULL, default 'ALL' | `ALL`, `CATEGORY`, `PRODUCT` |
| applies_to_ids_json | text | nullable | JSON array of category/product IDs when applies_to != ALL |
| status | nvarchar(32) | NOT NULL, default 'ACTIVE' | `ACTIVE`, `EXPIRED`, `DISABLED` |
| active_at | datetime | NOT NULL |
| expires_at | datetime | NOT NULL |
| created_at | datetime | auto |

### 1.6 CouponUsageEntity

Table: `coupon_usages`

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID (PK) | auto-generated |
| coupon_id | UUID (FK -> coupons.id) | NOT NULL |
| user_id | UUID (FK -> users.id) | NOT NULL |
| order_id | UUID (FK -> orders.id) | NOT NULL |
| used_at | datetime | auto |

### 1.7 OrderEntity

Table: `orders`

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID (PK) | auto-generated |
| order_code | nvarchar(32) | NOT NULL, UNIQUE | Format: `TB{timestamp}{random4}` |
| buyer_id | UUID (FK -> users.id) | NOT NULL |
| address_id | UUID (FK -> addresses.id) | NOT NULL |
| coupon_id | UUID (FK -> coupons.id) | nullable |
| status | nvarchar(32) | NOT NULL, default 'PENDING' |
| sub_total | decimal(18,2) | NOT NULL | Sum of (price * quantity) before discounts |
| shipping_fee | decimal(18,2) | NOT NULL, default 0 | Mock: flat fee 30,000 VND or free for orders > 500,000 |
| discount_amount | decimal(18,2) | NOT NULL, default 0 |
| total_amount | decimal(18,2) | NOT NULL | sub_total + shipping_fee - discount_amount |
| note | nvarchar(1024) | nullable |
| created_at | datetime | auto |
| updated_at | datetime | auto |

**Order Status Enum:** `PENDING`, `CONFIRMED`, `SHIPPING`, `DELIVERED`, `CANCELLED`, `REFUNDED`

### 1.8 OrderProductEntity

Table: `order_products`

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID (PK) | auto-generated |
| order_id | UUID (FK -> orders.id) | NOT NULL, ON DELETE CASCADE |
| product_id | UUID (FK -> products_commerce.id) | NOT NULL |
| seller_id | UUID (FK -> users.id) | NOT NULL |
| quantity | int | NOT NULL |
| price_snapshot | decimal(18,2) | NOT NULL | Price at checkout time |
| product_title_snapshot | nvarchar(512) | NOT NULL | Title at checkout time |
| status | nvarchar(32) | NOT NULL, default 'PROCESSING' |
| created_at | datetime | auto |

**OrderProduct Status Enum:** `PROCESSING`, `SHIPPED`, `DELIVERED`, `RETURNED`

---

## 2. Backend API Design

### 2.1 Wishlist API

**POST /commerce/wishlist/:productId**
- Auth: JWT + MEMBER + ACTIVE
- Toggle: if already wishlisted, remove. If not, add.
- Returns: `{ wishlisted: boolean }`

**GET /commerce/wishlist**
- Auth: JWT + MEMBER + ACTIVE
- Query: `{ limit?, cursor? }`
- Returns: `PaginatedProducts` (products in wishlist with wishlist metadata)

### 2.2 Cart API

**GET /commerce/cart**
- Auth: JWT + MEMBER + ACTIVE
- Returns active cart with all items (including product details)
- Auto-creates ACTIVE cart if none exists
- Response includes: items (with product snapshot), itemCount, subTotal

**POST /commerce/cart/items**
- Auth: JWT + MEMBER + ACTIVE
- Body: `{ productId, quantity }` (default quantity = 1)
- If product already in cart, increments quantity
- Snapshots current price as `priceSnapshot`
- Validates: product is PUBLISHED, stock >= requested quantity
- Returns updated cart

**PATCH /commerce/cart/items/:itemId**
- Auth: JWT + MEMBER + ACTIVE
- Body: `{ quantity }`
- Validates: stock >= new quantity
- If quantity = 0, removes item
- Returns updated cart

**DELETE /commerce/cart/items/:itemId**
- Auth: JWT + MEMBER + ACTIVE
- Removes item from cart
- Returns updated cart

### 2.3 Address API

**GET /commerce/addresses**
- Auth: JWT + MEMBER + ACTIVE
- Returns all addresses for current user, sorted by is_default DESC, created_at DESC

**POST /commerce/addresses**
- Auth: JWT + MEMBER + ACTIVE
- Body: `{ label, recipientName, phone, province, district, ward, street, isDefault? }`
- If isDefault = true, resets all other addresses
- If this is user's first address, auto-set as default

**PATCH /commerce/addresses/:id**
- Auth: JWT + MEMBER + ACTIVE (must be owner)
- Body: partial fields

**DELETE /commerce/addresses/:id**
- Auth: JWT + MEMBER + ACTIVE (must be owner)
- Cannot delete if referenced by an active order (PENDING/CONFIRMED/SHIPPING)

**POST /commerce/addresses/:id/default**
- Auth: JWT + MEMBER + ACTIVE (must be owner)
- Sets this address as default, unsets all others

### 2.4 Coupon API

**POST /commerce/coupons/validate**
- Auth: JWT + MEMBER + ACTIVE
- Body: `{ code, cartSubTotal }` 
- Validates: code exists, is ACTIVE, not expired, not exceeded max uses, meets min order value, applicable to cart items
- Returns: `{ valid: boolean, coupon?: CouponDto, discountAmount?: number, reason?: string }`

**GET /commerce/coupons/available**
- Auth: JWT + MEMBER + ACTIVE
- Query: `{ cartSubTotal? }`
- Returns list of coupons that could apply to current cart

**POST /commerce/admin/coupons** (Admin)
- Auth: JWT + ADMIN
- Body: full coupon data
- Creates a new coupon

**PATCH /commerce/admin/coupons/:id** (Admin)
- Auth: JWT + ADMIN

**DELETE /commerce/admin/coupons/:id** (Admin)
- Auth: JWT + ADMIN
- Soft delete: sets status to DISABLED

### 2.5 Order API

**POST /commerce/orders/checkout**
- Auth: JWT + MEMBER + ACTIVE
- Body: `{ addressId, couponCode?, note? }`
- Business logic:
  1. Validate cart is not empty
  2. Validate all products are still PUBLISHED and have sufficient stock
  3. Validate address belongs to current user
  4. If couponCode provided, validate coupon
  5. Calculate: subTotal, shippingFee (mock: 30,000 VND, free if subTotal > 500,000), discountAmount, totalAmount
  6. Create Order + OrderProducts (snapshot prices and titles)
  7. Decrement product stock for each item
  8. If stock reaches 0, set product status to OUTOFSTOCK
  9. Record coupon usage if applicable, increment used_count
  10. Set cart status to INACTIVE
  11. Create Payment record (COD, PENDING) — handled in Spec 3 but the Order entity is created here
- Returns: OrderDto
- Wraps everything in a database transaction for atomicity

**GET /commerce/orders**
- Auth: JWT + MEMBER + ACTIVE
- Query: `{ limit?, cursor?, status? }`
- Returns orders where buyer_id = current user

**GET /commerce/orders/:id**
- Auth: JWT + MEMBER + ACTIVE
- Returns order detail (must be buyer or seller of an order product)

**POST /commerce/orders/:id/cancel**
- Auth: JWT + MEMBER + ACTIVE (must be buyer)
- Only allowed when status = PENDING
- Restores product stock
- Rolls back coupon usage
- Sets order status to CANCELLED

**GET /commerce/orders/seller**
- Auth: JWT + MEMBER + ACTIVE
- Returns orders containing products sold by current user
- Query: `{ limit?, cursor?, status? }`

**POST /commerce/orders/:id/confirm**
- Auth: JWT + MEMBER + ACTIVE (must be seller of at least one order product)
- Transitions order: PENDING -> CONFIRMED

---

## 3. Frontend Architecture

### 3.1 New Screens

**WishlistScreen**
- Accessible from: Profile page / Shop header icon (heart)
- Layout: 2-column product grid (reuse ProductGrid component)
- Each card has a heart icon to toggle (remove from wishlist)
- Empty state: "Chưa có sản phẩm yêu thích"

**CartScreen**
- Accessible from: Shop header icon (cart with badge count)
- Layout: Vertical list of cart items
- Each item: product image, title, seller name, price, quantity stepper (+/-), delete button
- Bottom sticky bar: item count, subtotal, "Thanh toán" (Checkout) button
- Empty state: "Giỏ hàng trống"
- Updates price snapshot warning if product price has changed

**CheckoutScreen**
- Step-by-step layout:
  1. **Delivery Address**: Show default address or prompt to add. "Thay đổi" button to select/add.
  2. **Order Summary**: List of products (readonly): image, title, qty, price
  3. **Coupon**: Text input for code + "Áp dụng" button. Shows discount amount or error.
  4. **Payment Method**: COD (only option, pre-selected)
  5. **Shipping Fee**: Display mock fee (30,000 VND or free)
  6. **Price Breakdown**: SubTotal, Shipping, Discount, Total
  7. **Note**: Optional text input
- Bottom: "Đặt hàng" button
- Success: Navigate to OrderDetail with confetti/success animation

**AddressListScreen**
- Full CRUD for addresses
- List with swipe-to-delete
- "Mặc định" badge on default address
- FAB to add new address

**AddressFormScreen**
- Form: Label (picker: Nhà/Công ty/Khác), Recipient Name, Phone, Province, District, Ward, Street
- Province/District/Ward: text inputs (no external API integration, free text for now)
- Toggle: Set as default
- Save button

**OrderListScreen**
- Accessible from: Profile > "Đơn hàng của tôi"
- Horizontal tab filter: Tất cả / Chờ xác nhận / Đang giao / Đã giao / Đã hủy
- Each order card: OrderCode, date, total amount, status badge, first product image + "và X sản phẩm khác"
- Tap -> OrderDetailScreen

**OrderDetailScreen**
- Order code + status timeline
- Product list: image, title, qty, price per item
- Address info
- Price breakdown
- Coupon info (if applied)
- Note
- Action buttons:
  - Buyer: "Hủy đơn" (if PENDING)
  - Buyer: "Đã nhận hàng" (if SHIPPING, confirms delivery)

**SellerOrdersScreen**
- Accessible from: Profile > "Đơn hàng bán ra"
- Similar to OrderListScreen but shows orders received by seller
- Action buttons:
  - "Xác nhận" (PENDING -> CONFIRMED)
  - "Gửi hàng" (navigates to shipment creation in Spec 3)

### 3.2 New Components

In `src/components/commerce/`:
- `CartItemRow.tsx` — Cart item with quantity stepper
- `QuantityStepper.tsx` — +/- buttons with count display
- `CartBadge.tsx` — Badge showing cart item count on tab icon
- `WishlistButton.tsx` — Heart toggle button
- `AddressCard.tsx` — Address display card
- `AddressForm.tsx` — Address form fields
- `CouponInput.tsx` — Coupon code input with validate button
- `OrderCard.tsx` — Order summary card for lists
- `OrderStatusBadge.tsx` — Colored status badge
- `OrderTimeline.tsx` — Visual status timeline
- `PriceBreakdown.tsx` — SubTotal/Shipping/Discount/Total display
- `CheckoutSection.tsx` — Collapsible section wrapper for checkout

### 3.3 API Service Extension

Extend `src/services/api/commerce.service.ts` with:
- Wishlist methods: `toggleWishlist`, `listWishlist`
- Cart methods: `getCart`, `addToCart`, `updateCartItem`, `removeCartItem`
- Address methods: `listAddresses`, `createAddress`, `updateAddress`, `deleteAddress`, `setDefaultAddress`
- Coupon methods: `validateCoupon`, `listAvailableCoupons`
- Order methods: `checkout`, `listOrders`, `getOrder`, `cancelOrder`, `listSellerOrders`, `confirmOrder`

### 3.4 Types Extension

Extend `src/types/commerce.ts`:

```typescript
export interface WishlistItemDto {
  id: string;
  product: ProductDto;
  createdAt: string;
}

export interface CartDto {
  id: string;
  status: 'ACTIVE' | 'INACTIVE';
  items: CartItemDto[];
  itemCount: number;
  subTotal: number;
}

export interface CartItemDto {
  id: string;
  product: ProductDto;
  quantity: number;
  priceSnapshot: number;
}

export interface AddressDto {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  street: string;
  isDefault: boolean;
}

export interface CouponDto {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrderValue: number | null;
  maxDiscountAmount: number | null;
  appliesTo: 'ALL' | 'CATEGORY' | 'PRODUCT';
  activeAt: string;
  expiresAt: string;
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

export interface OrderDto {
  id: string;
  orderCode: string;
  buyerId: string;
  address: AddressDto;
  coupon: CouponDto | null;
  status: OrderStatus;
  subTotal: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  note: string | null;
  items: OrderProductDto[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderProductDto {
  id: string;
  product: ProductDto;
  sellerId: string;
  quantity: number;
  priceSnapshot: number;
  productTitleSnapshot: string;
  status: 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'RETURNED';
}
```

### 3.5 Navigation Updates

Add new routes for shopping flow screens. These can be modals or screens within the shop stack:
- `shop/cart.tsx` — CartScreen
- `shop/checkout.tsx` — CheckoutScreen
- `shop/wishlist.tsx` — WishlistScreen
- `shop/addresses.tsx` — AddressListScreen
- `shop/address-form.tsx` — AddressFormScreen
- `shop/orders.tsx` — OrderListScreen
- `shop/orders/[id].tsx` — OrderDetailScreen
- `shop/seller-orders.tsx` — SellerOrdersScreen

### 3.6 Store Updates

Extend `src/store/commerce.store.ts`:
- `cartItemCount: number` — for badge display on cart icon
- `setCartItemCount(count: number)` — updated after cart operations

---

## 4. Migration

New migration: `1760000005000-commerce-shopping.ts`

Creates tables: `wishlists`, `carts`, `cart_products`, `addresses`, `coupons`, `coupon_usages`, `orders`, `order_products`

---

## 5. File Structure Updates

### Backend (new files in commerce module)

```
tripblogger_api/src/modules/commerce/
├── (existing from Spec 1)
├── wishlist.controller.ts
├── wishlist.service.ts
├── cart.controller.ts
├── cart.service.ts
├── addresses.controller.ts
├── addresses.service.ts
├── coupons.controller.ts
├── coupons.service.ts
├── orders.controller.ts
├── orders.service.ts
├── dto/
│   ├── (existing from Spec 1)
│   ├── cart-item.dto.ts
│   ├── create-address.dto.ts
│   ├── update-address.dto.ts
│   ├── create-coupon.dto.ts
│   ├── validate-coupon.dto.ts
│   ├── checkout.dto.ts
│   └── query-orders.dto.ts
├── entities/
│   ├── (existing from Spec 1)
│   ├── wishlist.entity.ts
│   ├── cart.entity.ts
│   ├── cart-product.entity.ts
│   ├── address.entity.ts
│   ├── coupon.entity.ts
│   ├── coupon-usage.entity.ts
│   ├── order.entity.ts
│   └── order-product.entity.ts
```

### Frontend (new files)

```
tripblogger_app/
├── app/(tabs)/shop/
│   ├── (existing from Spec 1)
│   ├── cart.tsx
│   ├── checkout.tsx
│   ├── wishlist.tsx
│   ├── addresses.tsx
│   ├── address-form.tsx
│   ├── orders.tsx
│   ├── orders/[id].tsx
│   └── seller-orders.tsx
├── src/
│   ├── components/commerce/
│   │   ├── (existing from Spec 1)
│   │   ├── CartItemRow.tsx
│   │   ├── QuantityStepper.tsx
│   │   ├── CartBadge.tsx
│   │   ├── WishlistButton.tsx
│   │   ├── AddressCard.tsx
│   │   ├── AddressForm.tsx
│   │   ├── CouponInput.tsx
│   │   ├── OrderCard.tsx
│   │   ├── OrderStatusBadge.tsx
│   │   ├── OrderTimeline.tsx
│   │   ├── PriceBreakdown.tsx
│   │   └── CheckoutSection.tsx
│   ├── screens/
│   │   ├── (existing from Spec 1)
│   │   ├── CartScreen.tsx
│   │   ├── CheckoutScreen.tsx
│   │   ├── WishlistScreen.tsx
│   │   ├── AddressListScreen.tsx
│   │   ├── AddressFormScreen.tsx
│   │   ├── OrderListScreen.tsx
│   │   ├── OrderDetailScreen.tsx
│   │   └── SellerOrdersScreen.tsx
```

---

## 6. Checkout Business Rules (detailed)

1. Cart must have at least 1 item
2. All cart products must still be PUBLISHED
3. All cart products must have stock >= cart quantity
4. Address must belong to current user
5. Buyer cannot buy their own products (filter out or block)
6. Coupon validation (if code provided):
   - Code exists and status = ACTIVE
   - Current date between active_at and expires_at
   - used_count < max_uses (if max_uses is set)
   - Cart subtotal >= min_order_value (if set)
   - If applies_to = CATEGORY/PRODUCT, at least one cart item matches
7. Stock decrement happens atomically in a transaction
8. If any product becomes out of stock (stock = 0), set status to OUTOFSTOCK
9. Cart transitions from ACTIVE to INACTIVE after successful checkout
10. Order code format: `TB` + 8-digit timestamp suffix + 4 random alphanumeric chars
11. Shipping fee: 30,000 VND flat rate. Free if subtotal >= 500,000 VND.

---

## 7. Out of Scope (handled in Spec 3)

- Payment entity creation and tracking
- Shipment entity and tracking
- Product ratings and reviews
- Delivery confirmation flow (auto-updating payment status)
