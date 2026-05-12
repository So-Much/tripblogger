# Shopping Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build complete shopping flow: Wishlist, Cart, Address management, Coupon system, and Checkout/Order creation so users can purchase products.

**Architecture:** Extends the existing `CommerceModule` with new entities, services, and controllers for wishlist, cart, address, coupon, and order. Frontend adds new screens in the shop stack.

**Tech Stack:** NestJS + TypeORM + MSSQL, Expo SDK 54 + React Native 0.81 + Zustand + React Query + Axios

**Depends on:** Spec 1 (Product & Catalog) must be completed first.

---

### Task 1: Backend — Shopping Entities

**Files:**
- Create: `tripblogger_api/src/modules/commerce/entities/wishlist.entity.ts`
- Create: `tripblogger_api/src/modules/commerce/entities/cart.entity.ts`
- Create: `tripblogger_api/src/modules/commerce/entities/cart-product.entity.ts`
- Create: `tripblogger_api/src/modules/commerce/entities/address.entity.ts`
- Create: `tripblogger_api/src/modules/commerce/entities/coupon.entity.ts`
- Create: `tripblogger_api/src/modules/commerce/entities/coupon-usage.entity.ts`
- Create: `tripblogger_api/src/modules/commerce/entities/order.entity.ts`
- Create: `tripblogger_api/src/modules/commerce/entities/order-product.entity.ts`
- Create: `tripblogger_api/src/modules/commerce/entities/payment.entity.ts`

- [ ] **Step 1: Create WishlistEntity**

```typescript
// tripblogger_api/src/modules/commerce/entities/wishlist.entity.ts
import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';
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

  @ManyToOne(() => ProductEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

- [ ] **Step 2: Create CartEntity and CartProductEntity**

CartEntity: id, userId, status (ACTIVE/INACTIVE/MERGED/ABANDONED), createdAt, updatedAt.
CartProductEntity: id, cartId, productId, quantity, priceSnapshot, createdAt. Unique(cartId, productId).

- [ ] **Step 3: Create AddressEntity**

Fields: id, userId, label, recipientName, phone, province, district, ward, street, isDefault (bit), createdAt.

- [ ] **Step 4: Create CouponEntity and CouponUsageEntity**

CouponEntity: id, code (unique), type, value, minOrderValue, maxDiscountAmount, maxUses, usedCount, appliesTo, appliesToIdsJson, status, activeAt, expiresAt, createdAt.
CouponUsageEntity: id, couponId, userId, orderId, usedAt.

- [ ] **Step 5: Create OrderEntity and OrderProductEntity**

OrderEntity: id, orderCode (unique), buyerId, addressId, couponId (nullable), status, subTotal, shippingFee, discountAmount, totalAmount, note, createdAt, updatedAt.
OrderProductEntity: id, orderId, productId, sellerId, quantity, priceSnapshot, productTitleSnapshot, status, createdAt.

- [ ] **Step 6: Create PaymentEntity (basic)**

PaymentEntity: id, orderId (unique), method, status, amount, transactionRef (nullable), gatewayResponse (nullable), paidAt (nullable), createdAt. This is created here but fully utilized in Spec 3.

- [ ] **Step 7: Add order/cart status constants**

Add to `tripblogger_api/src/modules/commerce/constants.ts`:

```typescript
export const CART_STATUSES = ['ACTIVE', 'INACTIVE', 'MERGED', 'ABANDONED'] as const;
export type CartStatus = (typeof CART_STATUSES)[number];

export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'REFUNDED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_PRODUCT_STATUSES = ['PROCESSING', 'SHIPPED', 'DELIVERED', 'RETURNED'] as const;
export type OrderProductStatus = (typeof ORDER_PRODUCT_STATUSES)[number];

