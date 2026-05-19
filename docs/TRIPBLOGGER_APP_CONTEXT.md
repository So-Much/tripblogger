# TripBlogger — App & API Context (handoff file)

> **Cách dùng:** Trên thiết bị / session Cursor mới, gõ `@docs/TRIPBLOGGER_APP_CONTEXT.md` (hoặc attach file này) trước khi yêu cầu implement. File này tóm tắt kiến trúc, trạng thái feature, convention và việc còn lại — không thay chat history.

**Cập nhật:** 2026-05-19  
**Repo:** `d:\tripblogger` (monorepo)  
**Nhánh thường làm việc gần đây:** `feat/product` (e-commerce); có nhánh `feat/composition` (media/capture/posts polish) với commit riêng.

---

## 1. Tổng quan sản phẩm

TripBlogger = app du lịch + mạng xã hội + **sàn TMĐT nhẹ** (listing, giỏ, checkout, đơn hàng). Hai package chính:

| Package | Vai trò |
|---------|---------|
| `tripblogger_api/` | NestJS + TypeORM + **SQL Server** |
| `tripblogger_app/` | Expo Router + React Native + TanStack Query + Zustand |

API prefix: **`/api`** (xem `tripblogger_api/src/main.ts`).

---

## 2. Cấu trúc thư mục quan trọng

```
tripblogger/
├── tripblogger_api/src/
│   ├── modules/auth/          # guest, login, refresh, GET /auth/me
│   ├── modules/users/         # profile PATCH, GET /users/me/stats
│   ├── modules/posts/         # feed, CRUD, comments, reactions, share
│   ├── modules/commerce/      # catalog, cart, orders, coupons, seller verify, payments (COD)
│   ├── common/utils/          # iso-date (một số nhánh)
│   └── migrations/            # commerce 1760000004000–6000
├── tripblogger_app/
│   ├── app/(tabs)/            # Expo routes
│   │   ├── index.tsx          # Home
│   │   ├── shop/              # Marketplace stack
│   │   ├── posts/             # Feed / create / detail
│   │   ├── capture.tsx        # Camera / media
│   │   └── explore.tsx
│   ├── src/screens/           # Screen implementations
│   ├── src/services/api/      # apiClient + *Service
│   ├── src/components/        # UI theo domain
│   ├── src/store/             # Zustand (auth, composer handoff)
│   ├── src/i18n/index.ts      # vi + en
│   └── src/types/
└── docs/
    ├── TRIPBLOGGER_APP_CONTEXT.md   # ← file này (nên commit)
    └── superpowers/                 # spec/plan local — có thể gitignore
```

**Plan Cursor (local):** `C:\Users\somuc\.cursor\plans\e-commerce_marketplace_9ec04d7d.plan.md` — roadmap TMĐT đầy đủ (Phase 0–6).

---

## 3. Auth & vai trò

| Role | Hành vi |
|------|---------|
| **GUEST** | `authService.guest()` khi mở app (`app/_layout.tsx`); xem feed PUBLIC, browse shop; checkout với `guestInfo` |
| **MEMBER** | Login/register; cart, wishlist, addresses, seller flows |

**Quy ước UX (user rules):**
- Không hiển thị raw UUID trên UI.
- Guest = im lặng (không label “Guest” trừ CTA đăng nhập).
- Ưu tiên **display name** hơn username khi user đã đặt tên (`src/utils/display-name.ts` — có trên nhánh composition).

**Me API:** `GET /auth/me` → `MeResponse` (role, statuses, statusDetails?, profile). Sau boot: hydrate `setMe` trong `_layout.tsx` (composition).

---

## 4. Domain: Posts / Social

### API (đã có trên nhiều nhánh)
- `GET /posts/feed` — cursor, PUBLIC published
- `GET /posts/:id` — guest đọc PUBLIC
- Author trong serialize; share, reactions, comments
- Composer: category, tags, visibility, location

### App
- `HomePostsFeed` + thay mock feed (wave 1 — **feat/composition**)
- `PostCreateScreen`: hashtag chips, auto-save draft, UTC → local time (`datetime.ts`)
- `CommentThread`, `PostPreviewCard`: `formatSocialTimestamp`
- Feedback UI: `PressableScale`, `ShakeView`, `ActionPulse`

