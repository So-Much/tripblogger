<div align="center">

<!-- Animated hero — works on GitHub -->
<svg width="100%" height="220" viewBox="0 0 960 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="TripBlogger">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B1F2A"/>
      <stop offset="45%" stop-color="#123D4A"/>
      <stop offset="100%" stop-color="#1A5C4A"/>
      <animate attributeName="x2" values="1;0.2;1" dur="10s" repeatCount="indefinite"/>
    </linearGradient>
    <linearGradient id="neon" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3EE0B0"/>
      <stop offset="50%" stop-color="#7CF5FF"/>
      <stop offset="100%" stop-color="#F4C95F"/>
      <animate attributeName="x1" values="0%;40%;0%" dur="6s" repeatCount="indefinite"/>
      <animate attributeName="x2" values="100%;60%;100%" dur="6s" repeatCount="indefinite"/>
    </linearGradient>
    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="4" result="b"/>
      <feMerge>
        <feMergeNode in="b"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="960" height="220" rx="24" fill="url(#sky)"/>

  <!-- soft orbs -->
  <circle cx="140" cy="70" r="48" fill="#3EE0B0" opacity="0.12">
    <animate attributeName="cy" values="70;90;70" dur="5s" repeatCount="indefinite"/>
  </circle>
  <circle cx="820" cy="150" r="70" fill="#7CF5FF" opacity="0.1">
    <animate attributeName="cx" values="820;780;820" dur="7s" repeatCount="indefinite"/>
  </circle>

  <!-- dotted map grid -->
  <g opacity="0.18" stroke="#9FD9C8" stroke-width="1">
    <path d="M60 40 H900 M60 80 H900 M60 120 H900 M60 160 H900 M60 200 H900"/>
    <path d="M120 20 V200 M240 20 V200 M360 20 V200 M480 20 V200 M600 20 V200 M720 20 V200 M840 20 V200"/>
  </g>

  <!-- animated route -->
  <path id="route" d="M90 160 C180 90, 260 190, 360 120 S540 60, 640 130 S800 180, 880 90"
        fill="none" stroke="url(#neon)" stroke-width="3.5" stroke-linecap="round"
        stroke-dasharray="12 10" filter="url(#softGlow)">
    <animate attributeName="stroke-dashoffset" from="0" to="-220" dur="4s" repeatCount="indefinite"/>
  </path>

  <!-- traveling pin -->
  <g filter="url(#softGlow)">
    <circle r="7" fill="#F4C95F">
      <animateMotion dur="8s" repeatCount="indefinite" rotate="auto"
        path="M90 160 C180 90, 260 190, 360 120 S540 60, 640 130 S800 180, 880 90"/>
    </circle>
    <circle r="14" fill="#F4C95F" opacity="0.25">
      <animate attributeName="r" values="10;18;10" dur="1.6s" repeatCount="indefinite"/>
      <animateMotion dur="8s" repeatCount="indefinite"
        path="M90 160 C180 90, 260 190, 360 120 S540 60, 640 130 S800 180, 880 90"/>
    </circle>
  </g>

  <!-- title -->
  <text x="480" y="88" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-size="46" font-weight="700" fill="#F4FFF8" letter-spacing="1.5">
    TripBlogger
  </text>
  <text x="480" y="122" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
        font-size="15" fill="#9FD9C8">
    feed · map · itinerary · commerce
  </text>

  <!-- typing subtitle -->
  <text x="480" y="168" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
        font-size="18" fill="#7CF5FF" filter="url(#softGlow)">
    <tspan id="typed">plan the trip. live the story.</tspan>
    <tspan fill="#F4C95F">
      <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/>|
    </tspan>
  </text>
</svg>

<br/>

