# Wave 2 — Commerce — Design Spec

**Date:** 2026-05-19  
**Status:** Implemented (default gate decisions)  
**Master plan:** `missing_fields_phased_5023662f.plan.md`

## Gate A2 (defaults applied)

| Item | Decision |
|------|----------|
| Order line `product.media` | **Implement** — hydrate from `media_json` |
| Coupon DTO on checkout | **Implement** — show `expiresAt`, `minOrderValue` |
| `updateProduct` / `deleteProduct` UI | **Implement** — `ProductEditScreen` |
| Seller verification UI | **Implement** — request + status screen |
| Shop `sortBy` / `productType` | **Implement** — filter chips |
| Product analytics increment | **Defer** |
| Order `REFUNDED` flow | **Defer** |
| Payment gateway fields | **Defer** (COD-only) |
| `product_tags` junction read | **Defer** (keep `tagsJson`) |

## Delivered

- API: `parseProductMediaJson` util; order serialize includes media; ISO dates on orders
- App: `ProductEditScreen`, seller verification, shop filters, checkout coupon meta, order line thumbnails
- MSSQL `useUTC` (from time/hashtag work) applies to commerce timestamps

## Verify

- Seller edits draft → publish; delete product
- Checkout shows coupon expiry / min order
- Order detail shows product thumb
- Shop sort/type filters change listing
