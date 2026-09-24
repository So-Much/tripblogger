# Tiến độ TripBlogger — nền tảng, Geo, Trip

Cập nhật: 2026-09-17

## Now

Ba service đã được tách trong monorepo: **Core** (`tripblogger_api`), **Geo Service** (`services/geo-service`), **Trip Service** (`services/trip-service`), phía trước là Traefik. Search địa điểm dùng Typesense + Photon tự host (Việt Nam). App Expo vẫn gọi một base URL `/api`. Place card hiển thị giờ/SĐT/web/ảnh/review; search không gọi OSRM mặc định.

## Done

- **2026-09-14 — Specs & plans:** `docs/superpowers/specs/2026-09-14-*-design.md`, `docs/superpowers/plans/2026-09-14-*.md`
- **Nền tảng:** `@tripblogger/contracts` / `auth` / `events`; `GET /api/health/ready`; Dockerfile Core; `docker-compose.yml` profiles `infra` + `apps`; Traefik; CI `.github/workflows/ci.yml`; script `test` của app; RS256/JWKS trên Core (`GET /api/auth/.well-known/jwks.json`)
- **Geo Service:** search/nearby/reverse/route; import `--fixture`; đóng góp địa điểm; alias `/locations` `/saved-locations` `/checkins`; internal `table-legs`
- **Trip Service:** CRUD lịch trình, `place_id` (JSON vẫn `locationId`), optimistic `expectedVersion` → 409, budget `/api/trips/budget`, legs qua Geo
- **App:** i18n contribute + version conflict; empty-search “thêm địa điểm”; “đề xuất sửa” trên PlaceDetail; mutations gửi `expectedVersion`
- **2026-09-17 — Map search + place card UX:** spec/plan `docs/superpowers/*2026-09-17-map-search-place-card-ux*`; `MapPlaceDto` + `PlaceDetailDto` + `isOpenNow`; Geo toDto enrichment, `GET /places/:id` reviews, reverse 50m POI snap, import upsert Typesense; Core search bỏ OSRM mặc định (`map:search:v6`, `roadDistance=1` opt-in); PlaceDetailSheet rich card; debounce 180ms; markers ~44dp + selected zIndex

## In progress

none

## Next

- Tải Photon index VN và OSM PBF đầy đủ trên `D:\tripblogger-data` (xem runbook import)
- Bật RS256 thật: `node infra/jwt/generate-dev-keys.js` rồi trỏ env key path
- Chạy `geo:import --fixture` / `geo:migrate-locations` / `trip:migrate-from-core` trên SQL Server local
- Vector tiles / OSRM tự host / thêm quốc gia
- Clustering / native `onPoiClick` (đã cố ý out of scope đợt place-card UX)

## How to run (today)

```powershell
# 1) Chuyển Docker disk sang D: — docs/runbooks/docker-data-on-d.md
copy .env.compose.example .env.compose
node infra/jwt/generate-dev-keys.js
docker compose --env-file .env.compose --profile infra up -d
docker compose --env-file .env.compose --profile apps up --build

# Local không compose (Core vẫn chứa trips/map nếu GEO_DELEGATE/TRIP_DELEGATE trống):
cd tripblogger_api; npm run start:dev
cd tripblogger_app; npx expo start
```

App: `EXPO_PUBLIC_API_BASE_URL=http://<lan-ip>:3000/api`

## Known gaps

- Photon container chưa có index VN cho đến khi chạy runbook import — reverse trả 503 `photon_unavailable` (khi snap 50m không thấy POI)
- Typesense trống cho đến `npm run geo:import -- --fixture` trong geo-service (import giờ cũng upsert Typesense)
- Core `locations` / `trips` bảng cũ vẫn còn; script migrate là một chiều
- `Alert.prompt` không dùng trên Android; “đề xuất sửa” gửi address hiện tại
- Docker build `npm ci` cần lockfile đã gồm workspace `services/*` (chạy `npm install` ở root một lần)
- Place card reviews chỉ có khi `source === 'db'` và Geo phục vụ `GET /places/:id`