**Nền tảng nội dung du lịch** — feed, bản đồ, lịch trình theo ngày, và gợi ý thương mại trong một monorepo.

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2054-000?style=for-the-badge&logo=expo)](./tripblogger_app)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](./tripblogger_api)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?style=for-the-badge&logo=react&logoColor=black)](./tripblogger_app)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](#)
[![SQL Server](https://img.shields.io/badge/SQL%20Server-TypeORM-CC2927?style=for-the-badge&logo=microsoftsqlserver&logoColor=white)](./tripblogger_api)
[![Redis](https://img.shields.io/badge/Redis-BullMQ-DC382D?style=for-the-badge&logo=redis&logoColor=white)](./tripblogger_api)

<br/>

```text
  ┌─────────────┐     JWT / REST / WS      ┌──────────────────┐
  │  Expo App   │ ◄──────────────────────► │  NestJS API      │
  │  map·plan   │                          │  /api · sockets  │
  └──────┬──────┘                          └────────┬─────────┘
         │ shared                                  │
         ▼                                         ▼
  itinerary-engine                          SQL Server + Redis
```

</div>

---

## Điểm nổi bật

| | |
|:--|:--|
| **Plan builder** | Timeline theo ngày, stop sheet, map fly-along, reorder bằng drag |
| **Map & places** | OSRM · Overpass · Photon · Nominatim + Redis cache |
| **Social feed** | Posts realtime qua Socket.IO |
| **Auth** | JWT access/refresh + Google OAuth |
| **Media** | Upload Multer · Sharp WebP · Vision Camera (dev build) |
| **Monorepo** | npm workspaces · shared `@tripblogger/itinerary-engine` |

Chi tiết stack có bằng chứng trong repo: [`TECH_STACK.md`](./TECH_STACK.md)

---

## Kiến trúc

```mermaid
flowchart LR
  subgraph Client
    A[Expo Router App]
    A --> B[Zustand]
    A --> C[React Query]
    A --> D[Maps / Plan Sheet]
  end

  subgraph API
    E[NestJS /api]
    E --> F[TypeORM]
    E --> G[BullMQ]
    E --> H[Socket.IO]
  end

  subgraph Data
    I[(SQL Server)]
    J[(Redis)]
    K[uploads/]
  end

  C -->|Axios| E
  H <-->|realtime| A
  F --> I
  G --> J
  E --> K
  A -.->|shared| L[@tripblogger/itinerary-engine]
  E -.-> L
```

```
tripblogger/
├── tripblogger_api/           # NestJS · TypeORM · SQL Server · Redis
├── tripblogger_app/           # Expo SDK 54 · RN · maps · plan UI
├── packages/itinerary-engine/ # schedule · opening hours · travel mode
├── docs/                      # spec & cấu trúc nội bộ
└── TECH_STACK.md              # khảo sát công nghệ trong repo
```

---

## Yêu cầu

- **Node.js** LTS (20+)
- **npm** (workspaces)
- **Microsoft SQL Server**
- **Redis** (map cache + BullMQ — full `start:dev` cần Redis)

---

## Quick start

### 1. API

```bash
cp tripblogger_api/.env.example tripblogger_api/.env   # Windows: copy tay
cd tripblogger_api
npm install
npm run migration:run
npm run seed:all
npm run start:dev
```

API: **`http://localhost:3000/api`**

### 2. App

```bash
cd tripblogger_app
npm install
# .env ← EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
npm run start
```

> Trên thiết bị thật, app **tự rewrite `localhost` → IP Metro** khi development. Simulator/emulator dùng `localhost` ổn.

| Package | README |
|---------|--------|
| API | [`tripblogger_api/README.md`](./tripblogger_api/README.md) |
| App | [`tripblogger_app/README.md`](./tripblogger_app/README.md) |

---

## Stack nhanh

<div align="center">

| Layer | Tech |
|:------|:-----|
| **App** | Expo 54 · React 19 · RN 0.81 · Expo Router · Reanimated · Zustand · TanStack Query |
| **API** | NestJS 11 · TypeORM · mssql · Passport JWT · Helmet · Throttler · Sharp |
| **Realtime** | Socket.IO |
| **Jobs** | BullMQ + Redis |
| **Observability** | Prometheus · Grafana · Loki · OTEL Collector (`docker-compose.observability.yml`) |
| **Shared** | `@tripblogger/itinerary-engine` (pure TS) |

</div>

---

<details>
<summary><strong>Production migration checklist</strong> (mở rộng)</summary>

### 1) Hạ tầng

- Tách `dev` / `staging` / `production` (không dùng chung DB/Redis)
- API + SQL Server + Redis + reverse proxy (Nginx/Caddy) + TLS

### 2) Env production

**API:** `NODE_ENV`, `PORT`, `DB_*`, `JWT_*`, `REDIS_*`, `ADMIN_SECRET`, `GOOGLE_OAUTH_AUDIENCES`  
**App (build):** `EXPO_PUBLIC_API_BASE_URL=https://<domain>/api`, Google client id theo môi trường

### 3) DB

```bash
cd tripblogger_api && npm run migration:run
```

Chỉ seed roles/statuses cần thiết — tránh seed user demo.

### 4) Upload ảnh

- Hiện lưu `uploads/` và serve `/uploads/*`
- Production: persistent volume, quota, backup; trung hạn → S3/Cloudinary

### 5) Deploy

```bash
# API
npm ci && npm run build && node dist/main.js

# App: Expo production build với env production
```

Proxy: `/api/*` → API · `/uploads/*` → static

### 6) Bảo mật

- HTTPS + HSTS · CORS theo domain thật · rotate secrets · rate-limit auth
- Không mở Swagger/debug public trừ khi có auth

### 7) Observability & backup

- Metrics / logs · backup SQL Server + `uploads/` · kiểm tra restore

### 8) Smoke test

- Login/refresh trên ≥2 thiết bị · profile/avatar · session sau cold start · URL avatar từ mạng ngoài

</details>

---

## Git & bảo mật

- **Không commit** `.env`, keystore, token
- `.gitignore` đã loại `node_modules`, `.expo`, IDE folders, pattern secret phổ biến

---

## Docs thêm

| File | Nội dung |
|------|----------|
| [`TECH_STACK.md`](./TECH_STACK.md) | Công nghệ / version có bằng chứng trong repo |
| [`docs/TRIP_FEATURE_SPEC.md`](./docs/TRIP_FEATURE_SPEC.md) | Đặc tả trip planning |
| [`docs/PROJECT_STRUCTURE.md`](./docs/PROJECT_STRUCTURE.md) | Bản đồ cấu trúc |

---

<div align="center">

<svg width="320" height="36" viewBox="0 0 320 36" xmlns="http://www.w3.org/2000/svg">
  <text x="160" y="24" text-anchor="middle"
        font-family="ui-monospace, Menlo, monospace" font-size="13" fill="#5A8A7A">
    made for the road ahead
    <animate attributeName="opacity" values="0.45;1;0.45" dur="3s" repeatCount="indefinite"/>
  </text>
</svg>

<br/>

<sub>License theo policy dự án (chưa gắn mặc định trong repo).</sub>

</div>