### MSSQL quan trọng
- `useUTC: true` trong TypeORM (`typeorm.options.ts`) — **bắt buộc** để comment/post time đúng giờ máy user.

---

## 5. Domain: Commerce (trọng tâm `feat/product`)

### API modules (`tripblogger_api/src/modules/commerce/`)

**Controllers:** products, categories, tags, seller verify, wishlist, cart, addresses, coupons (public + admin), orders, shipments, ratings.

**Entities chính:** Product, Category, Cart, CartProduct, Address, Coupon, Order, OrderProduct, Payment, Shipment, Wishlist, SellerVerification, ProductRating.

**Luồng đơn hàng (MVP):**
1. Cart ACTIVE → `POST /commerce/orders/checkout`
2. Tạo order PENDING + line items + **COD payment** PENDING
3. Seller `confirm` → CONFIRMED → tạo shipment → SHIPPING → DELIVERED
4. Buyer `received` / shipment DELIVERED → payment PAID
5. Cancel PENDING → hoàn stock + coupon

**Hằng số:** `SHIPPING_FEE = 30000`, `FREE_SHIPPING_THRESHOLD = 500000` (VND) — `constants.ts`.

**Payment:** Chỉ **COD** implemented; enum có MOMO, VNPAY, BANKING, STRIPE — chưa gateway.

**Seller verification:** `POST /commerce/seller/verify`, `GET verification-status`; admin approve → `MemberProfile.isVerifiedSeller = true`. **Lưu ý:** `publishProduct` API **chưa** bắt buộc verified (Phase 1 plan).

### App shop routes (`app/(tabs)/shop/`)

| Route | Screen | Ghi chú |
|-------|--------|---------|
| `index` | ShopScreen | Catalog + filters |
| `search` | ShopSearchScreen | search ≥2 chars |
| `[id]` | ProductDetailScreen | cart, wishlist |
| `cart` | CartScreen | ScrollView+map (plan: đổi FlatList) |
| `checkout` | CheckoutScreen | member address / guest form, coupon |
| `orders`, `order/[id]` | Orders, OrderDetail | buyer + seller tabs |
| `my-products`, `create` | Seller listing |
| `edit/[id]` | ProductEditScreen | **Phase 0 — có thể chưa commit** |
| `seller-verify` | SellerVerificationScreen | **Phase 0** |
| `wishlist`, `addresses`, `address-form`, `ratings/[productId]` | |

**Service:** `src/services/api/commerce.service.ts` — normalize product media URLs (`toAbsolute`).

### Phase 0 TMĐT (đã code, kiểm tra `git status` trên máy dev)

- API: `commerce-media.util.ts` + order serialize **có media** (không còn `media: []`)
- App: ProductEdit, Seller verify UI, Shop sort/type filters, ProductList (`maxPages: 5`), HomeCommerceDeals, address edit/default, coupon meta checkout, i18n seller/home
- Fix tsc: `AddressListScreen` import `View`; `ProductCreateScreen` duplicate `useQuery`

### Chưa làm (plan `e-commerce_marketplace`)

| Phase | Nội dung |
|-------|----------|
| **1** | Gate publish API verified seller; checkout idempotency; coupon per-user; guest validate coupon |
| **2** | VNPay + MoMo + chuyển khoản + webhooks + PaymentMethodPicker |
| **3** | Refund request/approve |
| **4** | Multi-seller order grouping; seller dashboard inline actions |
| **5** | Cart FlatList; sticky checkout; Mua ngay; OrderStatusTimeline; optimistic cart |
| **6** | Affiliate (deferred) |

---

## 6. Domain: Capture / Composition

- Tab `capture.tsx`, components `TakeMediaZoomRail`, `CaptureFlashTorchBar`
- `boomerang-encode.ts` — có thể lỗi tsc nếu thiếu `ffmpeg-kit`
- Nhánh `feat/composition`: compositions, media migration

---

## 7. Home shell

**feat/product (hiện tại có thể vẫn mock feed):**
- `FeedSection` + `FEED_POSTS` mock
- Phase 0: `HomeCommerceDeals` (API products), search → shop, PromoBanner/QuickActions i18n

**feat/composition:** `HomePostsFeed` API, bỏ mock deals.

---

## 8. Convention code