export const PAYMENT_METHODS = ['COD', 'MOMO', 'VNPAY', 'BANKING', 'STRIPE'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const COUPON_TYPES = ['PERCENTAGE', 'FIXED'] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const COUPON_APPLIES_TO = ['ALL', 'CATEGORY', 'PRODUCT'] as const;
export type CouponAppliesTo = (typeof COUPON_APPLIES_TO)[number];

export const SHIPPING_FEE = 30000;
export const FREE_SHIPPING_THRESHOLD = 500000;
```

- [ ] **Step 8: Commit**

```bash
git add tripblogger_api/src/modules/commerce/entities/
git add tripblogger_api/src/modules/commerce/constants.ts
git commit -m "feat(commerce): add entities for wishlist, cart, address, coupon, order, payment"
```

---

### Task 2: Backend — Shopping Migration

**Files:**
- Create: `tripblogger_api/src/migrations/1760000005000-commerce-shopping.ts`

- [ ] **Step 1: Create shopping migration**

Creates tables: `wishlists`, `carts`, `cart_products`, `addresses`, `coupons`, `coupon_usages`, `orders`, `order_products`, `payments`.

Include all constraints, indexes, foreign keys. Follow MSSQL syntax patterns from `1760000004000-commerce-foundation.ts`.

Key constraints:
- `wishlists`: UNIQUE(user_id, product_id)
- `cart_products`: UNIQUE(cart_id, product_id)
- `orders.order_code`: UNIQUE
- `payments.order_id`: UNIQUE
- Status CHECK constraints for all status columns
- Index on `orders(buyer_id)`, `orders(status)`, `order_products(order_id)`

- [ ] **Step 2: Update typeorm datasource with new entities**

- [ ] **Step 3: Run migration**

```bash
cd tripblogger_api
npm run migration:run
```

- [ ] **Step 4: Commit**

```bash
git add tripblogger_api/src/migrations/1760000005000-commerce-shopping.ts
git add tripblogger_api/src/config/db/typeorm.datasource.ts
git commit -m "feat(commerce): add migration for shopping flow tables"
```

---

### Task 3: Backend — Shopping DTOs

**Files:**
- Create: `tripblogger_api/src/modules/commerce/dto/cart-item.dto.ts`
- Create: `tripblogger_api/src/modules/commerce/dto/create-address.dto.ts`
- Create: `tripblogger_api/src/modules/commerce/dto/update-address.dto.ts`
- Create: `tripblogger_api/src/modules/commerce/dto/create-coupon.dto.ts`
- Create: `tripblogger_api/src/modules/commerce/dto/validate-coupon.dto.ts`
- Create: `tripblogger_api/src/modules/commerce/dto/checkout.dto.ts`
- Create: `tripblogger_api/src/modules/commerce/dto/query-orders.dto.ts`

- [ ] **Step 1: Create all DTOs**

Each DTO uses class-validator decorators following the patterns in existing DTOs.

Key DTOs:
- `AddToCartDto`: `{ productId: string, quantity?: number }` (default 1)
- `UpdateCartItemDto`: `{ quantity: number }` (min 0, 0 = remove)
- `CreateAddressDto`: all address fields with validation
- `UpdateAddressDto`: partial fields
- `ValidateCouponDto`: `{ code: string, cartSubTotal: number }`
- `CheckoutDto`: `{ addressId: string, couponCode?: string, note?: string }`
- `QueryOrdersDto`: `{ limit?, cursor?, status? }`
- `CreateCouponDto`: all coupon fields for admin

- [ ] **Step 2: Commit**

```bash
git add tripblogger_api/src/modules/commerce/dto/
git commit -m "feat(commerce): add DTOs for shopping flow endpoints"
```

---

### Task 4: Backend — Wishlist Service & Controller

**Files:**
- Create: `tripblogger_api/src/modules/commerce/wishlist.service.ts`
- Create: `tripblogger_api/src/modules/commerce/wishlist.controller.ts`

- [ ] **Step 1: Create wishlist service**

Methods:
- `toggle(userId, productId)`: if exists, delete and return `{ wishlisted: false }`. If not, create and return `{ wishlisted: true }`.
- `listWishlist(userId, { limit, cursor })`: return paginated products in user's wishlist.
- `isWishlisted(userId, productId)`: check if product is in wishlist.

- [ ] **Step 2: Create wishlist controller**

```
@Controller('commerce/wishlist')
POST /:productId — toggle wishlist
GET / — list wishlist (paginated)
```

- [ ] **Step 3: Commit**

```bash
git add tripblogger_api/src/modules/commerce/wishlist.service.ts
git add tripblogger_api/src/modules/commerce/wishlist.controller.ts
git commit -m "feat(commerce): add wishlist service and controller"
```

---

### Task 5: Backend — Cart Service & Controller

**Files:**
- Create: `tripblogger_api/src/modules/commerce/cart.service.ts`
- Create: `tripblogger_api/src/modules/commerce/cart.controller.ts`

- [ ] **Step 1: Create cart service**

Methods:
- `getOrCreateActiveCart(userId)`: finds ACTIVE cart or creates one. Returns cart with items and product details.
- `addItem(userId, { productId, quantity })`: validates product is PUBLISHED, stock sufficient. If already in cart, increments quantity. Snapshots current price.
- `updateItem(userId, itemId, { quantity })`: validates stock. If quantity = 0, removes item.
- `removeItem(userId, itemId)`: removes from cart.
- `getCartSummary(userId)`: returns { items, itemCount, subTotal }.

Response serialization: each cart item includes product details (title, media, seller info).

- [ ] **Step 2: Create cart controller**

```
@Controller('commerce/cart')
GET / — get active cart
POST /items — add item
PATCH /items/:itemId — update quantity
DELETE /items/:itemId — remove item
```

- [ ] **Step 3: Commit**

```bash
git add tripblogger_api/src/modules/commerce/cart.service.ts
git add tripblogger_api/src/modules/commerce/cart.controller.ts
git commit -m "feat(commerce): add cart service and controller"
```

---

### Task 6: Backend — Address Service & Controller

**Files:**
- Create: `tripblogger_api/src/modules/commerce/addresses.service.ts`
- Create: `tripblogger_api/src/modules/commerce/addresses.controller.ts`

- [ ] **Step 1: Create address service**

Methods:
- `list(userId)`: all addresses sorted by isDefault DESC, createdAt DESC.
- `create(userId, dto)`: creates address. If first address or isDefault=true, set as default (unset others).
- `update(userId, id, dto)`: must be owner.
- `remove(userId, id)`: must be owner. Block if referenced by active order.
- `setDefault(userId, id)`: unset all others, set this one.

- [ ] **Step 2: Create address controller**

```
@Controller('commerce/addresses')
GET / — list addresses
POST / — create address
PATCH /:id — update address
DELETE /:id — delete address
POST /:id/default — set as default
```

- [ ] **Step 3: Commit**

```bash
git add tripblogger_api/src/modules/commerce/addresses.service.ts
git add tripblogger_api/src/modules/commerce/addresses.controller.ts
git commit -m "feat(commerce): add address management service and controller"
```

---

### Task 7: Backend — Coupon Service & Controller

**Files:**
- Create: `tripblogger_api/src/modules/commerce/coupons.service.ts`
- Create: `tripblogger_api/src/modules/commerce/coupons.controller.ts`

- [ ] **Step 1: Create coupon service**

Methods:
- `validate(code, cartSubTotal)`: checks all conditions (exists, ACTIVE, not expired, usage limit, min order value). Returns { valid, coupon, discountAmount, reason }.
- `calculateDiscount(coupon, subTotal)`: for PERCENTAGE: min(value% * subTotal, maxDiscountAmount). For FIXED: value.
- `listAvailable(cartSubTotal?)`: returns applicable coupons.
- `create(dto)`: admin create.
- `update(id, dto)`: admin update.
- `disable(id)`: admin disable.
- `recordUsage(couponId, userId, orderId)`: create CouponUsage, increment usedCount.
- `rollbackUsage(couponId, userId, orderId)`: delete CouponUsage, decrement usedCount.

- [ ] **Step 2: Create coupon controller**

```
@Controller('commerce/coupons')
POST /validate — validate coupon (MEMBER)
GET /available — list available coupons (MEMBER)

@Controller('commerce/admin/coupons')
POST / — create coupon (ADMIN)
PATCH /:id — update coupon (ADMIN)
DELETE /:id — disable coupon (ADMIN)
```

- [ ] **Step 3: Commit**

```bash
git add tripblogger_api/src/modules/commerce/coupons.service.ts
git add tripblogger_api/src/modules/commerce/coupons.controller.ts
git commit -m "feat(commerce): add coupon validation and management"
```

---

### Task 8: Backend — Order Service & Controller (Checkout)

**Files:**
- Create: `tripblogger_api/src/modules/commerce/orders.service.ts`
- Create: `tripblogger_api/src/modules/commerce/orders.controller.ts`
- Create: `tripblogger_api/src/modules/commerce/payments.service.ts` (basic version)

- [ ] **Step 1: Create basic payment service**

```typescript
// tripblogger_api/src/modules/commerce/payments.service.ts
@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
  ) {}

  async createCodPayment(orderId: string, amount: number) {
    const entity = this.paymentRepo.create({
      orderId, method: 'COD', status: 'PENDING', amount,
    });
    return this.paymentRepo.save(entity);
  }

  async findByOrderId(orderId: string) {
    return this.paymentRepo.findOne({ where: { orderId } });
  }
}
```

- [ ] **Step 2: Create order service**

Key method — `checkout(buyerId, dto)`:

```
1. Get active cart with items
2. Validate cart not empty
3. Validate all products PUBLISHED + sufficient stock
4. Validate buyer doesn't own any product in cart
5. Validate address belongs to buyer
6. Validate coupon if provided
7. BEGIN TRANSACTION
8.   Calculate subTotal, shippingFee, discountAmount, totalAmount
9.   Generate orderCode: 'TB' + Date.now().toString(36).toUpperCase() + randomUUID().slice(0,4).toUpperCase()
10.  Create OrderEntity
11.  Create OrderProductEntity for each cart item (snapshot price and title)
12.  Decrement stock for each product. If stock = 0, set OUTOFSTOCK.
13.  Record coupon usage if applicable
14.  Create PaymentEntity (COD, PENDING)
15.  Set cart status to INACTIVE
16. COMMIT
17. Return OrderDto
```

Other methods:
- `listBuyerOrders(buyerId, query)`: paginated, filter by status
- `getOrder(id, userId)`: detail (must be buyer or seller)
- `cancelOrder(buyerId, id)`: PENDING -> CANCELLED, restore stock, rollback coupon
- `listSellerOrders(sellerId, query)`: orders containing seller's products
- `confirmOrder(sellerId, id)`: PENDING -> CONFIRMED

- [ ] **Step 3: Create order controller**

```
@Controller('commerce/orders')
POST /checkout — create order from cart
GET / — list buyer's orders
GET /seller — list seller's orders
GET /:id — order detail
POST /:id/cancel — cancel order
POST /:id/confirm — seller confirm order
```

- [ ] **Step 4: Verify compilation**

```bash
cd tripblogger_api
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add tripblogger_api/src/modules/commerce/orders.service.ts
git add tripblogger_api/src/modules/commerce/orders.controller.ts
git add tripblogger_api/src/modules/commerce/payments.service.ts
git commit -m "feat(commerce): add order checkout with transaction safety"
```

---

### Task 9: Backend — Update Commerce Module

**Files:**
- Modify: `tripblogger_api/src/modules/commerce/commerce.module.ts`

- [ ] **Step 1: Register all new entities, services, and controllers**

Add to imports TypeOrmModule.forFeature: WishlistEntity, CartEntity, CartProductEntity, AddressEntity, CouponEntity, CouponUsageEntity, OrderEntity, OrderProductEntity, PaymentEntity.

Add controllers: WishlistController, CartController, AddressesController, CouponsController, OrdersController.

Add providers: WishlistService, CartService, AddressesService, CouponsService, OrdersService, PaymentsService.

Export: OrdersService, PaymentsService (needed by Spec 3).

- [ ] **Step 2: Verify app starts**

```bash
cd tripblogger_api
npm run start:dev
```

- [ ] **Step 3: Commit**

```bash
git add tripblogger_api/src/modules/commerce/commerce.module.ts
git commit -m "feat(commerce): register shopping flow services in CommerceModule"
```

---

### Task 10: Frontend — Shopping Types Extension

**Files:**
- Modify: `tripblogger_app/src/types/commerce.ts`

- [ ] **Step 1: Add shopping types**

Add all types from Spec 2 design: WishlistItemDto, CartDto, CartItemDto, AddressDto, CouponDto, OrderStatus, OrderDto, OrderProductDto, and related types.

- [ ] **Step 2: Commit**

```bash
git add tripblogger_app/src/types/commerce.ts
git commit -m "feat(commerce): add frontend types for shopping flow"
```

---

### Task 11: Frontend — Shopping API Service Extension

**Files:**
- Modify: `tripblogger_app/src/services/api/commerce.service.ts`

- [ ] **Step 1: Add shopping API methods**

Add methods to `commerceService`:
- Wishlist: `toggleWishlist(productId)`, `listWishlist(params)`
- Cart: `getCart()`, `addToCart(body)`, `updateCartItem(itemId, body)`, `removeCartItem(itemId)`
- Address: `listAddresses()`, `createAddress(body)`, `updateAddress(id, body)`, `deleteAddress(id)`, `setDefaultAddress(id)`
- Coupon: `validateCoupon(body)`, `listAvailableCoupons(params)`
- Order: `checkout(body)`, `listOrders(params)`, `getOrder(id)`, `cancelOrder(id)`, `listSellerOrders(params)`, `confirmOrder(id)`

- [ ] **Step 2: Commit**

```bash
git add tripblogger_app/src/services/api/commerce.service.ts
git commit -m "feat(commerce): add shopping flow API methods"
```

---

### Task 12: Frontend — i18n Keys for Shopping

**Files:**
- Modify: `tripblogger_app/src/i18n/index.ts`

- [ ] **Step 1: Add all shopping i18n keys**

Add keys for cart, wishlist, address, checkout, order, coupon in both `vi` and `en` dictionaries. Refer to Spec 3 design doc section 7 for the complete list.

- [ ] **Step 2: Commit**

```bash
git add tripblogger_app/src/i18n/index.ts
git commit -m "feat(commerce): add i18n keys for shopping flow"
```

---

### Task 13: Frontend — Shopping Components

**Files:**
- Create: `tripblogger_app/src/components/commerce/CartItemRow.tsx`
- Create: `tripblogger_app/src/components/commerce/QuantityStepper.tsx`
- Create: `tripblogger_app/src/components/commerce/CartBadge.tsx`
- Create: `tripblogger_app/src/components/commerce/WishlistButton.tsx`
- Create: `tripblogger_app/src/components/commerce/AddressCard.tsx`
- Create: `tripblogger_app/src/components/commerce/CouponInput.tsx`
- Create: `tripblogger_app/src/components/commerce/OrderCard.tsx`
- Create: `tripblogger_app/src/components/commerce/OrderStatusBadge.tsx`
- Create: `tripblogger_app/src/components/commerce/OrderTimeline.tsx`
- Create: `tripblogger_app/src/components/commerce/PriceBreakdown.tsx`

- [ ] **Step 1: Create QuantityStepper** — minus/plus buttons with count display. Props: value, onChange, min=1, max.

- [ ] **Step 2: Create CartItemRow** — product image, title, seller, price, QuantityStepper, delete button.

- [ ] **Step 3: Create CartBadge** — small red circle with count, overlays on cart icon.

- [ ] **Step 4: Create WishlistButton** — heart icon, toggles fill/outline on press. Uses `commerceService.toggleWishlist`.

- [ ] **Step 5: Create AddressCard** — displays address with label badge, recipient, phone, full address. Default badge if isDefault.

- [ ] **Step 6: Create CouponInput** — text input + "Áp dụng" button. Shows discount result or error message.

- [ ] **Step 7: Create OrderCard** — order code, date, total, status badge, first product image.

- [ ] **Step 8: Create OrderStatusBadge** — colored badge for each order status.

- [ ] **Step 9: Create OrderTimeline** — vertical timeline with status steps, active step highlighted.

- [ ] **Step 10: Create PriceBreakdown** — rows: SubTotal, Shipping, Discount, Total (bold).

- [ ] **Step 11: Commit**

```bash
git add tripblogger_app/src/components/commerce/
git commit -m "feat(commerce): add shopping flow UI components"
```

---

### Task 14: Frontend — Cart & Wishlist Screens

**Files:**
- Create: `tripblogger_app/src/screens/CartScreen.tsx`
- Create: `tripblogger_app/src/screens/WishlistScreen.tsx`
- Create: `tripblogger_app/app/(tabs)/shop/cart.tsx`
- Create: `tripblogger_app/app/(tabs)/shop/wishlist.tsx`

- [ ] **Step 1: Implement CartScreen**

- FlatList of CartItemRow
- Bottom sticky: item count, subtotal (PriceLabel), "Thanh toán" button -> CheckoutScreen
- Empty state: "Giỏ hàng trống"
- useQuery for cart data, useMutation for update/remove

- [ ] **Step 2: Implement WishlistScreen**

- ProductGrid (2 columns) showing wishlisted products
- Heart icon on each card to toggle
- Empty state

- [ ] **Step 3: Create route files**

- [ ] **Step 4: Connect WishlistButton and CartBadge in ProductDetailScreen and ShopScreen header**

- [ ] **Step 5: Commit**

```bash
git add tripblogger_app/src/screens/CartScreen.tsx
git add tripblogger_app/src/screens/WishlistScreen.tsx
git add tripblogger_app/app/(tabs)/shop/cart.tsx
git add tripblogger_app/app/(tabs)/shop/wishlist.tsx
git commit -m "feat(commerce): implement cart and wishlist screens"
```

---

### Task 15: Frontend — Address Screens

**Files:**
- Create: `tripblogger_app/src/screens/AddressListScreen.tsx`
- Create: `tripblogger_app/src/screens/AddressFormScreen.tsx`
- Create: `tripblogger_app/app/(tabs)/shop/addresses.tsx`
- Create: `tripblogger_app/app/(tabs)/shop/address-form.tsx`

- [ ] **Step 1: Implement AddressListScreen** — list of AddressCards, swipe to delete, default badge, FAB to add.

- [ ] **Step 2: Implement AddressFormScreen** — form with Label picker (Nhà/Công ty/Khác), RecipientName, Phone, Province, District, Ward, Street, isDefault toggle. Edit mode if address ID in params.

- [ ] **Step 3: Create route files**

- [ ] **Step 4: Commit**

```bash
git add tripblogger_app/src/screens/AddressListScreen.tsx
git add tripblogger_app/src/screens/AddressFormScreen.tsx
git add tripblogger_app/app/(tabs)/shop/addresses.tsx
git add tripblogger_app/app/(tabs)/shop/address-form.tsx
git commit -m "feat(commerce): implement address management screens"
```

---

### Task 16: Frontend — Checkout Screen

**Files:**
- Create: `tripblogger_app/src/screens/CheckoutScreen.tsx`
- Create: `tripblogger_app/app/(tabs)/shop/checkout.tsx`

- [ ] **Step 1: Implement CheckoutScreen**

Sections (vertical scroll):
1. Delivery Address: show default or prompt to select. Tap "Thay đổi" -> address picker.
2. Order Summary: readonly product list from cart.
3. Coupon: CouponInput component.
4. Payment: COD (pre-selected, only option).
5. Shipping: display fee (30,000 or "Miễn phí").
6. Price Breakdown: PriceBreakdown component.
7. Note: optional text input.

Bottom: "Đặt hàng" button.

Use `useMutation` for `commerceService.checkout`. On success, navigate to OrderDetail.

Handle errors: out of stock, invalid coupon, address missing.

- [ ] **Step 2: Create route file**

- [ ] **Step 3: Commit**

```bash
git add tripblogger_app/src/screens/CheckoutScreen.tsx
git add tripblogger_app/app/(tabs)/shop/checkout.tsx
git commit -m "feat(commerce): implement checkout screen with coupon and price breakdown"
```

---

### Task 17: Frontend — Order Screens

**Files:**
- Create: `tripblogger_app/src/screens/OrderListScreen.tsx`
- Create: `tripblogger_app/src/screens/OrderDetailScreen.tsx`
- Create: `tripblogger_app/src/screens/SellerOrdersScreen.tsx`
- Create: `tripblogger_app/app/(tabs)/shop/orders.tsx`
- Create: `tripblogger_app/app/(tabs)/shop/orders/[id].tsx`
- Create: `tripblogger_app/app/(tabs)/shop/seller-orders.tsx`

- [ ] **Step 1: Implement OrderListScreen**

- Horizontal filter tabs: Tất cả / Chờ xác nhận / Đang giao / Đã giao / Đã hủy
- FlatList of OrderCards
- Tap -> OrderDetailScreen
- useInfiniteQuery with filter

- [ ] **Step 2: Implement OrderDetailScreen**

- Order code + status timeline (OrderTimeline)
- Product list: image, title, qty, price
- Address info
- PriceBreakdown
- Coupon info if applied
- Note
- Action: "Hủy đơn" button (if PENDING)
- Placeholder sections for Payment and Shipment (will be filled in Spec 3)

- [ ] **Step 3: Implement SellerOrdersScreen**

- Similar to OrderListScreen but uses `commerceService.listSellerOrders`
- Action: "Xác nhận" button for PENDING orders

- [ ] **Step 4: Create route files**

- [ ] **Step 5: Commit**

```bash
git add tripblogger_app/src/screens/OrderListScreen.tsx
git add tripblogger_app/src/screens/OrderDetailScreen.tsx
git add tripblogger_app/src/screens/SellerOrdersScreen.tsx
git add tripblogger_app/app/(tabs)/shop/orders.tsx
git add tripblogger_app/app/(tabs)/shop/orders/
git add tripblogger_app/app/(tabs)/shop/seller-orders.tsx
git commit -m "feat(commerce): implement order listing and detail screens"
```

---

### Task 18: Frontend — Store & Navigation Integration

**Files:**
- Modify: `tripblogger_app/src/store/commerce.store.ts`
- Modify: `tripblogger_app/src/screens/ProductDetailScreen.tsx` (connect cart/wishlist buttons)
- Modify: `tripblogger_app/src/screens/ShopScreen.tsx` (add cart/wishlist icons in header)

- [ ] **Step 1: Update commerce store** — add cart badge count tracking.

- [ ] **Step 2: Connect ProductDetailScreen actions** — "Thêm vào giỏ" calls `commerceService.addToCart`, "Mua ngay" adds to cart then navigates to checkout, heart icon uses WishlistButton.

- [ ] **Step 3: Add navigation links** — ShopScreen header gets cart icon (with badge) and wishlist icon. Profile/Settings screen gets "Đơn hàng của tôi" and "Đơn hàng bán ra" links.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(commerce): integrate shopping flow with navigation and store"
```

---

### Task 19: End-to-End Verification

- [ ] **Step 1: Test full shopping flow**

1. Browse products on Shop tab
2. Add product to wishlist (heart icon toggles)
3. Add product to cart
4. View cart, adjust quantity
5. Add delivery address
6. Checkout with COD
7. View order in "Đơn hàng của tôi"
8. Seller confirms order in "Đơn hàng bán ra"
9. Cancel an order (PENDING status)

- [ ] **Step 2: Final commit**

```bash
git add -A
git commit -m "feat(commerce): complete Spec 2 - Shopping Flow"
```
