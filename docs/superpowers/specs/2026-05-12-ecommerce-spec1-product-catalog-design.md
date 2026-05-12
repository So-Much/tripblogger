# Spec 1: Product & Catalog — Design Document

## Overview

Add a complete product catalog system to TripBlogger, enabling any member to list travel-related products for sale. This is the foundation layer that Spec 2 (Shopping Flow) and Spec 3 (Post-Order) build upon.

**Goal:** Members can create, manage, and browse travel-related products on a new "Shop" tab with Shopee-style layout (search bar + category grid + 2-column product grid).

**Tech Stack:** NestJS + TypeORM + MSSQL (backend), Expo Router + React Native + Zustand + React Query (frontend).

---

## 1. Data Models

### 1.1 ProductEntity

Table: `products_commerce` (prefixed to avoid collision with any future `products` table).

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID (PK) | auto-generated | |
| seller_id | UUID (FK -> users.id) | NOT NULL, ON DELETE CASCADE | |
| category_id | UUID (FK -> categories.id) | NOT NULL | |
| title | nvarchar(512) | NOT NULL | |
| slug | nvarchar(512) | UNIQUE, NOT NULL | Auto-generated from title + random suffix |
| tags_json | text | nullable | JSON array of tag names, e.g. `["backpack","waterproof"]` |
| media_json | text | nullable | JSON array of media objects (same format as PostEntity) |
| description | text | NOT NULL | Plain text or sanitized HTML |
| price | decimal(18,2) | NOT NULL, CHECK >= 0 | Price in VND |
| product_type | nvarchar(32) | NOT NULL, default 'NEW' | Enum: `NEW`, `SECONDHAND` |
| stock | int | NOT NULL, default 0, CHECK >= 0 | |
| stock_unit | nvarchar(64) | NOT NULL, default 'cái' | Free-text unit. Frontend provides suggestions: cái, bộ, đôi, kg, gói, cuốn, chiếc, hộp |
| status | nvarchar(32) | NOT NULL, default 'DRAFT' | See status enum below |
| analytics_json | text | nullable | `{ "views": 0, "saves": 0, "shares": 0 }` |
| created_at | datetime | auto | |
| updated_at | datetime | auto | |
| published_at | datetime | nullable | Set when status transitions to PUBLISHED |

**Product Status Enum:**
```
DRAFT              — Bản nháp, chưa hiển thị
PENDING_REVIEW     — Chờ xem xét (future use)
PENDING_VERIFICATION — Chờ xác thực (future use)
PUBLISHED          — Đã lên sàn, hiển thị cho buyer
RESERVED           — Tạm giữ (locked during checkout)
OUTOFSTOCK         — Đã hết hàng (stock = 0)
SOLD               — Đã bán hết (for 2nd-hand single items)
RETURNED           — Hàng trả
REFUNDED           — Hoàn tiền
BLOCKED            — Vi phạm chính sách
REMOVED            — Đã xóa (soft delete)
PREORDER           — Hàng đặt trước
NEEDSPHOTOS        — Cần update thêm ảnh
```

For Spec 1, only these statuses are actively used: `DRAFT`, `PUBLISHED`, `OUTOFSTOCK`, `REMOVED`. The rest are reserved for future use.

### 1.2 CategoryEntity

Table: `categories`

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID (PK) | auto-generated |
| name | nvarchar(256) | NOT NULL, UNIQUE |
| created_at | datetime | auto |

Flat structure (no parent-child hierarchy). Admin-managed via API, seeded with initial data.

### 1.3 TagEntity

Table: `tags`

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID (PK) | auto-generated |
| name | nvarchar(128) | NOT NULL, UNIQUE |
| created_at | datetime | auto |

Tags are auto-created when a seller adds a new tag name to a product.

### 1.4 ProductTagEntity

Table: `product_tags`