### API
- Guards: `JwtAuthGuard`, `RolesGuard`, `StatusesGuard` — `@Roles('MEMBER','GUEST')`, `@RequiredStatuses('ACTIVE')`
- Route order: `me/*` trước `:id` trong users controller
- Dates: `toISOString()` khi serialize; DB UTC (`useUTC: true`)

### App
- Screens trong `src/screens/`, routes mỏng trong `app/`
- Data: `useQuery` / `useInfiniteQuery` — queryKey `['commerce', ...]`
- i18n: thêm key **cả vi và en** trong `src/i18n/index.ts`
- Theme: `useThemeColor`, `ThemedText`, `ThemedView`
- Icons: `IconSymbol` (SF Symbols) — **không** emoji làm icon UI
- Lists dài: **FlatList** + `initialNumToRender` / `maxPages` — tránh `ScrollView` + map (cart cần sửa)

### Git / user rules
- **Không commit** trừ khi user yêu cầu.
- Không co-author Cursor trong commit (filter-branch nếu hook thêm).
- `docs/superpowers/` có thể gitignore — file **này** nên **commit** để đồng bộ máy.

---

## 9. Lệnh verify

```powershell
cd tripblogger_api; npm run build
cd tripblogger_app; npx tsc --noEmit
```

Lỗi tsc đã biết (không chặn commerce): `boomerang-encode.ts`, một số icon types — xem full output.

---

## 10. Env & chạy app

- API: `.env` (không commit) — MSSQL connection, JWT, upload paths
- App: `EXPO_PUBLIC_API_URL` hoặc tương đương trong config client (`src/services/api/client.ts`)
- Uploads: `tripblogger_api/uploads/` — avatars, product media

---

## 11. UX principles (marketplace plan)

| Vai trò | Mục tiêu tap |
|---------|----------------|
| Buyer | ≤3 tap từ detail → có trong giỏ; checkout gọn |
| Seller | Verify 1 lần; listing ~4 bước; xử lý đơn ít tap |
| Perf | API `limit: 20`; client `maxPages: 5` infinite query; FlatList |

Sticky patterns: shop header (search, wishlist, cart badge); detail footer Thêm giỏ / Mua ngay (plan); checkout sticky tổng tiền (plan).

---

## 12. Tài liệu tham chiếu (local, có thể không trên git)

| Tài liệu | Nội dung |
|----------|----------|
| `docs/superpowers/specs/2026-05-12-ecommerce-spec*.md` | Spec gốc catalog / shopping / post-order |
| `docs/superpowers/specs/2026-05-19-wave-*-design.md` | Wave 1–3 missing-fields |
| `docs/superpowers/specs/2026-05-19-time-hashtags-interaction-feedback-design.md` | Time, hashtags, animation |
| `.cursor/plans/e-commerce_marketplace_9ec04d7d.plan.md` | Master plan TMĐT + UX journeys |

---

## 13. Snapshot commit (tham khảo)

**feat/product (remote history):**
- `eea376c` feat(product): init base ecommerce
- `ddb5d7f` feat(product): seed product data

**feat/composition (nếu merge / cherry-pick):**
- `chore: ignore local superpowers specs`
- `feat(api): post feed, commerce order media, user stats, UTC`
- `feat(app): posts feed, shop flows, auth profile, home marketplace`
- `feat(capture): flash torch bar, zoom rail, boomerang`

**Trước khi làm việc mới:** chạy `git status`, `git branch`, đọc diff — Phase 0 có thể **uncommitted** trên `feat/product`.

---

## 14. Prompt mẫu cho session mới

```
@docs/TRIPBLOGGER_APP_CONTEXT.md

Tiếp tục Phase [N] plan e-commerce marketplace:
- [mô tả task cụ thể]
- Không commit trừ khi tôi bảo
- Giữ convention i18n vi/en, FlatList cho list dài
```

---

## 15. Checklist nhanh khi nhận task

- [ ] Đang ở nhánh nào? `feat/product` vs `feat/composition`?
- [ ] API đã chạy + migration commerce?
- [ ] `useUTC: true` cho time-sensitive features?
- [ ] Guest vs MEMBER guards đúng endpoint?
- [ ] File i18n cập nhật cả hai ngôn ngữ?
- [ ] List UI dùng FlatList + pagination, không load vô hạn bộ nhớ?
