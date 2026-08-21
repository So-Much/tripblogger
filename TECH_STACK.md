# TripBlogger — Tech Stack

Tài liệu tổng hợp công nghệ / thư viện / kỹ thuật **có bằng chứng trong repo** (đọc từ `package.json`, config, source).  
Version theo khai báo trong `package.json` (có thể là range `^` / `~`).

> Cập nhật khi khảo sát repo · không phải changelog.

---

## 1. Tổng quan kiến trúc

| Thành phần | Path | Vai trò |
|------------|------|---------|
| Root monorepo | `/` | npm **workspaces** (`packages/*`, `tripblogger_api`, `tripblogger_app`) |
| API | `tripblogger_api/` | Backend NestJS + TypeORM + SQL Server |
| App | `tripblogger_app/` | Client Expo / React Native (mobile + web) |
| Shared package | `packages/itinerary-engine/` | Logic lịch trình (schedule, opening hours, travel mode) |

**Mục tiêu sản phẩm (README):** nền tảng nội dung du lịch + gợi ý thương mại (feed, profile, deals, map/trips).

```
tripblogger/
├── tripblogger_api/          # NestJS API (:3000, prefix /api)
├── tripblogger_app/          # Expo Router app
├── packages/itinerary-engine/
├── docs/                     # tài liệu nội bộ
└── scripts/
```

**Runtime khuyến nghị:** Node.js LTS (README: 20+), npm workspaces.

---

## 2. Frontend (`tripblogger_app`)

### Framework & nền tảng

| Tech | Version (package.json) | Ghi chú |
|------|------------------------|---------|
| Expo | `~54.0.36` | SDK 54 |
| React | `19.1.0` | override ở root |
| React DOM | `19.1.0` | web |
| React Native | `0.81.5` | |
| TypeScript | `~5.9.2` | `strict: true` |
| react-native-web | `~0.21.0` | target web |

**Cấu hình Expo nổi bật (`app.json`):**
- `newArchEnabled: true` (New Architecture)
- `experiments.typedRoutes: true`
- `experiments.reactCompiler: true`
- Web output: `static`
- Scheme: `tripbloggerapp`

### Routing & navigation

- **expo-router** `~6.0.24` — file-based routing (`app/`)
- **@react-navigation/native** `^7.1.8`, bottom-tabs `^7.4.0`, elements `^2.6.3`
- Nhóm route: `(auth)`, `(tabs)` — home, explore, capture, posts, shop, trips, settings…

### UI / UX libraries

| Lib | Version | Dùng cho |
|-----|---------|----------|
| `@expo/vector-icons` | `^15.0.3` | icon |
| `@expo-google-fonts/noto-serif-display` | `^0.4.2` | font |
| `@expo-google-fonts/space-mono` | `^0.4.2` | font |
| `@gorhom/bottom-sheet` | `^5.2.14` | sheet (trip plan…) |
| `react-native-reanimated` | `~4.1.1` | animation |
| `react-native-gesture-handler` | `~2.28.0` | gesture |
| `react-native-safe-area-context` | `~5.6.0` | safe area |
| `react-native-screens` | `~4.16.0` | native screens |
| `react-native-svg` | `15.12.1` | SVG |
| `react-native-draggable-flatlist` | `^4.0.3` | reorder stop / media |
| `expo-image` | `~3.0.11` | ảnh |
| `expo-haptics` | `~15.0.8` | haptic |
| `expo-splash-screen` | `~31.0.13` | splash |
| `expo-status-bar` / `expo-system-ui` / `expo-symbols` | theo SDK | system UI |

**Styling:** React Native `StyleSheet` + themed components (`ThemedText` / `ThemedView`, light/dark/system). Không thấy Tailwind / styled-components.

### State & data fetching

| Tech | Version | Vai trò |
|------|---------|---------|
| Zustand | `^5.0.12` | client state (`auth`, `settings`, map, handoff…) |
| TanStack React Query | `^5.99.0` | server state / cache / infinite query |
| Axios | `^1.15.0` | HTTP client (`src/services/api`) |

### Forms & validation

- **react-hook-form** `^7.72.1`
- **@hookform/resolvers** `^5.2.2`
- **zod** `^4.3.6`