| Column | Type | Constraints |
|--------|------|------------|
| product_id | UUID (FK -> products_commerce.id) | NOT NULL, ON DELETE CASCADE |
| tag_id | UUID (FK -> tags.id) | NOT NULL, ON DELETE CASCADE |
| created_at | datetime | auto |

Composite PK: (product_id, tag_id).

### 1.5 SellerVerificationEntity

Table: `seller_verifications`

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID (PK) | auto-generated |
| user_id | UUID (FK -> users.id) | NOT NULL |
| status | nvarchar(32) | NOT NULL, default 'PENDING' | Enum: PENDING, APPROVED, REJECTED |
| requested_at | datetime | auto |
| reviewed_at | datetime | nullable |
| reviewed_by | UUID (FK -> users.id) | nullable | Admin who reviewed |

Also add a `is_verified_seller` boolean column to the existing `member_profiles` table for quick lookup.

---

## 2. Backend API Design

Base path: `/commerce`

### 2.1 Products API

**POST /commerce/products**
- Auth: JWT + MEMBER + ACTIVE
- Body: `{ title, categoryId, description, price, productType, stock, stockUnit, media?, tags? }`
- Creates product in DRAFT status. Auto-generates slug.
- Returns: ProductDto

**GET /commerce/products**
- Auth: optional (public browsing)
- Query: `{ limit?, cursor?, categoryId?, search?, productType?, minPrice?, maxPrice?, sortBy? }`
- Returns only PUBLISHED products
- sortBy: `newest` (default), `price_asc`, `price_desc`, `popular`
- Cursor-based pagination (consistent with posts)

**GET /commerce/products/mine**
- Auth: JWT + MEMBER + ACTIVE
- Query: `{ limit?, cursor?, status? }`
- Returns products where seller_id = current user

**GET /commerce/products/:id**
- Auth: optional
- Returns product detail (if PUBLISHED or if current user is owner)
- Increments `analytics_json.views`

**PATCH /commerce/products/:id**
- Auth: JWT + MEMBER + ACTIVE (must be owner)
- Body: partial product fields
- Cannot update if status is BLOCKED or REMOVED

**POST /commerce/products/:id/publish**
- Auth: JWT + MEMBER + ACTIVE (must be owner)
- Transitions: DRAFT -> PUBLISHED, sets published_at
- Validates: must have at least 1 media, title, description, price > 0, stock > 0

**DELETE /commerce/products/:id**
- Auth: JWT + MEMBER + ACTIVE (must be owner)
- Soft delete: sets status to REMOVED

**POST /commerce/media**
- Auth: JWT + MEMBER + ACTIVE
- Multipart upload (reuse PostsController media upload logic)
- Saves to `uploads/commerce/` directory
- Returns media object with URLs

### 2.2 Categories API

**GET /commerce/categories**
- Auth: none (public)
- Returns all categories sorted by name

**POST /commerce/categories**
- Auth: JWT + ADMIN
- Body: `{ name }`

**PATCH /commerce/categories/:id**
- Auth: JWT + ADMIN
- Body: `{ name }`

**DELETE /commerce/categories/:id**
- Auth: JWT + ADMIN
- Fails if products reference this category

### 2.3 Tags API

**GET /commerce/tags**
- Auth: none (public)
- Query: `{ search? }` for autocomplete
- Returns matching tags (limit 20)

### 2.4 Seller Verification API

**POST /commerce/seller/verify**
- Auth: JWT + MEMBER + ACTIVE
- Creates a verification request (status: PENDING)
- Fails if already has PENDING or APPROVED request

**GET /commerce/seller/verification-status**
- Auth: JWT + MEMBER + ACTIVE
- Returns current verification status or null

**POST /commerce/admin/seller/:userId/approve**
- Auth: JWT + ADMIN
- Sets verification status to APPROVED
- Sets `member_profiles.is_verified_seller = true`

**POST /commerce/admin/seller/:userId/reject**
- Auth: JWT + ADMIN
- Sets verification status to REJECTED

---

## 3. Frontend Architecture

