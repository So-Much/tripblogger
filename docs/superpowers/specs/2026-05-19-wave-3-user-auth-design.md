# Wave 3 — User/Auth — Design Spec

**Date:** 2026-05-19  
**Gate A3 defaults:** email Implement; browsingHistory Defer; fake stats Remove → real counts API

## Delivered

- Hydrate `me` after guest/refresh on app boot
- Optional email on member profile (Settings + API)
- `statusDetails[]` with catalog `displayName` on `/auth/me`
- `GET /users/me/stats` — `postsCount`, `productsCount`
- `StatusBadges` on Settings
- Home/Profile drop fake followers/following

## Deferred

- `browsingHistory` column usage
- Full followers/following social graph