### Auth / bảo mật phía app

- JWT session qua API; tokens trong Zustand
- **expo-secure-store** `~15.0.8` (vd. recent searches)
- Google OAuth: **expo-auth-session** `~7.0.11` + **expo-web-browser** + **expo-crypto**
- Env: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_EXPO_PROJECT_FOR_PROXY`

### Map / camera / media / location

| Tech | Version | Vai trò |
|------|---------|---------|
| `react-native-maps` | `1.20.1` | bản đồ |
| `expo-location` | `~19.0.8` | GPS |
| `expo-camera` | `~17.0.10` | camera (plugin) |
| `react-native-vision-camera` | `^4.7.2` | composition camera (dev build, không Expo Go) |
| `react-native-vision-camera-face-detector` | `^1.10.2` | căn mặt |
| `react-native-worklets` / `worklets-core` | `0.5.1` / `^1.6.3` | frame processor |
| `expo-image-picker` | `17.0.11` | chọn ảnh |
| `expo-media-library` | `~18.2.1` | lưu thư viện |
| `@react-native-community/datetimepicker` | `8.4.4` | chọn ngày |

### Realtime

- **socket.io-client** `^4.8.3` — sync posts realtime (`src/services/realtime`)

### Shared engine

- `@tripblogger/itinerary-engine` `*` — Metro resolve từ workspace (`metro.config.js`)

### i18n

- Custom (`src/i18n`) — **vi / en**, không dùng i18next

### Build / bundler

- **Metro** (Expo default) + `metro.config.js` (monorepo watchFolders, `disableHierarchicalLookup`)
- Scripts: `expo start`, `expo run:android` / `ios`, `expo start --web`

---

## 3. Backend / API (`tripblogger_api`)

### Runtime & framework

| Tech | Version | Ghi chú |
|------|---------|---------|
| NestJS (`@nestjs/common/core/...`) | `^11.1.19` | |
| `@nestjs/platform-express` | `^11.1.19` | HTTP |
| `@nestjs/platform-socket.io` + `@nestjs/websockets` | `^11.1.19` | WebSocket |
| `@nestjs/config` | `^4.0.4` | env |
| `@nestjs/typeorm` | `^11.0.1` | ORM bridge |
| RxJS | `^7.8.2` | |
| TypeScript | `^6.0.3` | `target: es2021`, decorators, `strict` |
| Dev server | `ts-node-dev` `^2.0.0` | `start:dev` |
| Build | `tsc -p tsconfig.build.json` → `node dist/main.js` | |

**Global prefix:** `/api` · **CORS:** bật (`NestFactory.create(..., { cors: true })`).

### Domain modules (`src/modules/*`)

`auth`, `users`, `posts`, `media`, `compositions`, `commerce`, `places`, `locations`, `map`, `trips`, `health`

### ORM & database driver

| Tech | Version |
|------|---------|
| TypeORM | `^0.3.28` |
| mssql | `^12.5.2` |
| `synchronize: false` | migrations tay |

DB: **Microsoft SQL Server** (`type: 'mssql'`, `useUTC: true`).

### Auth

| Tech | Version | Pattern |
|------|---------|---------|
| `@nestjs/jwt` | `^11.0.2` | access + refresh |
| `@nestjs/passport` + `passport` + `passport-jwt` | `^11.0.5` / `^0.7.0` / `^4.0.1` | JWT strategy |
| `bcryptjs` | `^3.0.3` | hash password |
| `google-auth-library` | `^10.5.0` | verify Google ID token |
| Guards | custom | `JwtAuthGuard`, `RolesGuard`, `StatusesGuard`, optional JWT |

Refresh token: rotate + revoke-by-jti (bảng `refresh_tokens`) — theo README + `auth.service`.

### Validation & DTO

- Global `ValidationPipe` (`whitelist`, `transform`, `forbidNonWhitelisted`)
- **class-validator** `^0.15.1` + **class-transformer** `^0.5.1`
- Env validate bằng **zod** `^4.4.3` (`config/env/env.schema.ts`)

### Security / HTTP

| Tech | Version | Evidence |
|------|---------|----------|
| `helmet` | `^8.1.0` | `main.ts` |
| `@nestjs/throttler` | `^6.5.0` | global `ThrottlerGuard` + throttle auth |
| `sanitize-html` | `^2.17.3` | sanitize nội dung HTML |

### Queue / Redis

| Tech | Version | Vai trò |
|------|---------|---------|
| Redis (`ioredis`) | `^5.10.1` | cache map + BullMQ connection |
| BullMQ | `^5.76.5` | queues `email`, `image-processing` |
| Worker | `media.migration.worker.ts` | migrate media local |

### Upload / image

- **Multer** (`diskStorage` qua Nest FileInterceptor) — avatars, posts, commerce
- **sharp** `^0.34.5` — rotate / resize / WebP
- Static serve: `/uploads/*` (local disk)

### Realtime

- Socket.IO gateway: `posts.realtime.gateway.ts` (`post:join` / `post:leave`)

### Map / geo integrations (HTTP outbound)

| Provider | URL / lib | Vai trò |
|----------|-----------|---------|
| OSRM | `routing.openstreetmap.de` | route / table legs |
| Overpass | overpass-api.de (+ fallbacks) | POI nearby |
| Photon | `photon.komoot.io` | geocode search |
| Nominatim | `nominatim.openstreetmap.org` | reverse geocode |

Shared: `@tripblogger/itinerary-engine`, Haversine util, Redis cache keys `map:nearby` / `map:search` / `map:route`.

### Observability (deps + ops)

| Tech | Version / image | Evidence |
|------|-----------------|----------|
| `prom-client` | `^15.1.3` | `GET /api/metrics` |
| OpenTelemetry packages | `@opentelemetry/*` (api, sdk-node, OTLP HTTP, auto-instrumentations…) | trong `package.json` + `OTEL_EXPORTER_OTLP_ENDPOINT` |
| Docker Compose observability | Prometheus / Grafana / Loki / OTEL Collector (`:latest`) | `docker-compose.observability.yml` |

> Các package `@opentelemetry/*`, `nestjs-pino` / `pino` / `pino-http` có trong deps nhưng **chưa thấy import trong `src/`** (chỉ metrics controller + env OTEL).

### Package có trong deps nhưng chưa thấy dùng trong source

`@nestjs/swagger`, `passport-local`, `morgan`, `cookie-parser`, `debug`, `jsonwebtoken` (có thể gián tiếp qua `@nestjs/jwt`), Express stack cũ — README vẫn nhắc Swagger “có thể bật”.

---

## 4. Shared package — `@tripblogger/itinerary-engine`

| Mục | Chi tiết |
|-----|----------|
| Version | `0.0.1` |
| Runtime deps | không (pure TS) |
| Dev | TypeScript `^5.7.3`, Jest `^29.7.0`, ts-jest `^29.2.5` |
| Export | opening-hours parse, day schedule, motorbike/OSRM travel-mode helpers |

Dùng chung bởi API (trips) và app (plan UI).

---

## 5. Database & storage

| Loại | Công nghệ | Ghi chú |
|------|-----------|---------|
| Primary DB | **SQL Server** | TypeORM migrations trong `src/migrations/` |
| Cache / broker | **Redis** | map cache + BullMQ |
| File storage | Local filesystem `uploads/` | avatars, posts, commerce (+ variants) |
| Object storage cloud | — | README khuyến nghị S3/Cloudinary sau; **chưa có trong code** |

Migrations (ví dụ): auth/profiles, posts/social, commerce, compositions/media, locations, trips/plan-builder…

---

## 6. Infra / DevOps

| Hạng mục | Trạng thái trong repo |
|----------|------------------------|
| Docker app/API production | **Không** có Dockerfile root / service |
| Docker observability | Có — Prometheus `:9090`, Grafana `:3001`, Loki `:3100`, OTEL Collector `:4317/4318` |
| CI/CD (GitHub Actions…) | **Không** thấy `.github/workflows` |
| Deploy | README: build API → `node dist/main.js` (PM2/systemd/container); Expo production build; reverse proxy Nginx/Caddy (hướng dẫn, không config trong repo) |
| Env | `.env` / `.env.example` riêng API & app |

**Env API chính:** `DB_*`, `JWT_*`, `REDIS_*`, `ADMIN_SECRET`, `GOOGLE_OAUTH_AUDIENCES`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `PORT`.  
**Env App:** `EXPO_PUBLIC_API_BASE_URL`, Google client id / Expo proxy.

---

## 7. Testing

| Package | Framework | Config | Phạm vi |
|---------|-----------|--------|---------|
| `tripblogger_api` | Jest `^29.7.0` + ts-jest `^29.2.5` | `jest.config.js` | `**/*.spec.ts` (map/OSRM/Overpass, trips, html-sanitize, http-security…) |
| `itinerary-engine` | Jest `^29.7.0` + ts-jest | `jest.config.js` | schedule, opening-hours, travel-mode |
| `tripblogger_app` | Nhiều `*.spec.ts` (trip plan helpers) + `jest.plan-helpers.config.js` | | **Jest không khai báo trong `tripblogger_app/package.json`** — có thể chạy qua hoist workspace / lệnh tay |

**Không thấy:** Playwright / Detox / Cypress / e2e config trong repo.

---

## 8. Kỹ thuật / patterns nổi bật (có trong code)

- **Modular NestJS** — module theo domain + `common/` (guards, decorators, filters, interceptors, middleware)
- **JWT access + refresh** (TTL ngắn / dài), role + status guards
- **Google OAuth** (ID token verify server-side; AuthSession client)
- **Rate limiting** (`@nestjs/throttler`)
- **Request context middleware** + HTTP logging interceptor
- **Cursor pagination** (posts, products)
- **Redis caching** cho map nearby / search / route
- **In-memory TTL cache** (places Photon/Nominatim)
- **BullMQ** image-processing worker (media migration)
- **WebSocket** posts realtime (Socket.IO)
- **Multer + Sharp** pipeline upload ảnh
- **HTML sanitize** cho nội dung user
- **UTC timestamps** SQL Server `datetime2` + TypeORM `useUTC`
- **Haversine** khoảng cách địa lý
- **Expo file-based routing** + React Query + Zustand
- **Dev API base URL rewrite** (localhost → Metro host IP trên thiết bị)
- **Composition camera** Vision Camera + face detector (cần dev client / prebuild)
- **Monorepo Metro linking** shared TS package

---

## 9. Tooling

| Tool | Nơi dùng | Version / note |
|------|----------|----------------|
| npm workspaces | root `package.json` | overrides React / RN maps / svg / image-picker |
| ESLint (API) | flat `eslint.config.mjs` | ESLint `^10.3.0`, `@typescript-eslint/*` `^8.59.2` |
| ESLint (App) | `eslint.config.js` | ESLint `^9.25.0`, `eslint-config-expo` `~10.0.0` |
| Prettier | — | **không** thấy config Prettier ở root packages |
| TypeScript | cả 3 package | API `^6.0.3` · App `~5.9.2` · Engine `^5.7.3` |
| Jest / ts-jest | API + engine (+ app specs) | xem §7 |
| Seed scripts | API `npm run seed:*` | roles, users, posts, commerce, locations… |

---

## 10. Nguồn tham chiếu nhanh

| File | Nội dung |
|------|----------|
| `README.md` | khởi động monorepo, production checklist |
| `tripblogger_api/README.md` | seed, auth flow, queues/metrics |
| `tripblogger_app/README.md` | cấu trúc app, vision-camera / prebuild |
| `docs/PROJECT_STRUCTURE.md` | bản đồ cấu trúc chi tiết (local docs) |
| `*/package.json` | nguồn version chính thức |

---

## Ghi chú / khoảng trống dữ liệu

1. **Không có CI pipeline** trong repo — không khẳng định công cụ CI bên ngoài.
2. **Không có Dockerfile** cho API/app — chỉ compose observability.
3. **Swagger / OpenTelemetry / Pino**: có dependency (và env OTEL) nhưng wiring runtime trong `src/` chưa rõ / chưa thấy.
4. **Version exact** trong lockfile có thể khác range `package.json`; bảng trên lấy theo khai báo package.
5. **E2E / app Jest script**: thiếu bằng chứng chạy chuẩn hóa trên app package.
)