### 3.1 Navigation

Add 4th tab "Shop" to `app/(tabs)/_layout.tsx`:

```
Tabs:
  - index (Home)
  - posts (Posts stack)
  - shop (Shop stack)  <-- NEW
  - explore (Settings)
```

Shop stack routes in `app/(tabs)/shop/`:
- `_layout.tsx` — Stack navigator
- `index.tsx` — ShopScreen (main listing)
- `[id].tsx` — ProductDetailScreen
- `search.tsx` — SearchScreen with filters
- `my-products.tsx` — MyProductsScreen (seller view)
- `create.tsx` — ProductCreateScreen

### 3.2 Screens

**ShopScreen (`shop/index.tsx`)**
- Top: Search bar (tappable, navigates to search screen)
- Categories: Horizontal ScrollView with icon + name badges
- Products: 2-column FlatList grid with infinite scroll
- Each ProductCard: thumbnail image, title (2 lines max), price (VND formatted), ProductType badge (New/2hand), seller name + verified badge
- Pull-to-refresh

**ProductDetailScreen (`shop/[id].tsx`)**
- Image carousel (horizontal pager with dots indicator)
- Price + ProductType badge
- Title
- Seller card: avatar, display name, verified badge (checkmark icon if verified)
- Description (expandable)
- Tags (chips)
- Stock info: "Còn {stock} {stockUnit}"
- Bottom sticky bar: "Thêm vào giỏ" + "Mua ngay" + heart icon (wishlist)

**SearchScreen (`shop/search.tsx`)**
- Auto-focus text input
- Filter chips: Category, ProductType, Price range
- Results: same 2-column grid as ShopScreen
- Recent searches (local storage)

**MyProductsScreen (`shop/my-products.tsx`)**
- Horizontal tab filter: All / Draft / Published / Sold / Out of Stock
- Product list (vertical, 1 column with more detail)
- Each item: thumbnail, title, price, status badge, stock count
- FAB (floating action button): "+" to create new product
- Swipe actions: Edit, Delete

**ProductCreateScreen (`shop/create.tsx`)**
- Multi-image picker (up to 10 images)
- Form fields:
  - Title (text input)
  - Category (bottom sheet picker)
  - Tags (text input with autocomplete, chip display)
  - Description (multiline text input)
  - Price (numeric input with VND formatting)
  - ProductType (toggle: New / 2nd-hand)
  - Stock (numeric input)
  - StockUnit (text input with suggestion dropdown)
- Bottom buttons: "Lưu nháp" (Save Draft) / "Đăng bán" (Publish)
- Edit mode: same screen, pre-filled with existing data

### 3.3 Components

New components in `src/components/commerce/`:
- `ProductCard.tsx` — Grid card for product listing
- `ProductGrid.tsx` — 2-column FlatList wrapper
- `CategoryChip.tsx` — Category badge for horizontal scroll
- `CategoryPicker.tsx` — Bottom sheet category selector
- `SellerBadge.tsx` — Seller name + verified checkmark
- `PriceLabel.tsx` — Formatted VND price display
- `ProductTypeBadge.tsx` — New/2nd-hand badge
- `StockInfo.tsx` — Stock count + unit display
- `TagInput.tsx` — Tag input with autocomplete
- `MediaPickerGrid.tsx` — Multi-image picker for product creation

### 3.4 API Service

New file: `src/services/api/commerce.service.ts`

Follows the same pattern as `posts.service.ts`:
- Uses `apiClient` (axios instance with auth interceptor)
- Exports `commerceService` object with methods for all commerce endpoints
- Normalizes media URLs (same `toAbsolute` pattern)

### 3.5 Types

New file: `src/types/commerce.ts` (extend existing)

```typescript
export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'OUTOFSTOCK' | 'SOLD' | 'REMOVED' | ...;
export type ProductType = 'NEW' | 'SECONDHAND';

export interface ProductDto {
  id: string;
  sellerId: string;
  seller: { id: string; displayName: string; username: string; isVerifiedSeller: boolean };
  categoryId: string;
  category: { id: string; name: string };
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
  analytics: { views: number; saves: number; shares: number };
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface CategoryDto { id: string; name: string; }
export interface TagDto { id: string; name: string; }
export interface PaginatedProducts { items: ProductDto[]; nextCursor: string | null; total: number; }
```

### 3.6 State Management

New Zustand store: `src/store/commerce.store.ts`
- Minimal store for local UI state (selected category filter, search query, cart badge count)
- Server data handled by React Query (useQuery/useMutation)

### 3.7 i18n

Add commerce-related keys to `src/i18n/index.ts` for both `vi` and `en` dictionaries.

---

## 4. Seed Data

### 4.1 Categories

```
Outdoor Gear       — Dụng cụ ngoài trời
Travel Tech        — Công nghệ du lịch
Luggage & Bags     — Vali & Túi xách
Clothing           — Quần áo du lịch
Accessories        — Phụ kiện
Camping            — Cắm trại
Photography        — Nhiếp ảnh
Books & Maps       — Sách & Bản đồ
```

### 4.2 Seed Script

Create `src/scripts/seed-categories.ts` following the pattern of existing `seed-user.ts`.

---

## 5. Migration

New migration file: `1760000004000-commerce-foundation.ts`

Creates tables:
- `categories`
- `tags`
- `products_commerce`
- `product_tags`
- `seller_verifications`

Adds column `is_verified_seller` (bit, default 0) to `member_profiles`.

---

## 6. File Structure (Backend)

```
tripblogger_api/src/modules/commerce/
├── commerce.module.ts
├── commerce.controller.ts          — Product endpoints
├── commerce.service.ts             — Product business logic
├── categories.controller.ts        — Category CRUD
├── categories.service.ts
├── tags.service.ts                 — Tag autocomplete & auto-create
├── seller-verification.controller.ts
├── seller-verification.service.ts
├── dto/
│   ├── create-product.dto.ts
│   ├── update-product.dto.ts
│   ├── query-products.dto.ts
│   ├── create-category.dto.ts
│   └── seller-verification.dto.ts
├── entities/
│   ├── product.entity.ts
│   ├── category.entity.ts
│   ├── tag.entity.ts
│   ├── product-tag.entity.ts
│   └── seller-verification.entity.ts
└── constants.ts                    — Status enums, defaults
```

## 7. File Structure (Frontend)

```
tripblogger_app/
├── app/(tabs)/shop/
│   ├── _layout.tsx
│   ├── index.tsx                   — ShopScreen
│   ├── [id].tsx                    — ProductDetailScreen
│   ├── search.tsx                  — SearchScreen
│   ├── my-products.tsx             — MyProductsScreen
│   └── create.tsx                  — ProductCreateScreen
├── src/
│   ├── components/commerce/
│   │   ├── ProductCard.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── CategoryChip.tsx
│   │   ├── CategoryPicker.tsx
│   │   ├── SellerBadge.tsx
│   │   ├── PriceLabel.tsx
│   │   ├── ProductTypeBadge.tsx
│   │   ├── StockInfo.tsx
│   │   ├── TagInput.tsx
│   │   └── MediaPickerGrid.tsx
│   ├── screens/
│   │   ├── ShopScreen.tsx
│   │   ├── ProductDetailScreen.tsx
│   │   ├── SearchScreen.tsx
│   │   ├── MyProductsScreen.tsx
│   │   └── ProductCreateScreen.tsx
│   ├── services/api/
│   │   └── commerce.service.ts
│   ├── store/
│   │   └── commerce.store.ts
│   └── types/
│       └── commerce.ts             — Extend existing
```

---

## 8. Out of Scope (handled in Spec 2 & 3)

- Cart, Wishlist, Address management
- Checkout & Order creation
- Payment processing
- Shipment tracking
- Product ratings & reviews
- Coupon system
