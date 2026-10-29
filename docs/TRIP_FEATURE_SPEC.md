# TRIPBLOGGER — TRIP PLANNING FEATURE
## Tài Liệu Đặc Tả Chức Năng Hoàn Chỉnh

> **Phiên bản:** 1.0  
> **Tác giả:** System Design  
> **Mục đích:** Tài liệu tham chiếu kỹ thuật để triển khai chức năng Trip Planning từ A-Z

---

## MỤC LỤC

1. [Tổng Quan Chức Năng](#1-tổng-quan-chức-năng)
2. [Data Model — Toàn Bộ Bảng](#2-data-model)
3. [State Machines — Trạng Thái](#3-state-machines)
4. [Business Logic & Validation Rules](#4-business-logic--validation-rules)
5. [Recommendation Engine](#5-recommendation-engine)
6. [User Flows — Luồng Người Dùng](#6-user-flows)
7. [API Endpoints](#7-api-endpoints)
8. [Real-time & WebSocket](#8-real-time--websocket)
9. [Tích Hợp Với Các Module Hiện Tại](#9-tích-hợp-với-các-module-hiện-tại)
10. [Database — Index & Performance](#10-database--index--performance)
11. [Edge Cases & Error Handling](#11-edge-cases--error-handling)
12. [Implementation Checklist](#12-implementation-checklist)

---

## 1. TỔNG QUAN CHỨC NĂNG

### 1.1 Mô Tả
Chức năng Trip Planning là trung tâm của TripBlogger — cho phép người dùng:
- Tạo và quản lý lịch trình du lịch (Trip) theo từng ngày (TripDay) và từng điểm dừng (TripStop)
- Nhập địa chỉ chỗ ở, hệ thống tự động gợi ý địa điểm xung quanh
- Theo dõi tiến trình chuyến đi trong thời gian thực
- Mời bạn bè cùng lên kế hoạch (collaborative planning)
- Gắn kết bài viết/ảnh vào chuyến đi sau khi hoàn thành
- Lưu địa điểm yêu thích vào bộ sưu tập cá nhân

### 1.2 Các Actor

| Actor | Mô tả |
|-------|-------|
| **Trip Owner** | Người tạo trip, có toàn quyền |
| **Trip Editor** | Thành viên được mời, có thể chỉnh sửa |
| **Trip Viewer** | Thành viên chỉ xem |
| **Guest** | Xem trip public (chỉ đọc) |
| **System** | Engine gợi ý, scheduler, notification |

### 1.3 Phạm Vi Chức Năng

```
TRIP PLANNING MODULE
├── Trip Management (CRUD trip)
├── Trip Members (mời thành viên)
├── Accommodation (quản lý chỗ ở)
├── Trip Days (lên lịch theo ngày)
│   └── Trip Stops (điểm dừng trong ngày)
├── Recommendation Engine (gợi ý địa điểm)
├── Saved Locations (bookmark cá nhân)
├── Trip ↔ Post linking (gắn bài viết)
└── Map Integration (Google Maps / Mapbox)
```

---

## 2. DATA MODEL

### 2.1 Bảng `trips`

```sql
CREATE TABLE trips (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  destination_name VARCHAR(255),           -- Tên điểm đến (Hội An, Đà Lạt...)
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  status          VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  -- Status values: DRAFT | PLANNING | ACTIVE | COMPLETED | ARCHIVED | CANCELLED
  is_public       BOOLEAN NOT NULL DEFAULT FALSE,
  cover_media_id  UUID REFERENCES media(id) ON DELETE SET NULL,
  total_budget    DECIMAL(15,2),           -- Ngân sách dự kiến
  actual_budget   DECIMAL(15,2),           -- Chi tiêu thực tế
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT trips_date_check CHECK (end_date >= start_date),
  CONSTRAINT trips_status_check CHECK (
    status IN ('DRAFT','PLANNING','ACTIVE','COMPLETED','ARCHIVED','CANCELLED')
  )
);
```

**Ghi chú thiết kế:**
- `destination_name` là text tự do — không bắt buộc FK vì trip có thể đi nhiều tỉnh
- `total_budget` vs `actual_budget` — tính tổng tự động từ các TripStop và TripAccommodation
- `is_public = TRUE` → hiển thị trên feed, khả dụng cho Guest xem

---

### 2.2 Bảng `trip_members`

```sql
CREATE TABLE trip_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL DEFAULT 'VIEWER',
  -- Role values: OWNER | EDITOR | VIEWER
  status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  -- Status values: PENDING | ACCEPTED | DECLINED | REMOVED
  note        TEXT,                        -- Ghi chú lời mời
  joined_at   TIMESTAMP WITH TIME ZONE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(trip_id, user_id),
  CONSTRAINT trip_members_role_check CHECK (role IN ('OWNER','EDITOR','VIEWER')),
  CONSTRAINT trip_members_status_check CHECK (status IN ('PENDING','ACCEPTED','DECLINED','REMOVED'))
);
```

**Ghi chú thiết kế:**
- Khi trip được tạo → tự động INSERT 1 record OWNER cho user tạo
- Chỉ có 1 OWNER duy nhất / trip (enforce ở application layer)
- OWNER không thể tự rời trip (chỉ xóa trip hoặc chuyển quyền)

---

### 2.3 Bảng `trip_accommodations`

```sql
CREATE TABLE trip_accommodations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id             UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  location_id         UUID REFERENCES locations(id) ON DELETE SET NULL,
  -- NULLable vì chỗ ở có thể chưa có trong DB locations
  custom_name         VARCHAR(255),        -- Nếu location_id NULL thì dùng field này
  custom_address      TEXT,
  custom_latitude     DECIMAL(10,8),
  custom_longitude    DECIMAL(11,8),
  check_in            DATE NOT NULL,
  check_out           DATE NOT NULL,
  room_type           VARCHAR(100),        -- VD: "Phòng đôi", "Dorm 6 người"
  confirmation_code   VARCHAR(100),
  price_per_night     DECIMAL(10,2),
  price_currency      VARCHAR(3) DEFAULT 'VND',
  is_primary          BOOLEAN NOT NULL DEFAULT TRUE,
  notes               TEXT,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT accom_date_check CHECK (check_out > check_in),
  CONSTRAINT accom_location_check CHECK (
    location_id IS NOT NULL OR (custom_name IS NOT NULL AND custom_address IS NOT NULL)
  )
);
```

**Ghi chú thiết kế:**
- `custom_*` fields dùng khi user nhập khách sạn chưa có trong DB — sẽ tạo Location mới sau
- `is_primary = TRUE` là anchor point cho recommendation engine tính khoảng cách
- Khi user nhập custom address → gọi Geocoding API để lấy lat/lng → lưu vào custom_latitude/longitude

---

### 2.4 Bảng `trip_days`

```sql
CREATE TABLE trip_days (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id             UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  day_number          INT NOT NULL,        -- Ngày 1, Ngày 2...
  title               VARCHAR(255),        -- VD: "Khám phá phố cổ Hội An"
  theme               VARCHAR(100),        -- VD: "Ẩm thực", "Biển", "Văn hóa"
  notes               TEXT,
  total_distance_km   DECIMAL(6,2),        -- Tổng quãng đường trong ngày (tính sau)
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(trip_id, day_number),
  UNIQUE(trip_id, date),
  CONSTRAINT trip_days_day_number_positive CHECK (day_number > 0)
);
```

**Ghi chú thiết kế:**
- `total_distance_km` được tính lại mỗi lần thêm/sửa/xóa TripStop
- `theme` giúp AI gợi ý: ngày theme "Biển" → gợi thêm bãi biển, seafood
- Auto-generate trip_days khi trip được tạo: loop từ start_date đến end_date

---

### 2.5 Bảng `trip_stops`

```sql
CREATE TABLE trip_stops (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_day_id             UUID NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
  location_id             UUID REFERENCES locations(id) ON DELETE SET NULL,
  custom_name             VARCHAR(255),
  custom_address          TEXT,
  custom_latitude         DECIMAL(10,8),
  custom_longitude        DECIMAL(11,8),
  order_index             INT NOT NULL,    -- Thứ tự trong ngày (0-based)
  arrival_time            TIME,            -- Giờ đến dự kiến
  departure_time          TIME,            -- Giờ rời đi dự kiến
  duration_minutes        INT,             -- Dự kiến ở bao lâu
  status                  VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
  -- Status: PLANNED | VISITING | VISITED | SKIPPED
  transport_mode          VARCHAR(20) DEFAULT 'WALK',
  -- TransportMode: WALK | MOTORBIKE | CAR | TAXI | BUS | BOAT | TRAIN | PLANE
  distance_from_prev_km   DECIMAL(6,2),   -- Khoảng cách từ điểm trước
  estimated_travel_min    INT,             -- Thời gian di chuyển ước tính
  budget_estimate         DECIMAL(10,2),  -- Chi phí dự kiến tại điểm này
  actual_spent            DECIMAL(10,2),  -- Chi thực tế sau khi visit
  notes                   TEXT,
  visited_at              TIMESTAMP WITH TIME ZONE,  -- Khi VISITED
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT trip_stops_status_check CHECK (
    status IN ('PLANNED','VISITING','VISITED','SKIPPED')
  ),
  CONSTRAINT trip_stops_transport_check CHECK (
    transport_mode IN ('WALK','MOTORBIKE','CAR','TAXI','BUS','BOAT','TRAIN','PLANE')
  ),
  CONSTRAINT trip_stops_order_non_negative CHECK (order_index >= 0),
  CONSTRAINT trip_stops_location_check CHECK (
    location_id IS NOT NULL OR custom_name IS NOT NULL
  )
);
```

**Ghi chú thiết kế:**
- `order_index` dùng khi drag & drop sắp xếp thứ tự — dùng GAP strategy: 0, 10, 20, 30... để insert ở giữa không cần update tất cả
- Khi `status → VISITED` → trigger gợi ý user viết LocationReview
- `departure_time - arrival_time` phải >= `duration_minutes` (validate ở application layer)
- `distance_from_prev_km` và `estimated_travel_min` được tính qua Directions API

---

### 2.6 Bảng `trip_recommendations`

```sql
CREATE TABLE trip_recommendations (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id                   UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  location_id               UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  based_on_accommodation_id UUID REFERENCES trip_accommodations(id) ON DELETE SET NULL,
  score                     DECIMAL(5,4) NOT NULL,   -- 0.0000 ~ 1.0000
  recommendation_basis      JSONB,
  -- Ví dụ: {"distance_km": 1.2, "avg_rating": 4.5, "popularity": 0.8, "category_match": true, "price_level": 2}
  distance_km               DECIMAL(6,2),
  estimated_duration_min    INT,
  is_dismissed              BOOLEAN NOT NULL DEFAULT FALSE,
  is_added                  BOOLEAN NOT NULL DEFAULT FALSE,  -- Đã add vào itinerary
  generated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(trip_id, location_id)
);
```

**Ghi chú thiết kế:**
- `recommendation_basis` JSONB để có thể giải thích gợi ý cho user ("Vì bạn ở gần đây", "Rating 4.8★")
- `UNIQUE(trip_id, location_id)` — mỗi location chỉ gợi ý 1 lần / trip
- Khi `is_added = TRUE` → tạo TripStop tương ứng
- Sinh lại recommendations khi: thêm/đổi accommodation, thay đổi ngày đi

---

### 2.7 Bảng `saved_locations`

```sql
CREATE TABLE saved_locations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id     UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  collection_name VARCHAR(100) DEFAULT 'Mặc định',  -- Nhóm bookmark
  note            TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, location_id)
);
```

---

### 2.8 Bảng `trip_posts` (junction)

```sql
CREATE TABLE trip_posts (
  trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  linked_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (trip_id, post_id)
);
```

---

### 2.9 Bổ sung vào bảng `locations` hiện có

```sql
-- Thêm field google_place_id nếu chưa có (để sync với Maps API)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255) UNIQUE;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS website VARCHAR(500);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS wikidata_id VARCHAR(50);

-- Index cho geospatial queries (cần extension)
CREATE EXTENSION IF NOT EXISTS postgis;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS geom GEOMETRY(POINT, 4326);
UPDATE locations SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS locations_geom_idx ON locations USING GIST(geom);
```

---

### 2.10 Bổ sung vào bảng `location_reviews` hiện có

```sql
-- Thêm trip_id để biết review này phát sinh từ chuyến đi nào
ALTER TABLE location_reviews ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES trips(id) ON DELETE SET NULL;
ALTER TABLE location_reviews ADD COLUMN IF NOT EXISTS trip_stop_id UUID REFERENCES trip_stops(id) ON DELETE SET NULL;
ALTER TABLE location_reviews ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
-- tags ví dụ: ["wifi tốt", "view đẹp", "giá hợp lý", "đông khách", "phục vụ nhanh"]
```

---

## 3. STATE MACHINES

### 3.1 Trip Status

```
DRAFT ──────────────► PLANNING ──────────► ACTIVE ──────────► COMPLETED
  │                      │                    │                    │
  │                      │                    └──────────────────► ARCHIVED
  │                      │
  └──────────────────────┴──────────────────────────────────────► CANCELLED
```

| Transition | Điều kiện | Trigger |
|-----------|-----------|---------|
| `DRAFT → PLANNING` | Đã có ít nhất 1 accommodation | User click "Bắt đầu lên kế hoạch" |
| `PLANNING → ACTIVE` | start_date = today | Tự động lúc midnight hoặc user trigger |
| `ACTIVE → COMPLETED` | end_date < today và tất cả stops đã VISITED hoặc SKIPPED | Tự động hoặc user |
| `COMPLETED → ARCHIVED` | User chủ động | Manual action |
| `* → CANCELLED` | Bất kỳ lúc nào | User hủy trip |

---

### 3.2 TripStop Status

```
PLANNED ────────────► VISITING ───────────► VISITED
   │                                            │
   └───────────────────────────────────────► SKIPPED
```

| Transition | Điều kiện | Hệ quả |
|-----------|-----------|--------|
| `PLANNED → VISITING` | User check-in tại location | Ghi visited_at timestamp |
| `VISITING → VISITED` | User confirm hoàn thành | Trigger gợi ý viết review |
| `PLANNED → SKIPPED` | User quyết định bỏ qua | Không ảnh hưởng đến các stop khác |

---

### 3.3 TripMember Status

```
PENDING ─────────────► ACCEPTED
   │
   └────────────────► DECLINED

ACCEPTED ───────────► REMOVED (bởi OWNER)
```

---

### 3.4 TripRecommendation Lifecycle

```
[Generated] ──────► [Shown to User]
                         │
                ┌────────┴────────┐
                ▼                 ▼
           [DISMISSED]         [ADDED]
                              (→ TripStop created)
```

---

## 4. BUSINESS LOGIC & VALIDATION RULES

### 4.1 Trip

```
RULE T-01: start_date <= end_date (DB constraint)
RULE T-02: start_date >= today khi tạo mới (warn, không block)
RULE T-03: Số ngày tối đa = 365 ngày
RULE T-04: Chỉ 1 OWNER / trip
RULE T-05: OWNER không thể rời trip, chỉ xóa hoặc transfer ownership
RULE T-06: Trip COMPLETED hoặc CANCELLED → không thể sửa cấu trúc (chỉ có thể xem)
RULE T-07: Khi is_public = TRUE → Trip hiển thị trên explore feed
```

### 4.2 TripAccommodation

```
RULE A-01: check_in >= trip.start_date
RULE A-02: check_out <= trip.end_date + 1 ngày (có thể check-out ngày cuối)
RULE A-03: Các accommodation không được overlap ngày với nhau trong cùng trip
           (trừ khi check-out ngày này = check-in ngày kia)
RULE A-04: Khi thêm accommodation → tự động trigger generate recommendations
RULE A-05: Khi đổi accommodation (location thay đổi) → regenerate recommendations
           cho ngày trong range check_in - check_out tương ứng
```

### 4.3 TripDay & TripStop

```
RULE D-01: trip_days tự động tạo khi trip được tạo (loop start_date → end_date)
RULE D-02: Khi trip thay đổi start_date / end_date:
           - Nếu thu ngắn: cảnh báo nếu ngày bị cắt đã có stops
           - Nếu kéo dài: tự động tạo thêm trip_days
RULE D-03: order_index sử dụng GAP = 1000 (0, 1000, 2000...) để dễ insert giữa
RULE D-04: Khi reorder stops: dùng fractional indexing hoặc batch update order
RULE D-05: arrival_time của stop[n] phải >= departure_time của stop[n-1] (warn, không block)
RULE D-06: Tổng duration_minutes của stops trong ngày không quá 16 tiếng (960 phút) → warn
RULE D-07: Khi status → VISITED → set visited_at = NOW()
RULE D-08: Khi status → VISITED → check xem user đã có review cho location này chưa
           → Nếu chưa: gửi notification gợi ý viết review (delay 2 giờ)
```

### 4.4 Budget Tracking

```
RULE B-01: actual_budget (trips) = SUM(trip_stops.actual_spent)
                                 + SUM(trip_accommodations.price_per_night * số đêm)
RULE B-02: total_budget (trips) = SUM(trip_stops.budget_estimate)
                                 + SUM(accommodations budget)
RULE B-03: Tự động recalculate khi bất kỳ child record nào thay đổi
RULE B-04: Alert khi actual_budget > total_budget * 1.1 (vượt 10%)
```

### 4.5 Saved Locations

```
RULE S-01: User không thể lưu trùng cùng 1 location (UNIQUE constraint)
RULE S-02: collection_name có thể là bất kỳ string nào, mặc định "Mặc định"
RULE S-03: Khi xóa Location → SavedLocation bị CASCADE DELETE
```

---

## 5. RECOMMENDATION ENGINE

### 5.1 Khi Nào Chạy

| Trigger | Hành động |
|---------|-----------|
| Thêm mới TripAccommodation | Generate full recommendations cho trip |
| Cập nhật TripAccommodation (đổi location) | Regenerate recommendations |
| User dismiss 1 recommendation | Không regenerate, chỉ đánh dấu |
| User thêm manual stop | Không ảnh hưởng đến recommendations |
| User request refresh | Force regenerate |

### 5.2 Thuật Toán Tính Score

```
SCORE = w1 * distance_score
      + w2 * rating_score
      + w3 * popularity_score
      + w4 * category_diversity_score
      + w5 * price_match_score
      + w6 * review_recency_score

Trọng số mặc định:
  w1 = 0.30  (khoảng cách gần = quan trọng nhất)
  w2 = 0.25  (avg_rating của location)
  w3 = 0.20  (popularity_score của location)
  w4 = 0.10  (đa dạng loại địa điểm trong trip)
  w5 = 0.10  (phù hợp mức giá)
  w6 = 0.05  (review gần đây = tin cậy hơn)
```

**Chi tiết từng score:**

```
distance_score:
  - d <= 0.5km  → 1.0
  - d <= 1km    → 0.9
  - d <= 2km    → 0.75
  - d <= 3km    → 0.60
  - d <= 5km    → 0.40
  - d <= 10km   → 0.20
  - d > 10km    → 0.05

rating_score:
  - (avg_rating / 5.0) * min(1.0, total_review / 10)
  -- Penalize locations có ít review

popularity_score:
  - normalized popularity_score của location (đã có sẵn trong DB)

category_diversity_score:
  - Kiểm tra các LocationType đã có trong trip_stops
  - Nếu category này chưa xuất hiện → 1.0 (khuyến khích đa dạng)
  - Nếu đã có 1 → 0.6, đã có 2+ → 0.3

price_match_score:
  - So sánh location.price_level với trip budget tier
  - budget / trip_days * 0.3 → chi tiêu daily budget ước tính cho ăn/vui chơi
  - Map sang price_level phù hợp

review_recency_score:
  - Lấy review gần nhất trong 6 tháng gần đây
  - Có review gần → 1.0, 6-12 tháng → 0.7, > 1 năm → 0.4
```

### 5.3 Bộ Lọc Trước Khi Score

```sql
-- Query cơ bản lấy candidates
SELECT l.*,
  ST_Distance(l.geom, accommodation.geom) / 1000 AS distance_km
FROM locations l
JOIN trip_accommodations ta ON ta.id = :accommodation_id
WHERE
  l.status = 'ACTIVE'
  AND ST_DWithin(l.geom, ta.geom, 10000)  -- trong 10km
  AND l.id NOT IN (
    SELECT location_id FROM trip_stops
    JOIN trip_days ON trip_stops.trip_day_id = trip_days.id
    WHERE trip_days.trip_id = :trip_id
  )
  AND l.id NOT IN (
    SELECT location_id FROM trip_accommodations
    WHERE trip_id = :trip_id
  )
  AND l.id NOT IN (
    SELECT location_id FROM trip_recommendations
    WHERE trip_id = :trip_id AND is_dismissed = TRUE
  )
ORDER BY distance_km
LIMIT 200  -- Chỉ score top 200 candidates gần nhất
```

### 5.4 Phân Loại Gợi Ý

Engine phân nhóm kết quả theo category để UI hiển thị đẹp hơn:

```
"Ăn sáng gần chỗ ở" → LocationType: food, price_level: 1-2, open_hour < 10:00
"Quán cà phê" → LocationType: cafe
"Điểm tham quan nổi bật" → LocationType: attraction, rating >= 4.0
"Ăn tối đặc sắc" → LocationType: restaurant, price_level: 2-3
"Mua sắm" → LocationType: shopping
"Giải trí / Vui chơi" → LocationType: entertainment
"Thiên nhiên / Ngoài trời" → LocationType: nature, outdoor
```

### 5.5 Personalization (V2 — sau MVP)

```
- Dựa trên LocationReview của user trong quá khứ:
  → User hay rate cao loại nào → boost category đó
- Dựa trên saved_locations của user:
  → Nếu user đã save 1 location nhưng chưa visit → ưu tiên gợi ý trong trip
- Dựa trên trip trước đó của user:
  → Không gợi ý lại chỗ họ đã đến (có LocationReview)
```

---

## 6. USER FLOWS

### 6.1 Flow A — Tạo Trip Mới

```
1. User tap "Tạo chuyến đi mới"
2. Nhập: Tiêu đề, Điểm đến, Ngày đi – Ngày về, Ngân sách (optional)
3. VALIDATE:
   - title: không rỗng, max 255 ký tự
   - start_date <= end_date
   - Warn nếu start_date < today
4. POST /api/trips
5. Backend:
   a. INSERT into trips (status = DRAFT)
   b. INSERT into trip_members (role = OWNER, status = ACCEPTED)
   c. Loop từ start_date đến end_date → INSERT trip_days (day_number = 1,2,3...)
   d. Return trip với trip_days
6. Frontend: Redirect đến Trip Detail Screen
7. Screen hiển thị:
   - Banner gợi ý "Thêm chỗ ở để nhận gợi ý địa điểm"
   - Timeline các ngày (empty)
```

---

### 6.2 Flow B — Thêm Chỗ Ở (Accommodation)

```
1. User tap "Thêm chỗ ở"
2. Hiển thị map + search input
3. User tìm kiếm: "Khách sạn Mường Thanh Đà Lạt"
4. Search flow:
   a. Tìm trong DB locations trước (full-text search + location type = accommodation)
   b. Nếu không tìm thấy → Call Google Places Autocomplete API
   c. User chọn kết quả
5. Nếu chọn từ Google Places (chưa có trong DB):
   a. Gọi Google Places Details API lấy thông tin đầy đủ
   b. INSERT vào locations (source_type = 'GOOGLE')
   c. Dùng location_id vừa tạo
6. Nhập: Check-in date, Check-out date, Loại phòng (optional), Giá/đêm (optional)
7. POST /api/trips/:tripId/accommodations
8. Backend:
   a. INSERT into trip_accommodations
   b. Update trip.status = 'PLANNING' nếu đang là DRAFT
   c. Trigger job: GenerateTripRecommendations(tripId, accommodationId)
9. Frontend:
   - Toast "Đã thêm chỗ ở. Đang tải gợi ý địa điểm..."
   - Sau 2-3s: Hiển thị panel recommendations
```

---

### 6.3 Flow C — Xem & Thêm Gợi Ý Địa Điểm

```
1. Từ Trip Detail, user xem tab "Gợi ý"
2. GET /api/trips/:tripId/recommendations
3. UI hiển thị cards theo nhóm:
   - "Gần chỗ ở của bạn" (distance <= 1km)
   - "Ăn uống được đánh giá cao"
   - "Điểm tham quan nổi bật"
4. Mỗi card hiển thị:
   - Ảnh đẹp nhất (LocationMedia.AestheticScore cao nhất)
   - Tên, Rating, Khoảng cách
   - Tags nổi bật từ reviews gần đây
   - Nút: [+ Thêm vào lịch] | [Bỏ qua]
5. User tap "Thêm vào lịch":
   a. Hiện bottom sheet chọn: ngày nào? (Ngày 1 / Ngày 2 / ...)
   b. POST /api/trips/:tripId/stops { location_id, trip_day_id }
   c. Backend:
      - INSERT into trip_stops (order_index = max_current + 1000)
      - UPDATE trip_recommendations SET is_added = TRUE WHERE id = :recId
      - Tính distance_from_prev_km và estimated_travel_min qua Directions API (async job)
   d. Frontend: Real-time update timeline (WebSocket hoặc refetch)
6. User tap "Bỏ qua":
   a. PATCH /api/trips/:tripId/recommendations/:recId { is_dismissed: true }
   b. Ẩn card khỏi danh sách
```

---

### 6.4 Flow D — Lên Lịch Thủ Công

```
1. User vào một ngày cụ thể trong trip (Ngày 1, Ngày 2...)
2. Tap "Thêm địa điểm"
3. Search location (tương tự Flow B nhưng không phải accommodation)
4. Hoặc chọn từ "Đã lưu" (saved_locations của user)
5. POST /api/trips/:tripId/days/:dayId/stops { location_id, order_index, arrival_time, duration_minutes, ... }
6. Drag & drop reorder:
   a. PATCH /api/trips/:tripId/stops/reorder { stops: [{id, order_index}, ...] }
   b. Backend: Batch update order_index, recalculate distances (async)
7. Thêm ghi chú cho stop: PATCH /api/trips/:tripId/stops/:stopId { notes, budget_estimate }
```

---

### 6.5 Flow E — Trong Chuyến Đi (Active Trip)

```
1. Trip.status = ACTIVE (đang trong ngày đi)
2. Screen hiển thị: TripDay của hôm nay với timeline
3. User đến 1 địa điểm → Tap "Check-in"
   a. PATCH /api/trips/:tripId/stops/:stopId { status: 'VISITING' }
   b. Optional: UserCheckin tự động tạo nếu user cho phép location
4. Rời địa điểm → Tap "Hoàn thành"
   a. PATCH /api/trips/:tripId/stops/:stopId {
        status: 'VISITED',
        actual_spent: <amount>,
        visited_at: NOW()
      }
   b. Backend: trigger notification sau 2h → "Viết review cho [Tên địa điểm]?"
5. Sau khi hết ngày cuối:
   a. Scheduler job (midnight): Kiểm tra end_date < today
   b. Nếu tất cả stops đã VISITED/SKIPPED → AUTO transition ACTIVE → COMPLETED
   c. Nếu còn PLANNED stops → status = COMPLETED nhưng có warning
```

---

### 6.6 Flow F — Sau Chuyến Đi (Share & Review)

```
1. Trip.status = COMPLETED
2. Notification: "Chuyến đi kết thúc! Chia sẻ trải nghiệm của bạn"
3. Giao diện hiển thị:
   - Thống kê: X ngày, Y địa điểm, Z km, W đ chi tiêu
   - Danh sách locations chưa có review → gợi ý viết
   - Nút "Tạo bài viết về chuyến này"
4. Viết Review:
   a. User tap vào location trong trip
   b. Pre-filled: LocationID, VisitDate, TripID
   c. POST /api/location-reviews { ..., trip_id, trip_stop_id }
5. Đăng bài Post:
   a. Khi tạo Post, user có thể chọn "Thuộc chuyến đi nào"
   b. POST /api/posts → backend INSERT trip_posts (trip_id, post_id)
   c. Post được hiển thị trên trip timeline
6. Chia sẻ Trip:
   - Toggle is_public → Trip hiển thị trên explore feed
   - Share link: tripblogger.com/trips/:tripId (public URL)
```

---

### 6.7 Flow G — Mời Thành Viên

```
1. User (OWNER/EDITOR) tap "Mời bạn đồng hành"
2. Tìm kiếm user theo username/email
3. Chọn role: EDITOR (có thể chỉnh sửa) | VIEWER (chỉ xem)
4. POST /api/trips/:tripId/members { user_id, role, note }
5. Backend:
   a. INSERT trip_members (status = PENDING)
   b. Gửi notification cho user được mời
6. User nhận notification → Accept/Decline
7. PATCH /api/trips/:tripId/members/:memberId { status: 'ACCEPTED'/'DECLINED' }
8. Nếu ACCEPTED → User có quyền xem/edit trip theo role
```

---

## 7. API ENDPOINTS

### 7.1 Trip CRUD

```
POST    /api/trips                          — Tạo trip mới
GET     /api/trips                          — Danh sách trips của user (mine)
GET     /api/trips/explore                  — Trips public (feed khám phá)
GET     /api/trips/:tripId                  — Chi tiết trip
PATCH   /api/trips/:tripId                  — Cập nhật trip (title, dates, budget...)
DELETE  /api/trips/:tripId                  — Xóa trip (chỉ OWNER)
PATCH   /api/trips/:tripId/status           — Đổi status {status: 'COMPLETED'...}
POST    /api/trips/:tripId/duplicate        — Clone trip thành draft mới
```

### 7.2 Trip Members

```
GET     /api/trips/:tripId/members          — Danh sách thành viên
POST    /api/trips/:tripId/members          — Mời thành viên {user_id, role}
PATCH   /api/trips/:tripId/members/:id      — Đổi role hoặc status (accept/decline)
DELETE  /api/trips/:tripId/members/:id      — Remove thành viên (OWNER only)
POST    /api/trips/:tripId/members/transfer — Chuyển quyền OWNER
```

### 7.3 Accommodations

```
GET     /api/trips/:tripId/accommodations       — Danh sách chỗ ở
POST    /api/trips/:tripId/accommodations       — Thêm chỗ ở
PATCH   /api/trips/:tripId/accommodations/:id   — Cập nhật
DELETE  /api/trips/:tripId/accommodations/:id   — Xóa
```

### 7.4 Trip Days

```
GET     /api/trips/:tripId/days             — Tất cả ngày + stops (eager load)
GET     /api/trips/:tripId/days/:dayId      — Chi tiết 1 ngày
PATCH   /api/trips/:tripId/days/:dayId      — Cập nhật (title, theme, notes)
```

### 7.5 Trip Stops

```
GET     /api/trips/:tripId/days/:dayId/stops        — Danh sách stops của ngày
POST    /api/trips/:tripId/days/:dayId/stops        — Thêm stop thủ công
PATCH   /api/trips/:tripId/stops/:stopId            — Cập nhật stop (status, notes, spent...)
DELETE  /api/trips/:tripId/stops/:stopId            — Xóa stop
PATCH   /api/trips/:tripId/stops/reorder            — Sắp xếp lại {stops: [{id, order_index}]}
POST    /api/trips/:tripId/stops/:stopId/checkin    — Check-in (status → VISITING)
POST    /api/trips/:tripId/stops/:stopId/complete   — Complete (status → VISITED)
POST    /api/trips/:tripId/stops/:stopId/skip       — Skip (status → SKIPPED)
```

### 7.6 Recommendations

```
GET     /api/trips/:tripId/recommendations          — Lấy gợi ý (với filter, pagination)
  Query params:
    - category: string (food|attraction|cafe...)
    - sort: score|distance|rating
    - limit: int (default 20)
    - page: int

POST    /api/trips/:tripId/recommendations/refresh  — Force regenerate
PATCH   /api/trips/:tripId/recommendations/:id      — { is_dismissed: true } hoặc { is_added: true, trip_day_id }
```

### 7.7 Saved Locations

```
GET     /api/saved-locations                        — Tất cả saved (grouped by collection)
POST    /api/saved-locations                        — Lưu { location_id, collection_name }
PATCH   /api/saved-locations/:id                    — Đổi collection hoặc note
DELETE  /api/saved-locations/:id                    — Bỏ lưu
GET     /api/saved-locations/collections            — Danh sách tên collections
```

### 7.8 Trip Posts

```
GET     /api/trips/:tripId/posts            — Bài viết liên quan đến trip
POST    /api/trips/:tripId/posts            — Gắn post vào trip { post_id }
DELETE  /api/trips/:tripId/posts/:postId    — Tháo gắn kết
```

### 7.9 Request / Response Format

**Tạo trip — POST /api/trips:**
```json
Request:
{
  "title": "Đà Lạt Weekend Trip",
  "description": "Chuyến đi cuối tuần chill",
  "destination_name": "Đà Lạt, Lâm Đồng",
  "start_date": "2025-07-15",
  "end_date": "2025-07-17",
  "total_budget": 3000000,
  "is_public": false
}

Response 201:
{
  "id": "uuid",
  "title": "Đà Lạt Weekend Trip",
  "status": "DRAFT",
  "days": [
    { "id": "uuid", "date": "2025-07-15", "day_number": 1, "title": "Ngày 1", "stops": [] },
    { "id": "uuid", "date": "2025-07-16", "day_number": 2, "title": "Ngày 2", "stops": [] },
    { "id": "uuid", "date": "2025-07-17", "day_number": 3, "title": "Ngày 3", "stops": [] }
  ],
  "members": [{ "user_id": "uuid", "role": "OWNER", "status": "ACCEPTED" }],
  "accommodations": [],
  "created_at": "...",
  "updated_at": "..."
}
```

**Thêm stop — POST /api/trips/:id/days/:dayId/stops:**
```json
Request:
{
  "location_id": "uuid",              // hoặc custom fields
  "order_index": 1000,
  "arrival_time": "09:00",
  "duration_minutes": 90,
  "transport_mode": "MOTORBIKE",
  "budget_estimate": 150000,
  "notes": "Nhớ đặt chỗ trước"
}

Response 201:
{
  "id": "uuid",
  "trip_day_id": "uuid",
  "location": {
    "id": "uuid",
    "name": "Hồ Xuân Hương",
    "latitude": 11.9404,
    "longitude": 108.4383,
    "avg_rating": 4.6,
    "location_type": { "name": "Điểm tham quan", "icon": "🏔" },
    "thumbnail_url": "..."
  },
  "order_index": 1000,
  "arrival_time": "09:00",
  "duration_minutes": 90,
  "status": "PLANNED",
  "transport_mode": "MOTORBIKE",
  "distance_from_prev_km": null,      // sẽ có sau async job
  "estimated_travel_min": null,
  "budget_estimate": 150000,
  "actual_spent": null
}
```

---

## 8. REAL-TIME & WEBSOCKET

### 8.1 Collaborative Editing Events

Khi trip có nhiều EDITOR cùng online → cần real-time sync qua WebSocket hoặc SSE.

**Channel naming:** `trip:{tripId}`

**Events phát ra:**

```javascript
// Khi 1 member thêm stop
{ event: "STOP_ADDED", data: { stop: TripStop, day_id: string } }

// Khi 1 member xóa stop
{ event: "STOP_DELETED", data: { stop_id: string, day_id: string } }

// Khi reorder
{ event: "STOPS_REORDERED", data: { day_id: string, order: [{id, order_index}] } }

// Khi member thay đổi status stop (đang đi)
{ event: "STOP_STATUS_CHANGED", data: { stop_id: string, status: string, visited_at?: string } }

// Khi recommendations mới được generate
{ event: "RECOMMENDATIONS_READY", data: { trip_id: string, count: number } }

// Khi thành viên mới accept lời mời
{ event: "MEMBER_JOINED", data: { user: User, role: string } }
```

### 8.2 Push Notification Events

| Sự kiện | Nội dung notification |
|---------|----------------------|
| Được mời vào trip | "[Username] mời bạn cùng lên kế hoạch [Trip Title]" |
| Trip sắp đến | "Chuyến đi [Title] còn X ngày nữa! Lịch trình đã sẵn sàng?" |
| Gợi ý địa điểm sẵn sàng | "Chúng tôi có [N] gợi ý cho chuyến đi [Title]" |
| Sau khi visit stop | "Bạn vừa ghé [Tên địa điểm] — Chia sẻ cảm nhận?" |
| Trip hoàn thành | "Chuyến đi [Title] kết thúc! Đừng quên chia sẻ ảnh và review" |

---

## 9. TÍCH HỢP VỚI CÁC MODULE HIỆN TẠI

### 9.1 Module Location

```
- locations table: Trip dùng trực tiếp qua location_id trong TripAccommodation, TripStop
- LocationType: Filter recommendations theo loại (ăn uống, tham quan, mua sắm...)
- LocationMedia: Lấy ảnh đẹp nhất (AestheticScore) để hiển thị trong recommendation cards
- LocationReview: Source data cho recommendation score; sau visit → tạo review mới
- UserCheckin: Khi TripStop → VISITING → tạo UserCheckin tự động (nếu user cho phép)
```

### 9.2 Module Post

```
- POST table: Có field LocationID → khi đăng bài từ trip → auto-link location
- TripPost: Junction table để 1 post có thể thuộc 1 trip
- Khi trip.is_public = TRUE và có TripPosts → hiển thị posts trong trip page
- Trip page hoạt động như "album" của chuyến đi: posts + reviews + photos
```

### 9.3 Module User

```
- User → Trip (1 user có nhiều trips)
- TripMember → User (nhiều user trong 1 trip)
- SavedLocation → User (wishlist cá nhân)
- MEMBER role cho phép tạo trip (tất cả member đều có thể)
- PREMIUM member: unlimited trips, số thành viên không giới hạn
- FREE member: tối đa 5 active trips, tối đa 3 members/trip (enforce ở service layer)
```

### 9.4 Module Ecommerce (Product)

```
- Tích hợp V2: Khi user lên lịch đến 1 địa điểm mua sắm 
  → Gợi ý các sản phẩm secondhand tại vùng đó đang được bán
- Product.Tags có thể bao gồm tags địa danh để match với trip destination
```

### 9.5 Module Compositions/AI (Ảnh Đẹp)

```
- Khi TripStop → VISITED → gợi ý mở AI Camera tại địa điểm đó
- LocationMedia.AISceneType → gợi ý composition phù hợp với loại địa điểm
  (vd: "núi" → suggest landscape composition, "ẩm thực" → suggest flat-lay)
```

---

## 10. DATABASE — INDEX & PERFORMANCE

### 10.1 Indexes Cần Tạo

```sql
-- trips
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_is_public_created ON trips(is_public, created_at DESC) WHERE is_public = TRUE;
CREATE INDEX idx_trips_dates ON trips(start_date, end_date);

-- trip_members
CREATE INDEX idx_trip_members_trip_id ON trip_members(trip_id);
CREATE INDEX idx_trip_members_user_id ON trip_members(user_id);
CREATE INDEX idx_trip_members_user_status ON trip_members(user_id, status);

-- trip_days
CREATE INDEX idx_trip_days_trip_id ON trip_days(trip_id);
CREATE INDEX idx_trip_days_date ON trip_days(trip_id, date);

-- trip_stops
CREATE INDEX idx_trip_stops_day_id ON trip_stops(trip_day_id);
CREATE INDEX idx_trip_stops_location_id ON trip_stops(location_id);
CREATE INDEX idx_trip_stops_status ON trip_stops(status);
CREATE INDEX idx_trip_stops_order ON trip_stops(trip_day_id, order_index);

-- trip_accommodations
CREATE INDEX idx_trip_accom_trip_id ON trip_accommodations(trip_id);
CREATE INDEX idx_trip_accom_location_id ON trip_accommodations(location_id);

-- trip_recommendations
CREATE INDEX idx_trip_rec_trip_id ON trip_recommendations(trip_id);
CREATE INDEX idx_trip_rec_score ON trip_recommendations(trip_id, score DESC) WHERE is_dismissed = FALSE;
CREATE INDEX idx_trip_rec_location ON trip_recommendations(location_id);

-- saved_locations
CREATE INDEX idx_saved_loc_user_id ON saved_locations(user_id);
CREATE INDEX idx_saved_loc_location_id ON saved_locations(location_id);
CREATE INDEX idx_saved_loc_collection ON saved_locations(user_id, collection_name);

-- locations (geospatial — đã đề cập ở phần 2.9)
CREATE INDEX idx_locations_geom ON locations USING GIST(geom);
CREATE INDEX idx_locations_type_status ON locations(location_type_id, status);
CREATE INDEX idx_locations_rating ON locations(avg_rating DESC) WHERE status = 'ACTIVE';
```

### 10.2 Caching Strategy

```
Cache layer: Redis

KEY PATTERNS:
  trip:{tripId}:detail               TTL: 5 phút
  trip:{tripId}:recommendations      TTL: 30 phút
  trip:{tripId}:members              TTL: 10 phút
  user:{userId}:trips                TTL: 5 phút
  user:{userId}:saved_locations      TTL: 15 phút
  locations:nearby:{lat}:{lng}:{r}   TTL: 1 giờ (geo query kết quả)

INVALIDATION:
  - Bất kỳ WRITE nào vào trip → invalidate trip:{tripId}:*
  - Thêm/xóa TripRecommendation → invalidate trip:{tripId}:recommendations
  - Thêm SavedLocation → invalidate user:{userId}:saved_locations
```

### 10.3 Async Jobs (Background Workers)

```
JOB: CalculateTripDistances(tripId, dayId)
  - Trigger: Sau khi thêm/reorder TripStop
  - Gọi Google Directions Matrix API
  - Batch: tối đa 10 stops/trip/day → 1 API call
  - Update: distance_from_prev_km, estimated_travel_min cho từng stop
  - Update: trip_days.total_distance_km
  - Delay: 3 giây (debounce nếu user đang drag nhiều stops liên tục)

JOB: GenerateTripRecommendations(tripId, accommodationId)
  - Trigger: Sau khi thêm/sửa accommodation
  - Chạy scoring algorithm
  - Upsert top 50 results vào trip_recommendations
  - Emit WebSocket event RECOMMENDATIONS_READY
  - Thời gian chạy: < 2 giây (sync) hoặc queue nếu DB lớn

JOB: AutoCompleteTrip()
  - Chạy: Hàng ngày lúc 00:05
  - Query: trips WHERE status = 'ACTIVE' AND end_date < CURRENT_DATE
  - Transition → COMPLETED
  - Gửi notification "Chuyến đi đã kết thúc"

JOB: TripStartingReminder()
  - Chạy: Hàng ngày lúc 08:00
  - Query: trips WHERE status IN ('DRAFT','PLANNING') AND start_date = CURRENT_DATE + 1
  - Gửi notification "Chuyến đi bắt đầu ngày mai!"

JOB: ReviewPrompt(userId, locationId, tripStopId)
  - Trigger: Sau khi TripStop → VISITED
  - Delay: 2 giờ
  - Check: user chưa có review cho location này
  - Gửi notification gợi ý viết review
```

---

## 11. EDGE CASES & ERROR HANDLING

### 11.1 Race Conditions (Collaborative)

```
Tình huống: 2 EDITOR cùng thêm stop vào cùng 1 ngày cùng lúc
Xử lý:
  - order_index được assign server-side: max(current_order_index) + 1000
  - Optimistic locking: dùng updated_at check
  - WebSocket broadcast ngay sau INSERT → client nhận và re-render

Tình huống: EDITOR A đang edit stop, EDITOR B xóa stop đó
Xử lý:
  - Soft delete với deleted_at timestamp
  - WebSocket STOP_DELETED event → Client A nhận → dismiss form
```

### 11.2 Location Không Tồn Tại Trong DB

```
Tình huống: User tìm khách sạn ABC nhưng không có trong locations table
Xử lý:
  1. Call Google Places API → lấy thông tin
  2. INSERT locations với source_type = 'GOOGLE', status = 'PENDING_VERIFICATION'
  3. Dùng location_id mới tạo
  4. Background: Enrich data thêm (ảnh, giờ mở cửa, phone...)
  5. Admin review → ACTIVE (hoặc auto-active nếu verified từ Google)

Fallback: Nếu cả Google Places fail → dùng custom_* fields trong trip_accommodations/stops
```

### 11.3 Ngày Đi Thay Đổi Sau Khi Đã Có Stops

```
Tình huống: Trip 3 ngày đã có đầy đủ stops, user đổi thành 2 ngày
Xử lý:
  - Nếu thu ngắn (end_date nhỏ lại):
    → Kiểm tra trip_days bị mất có stops không
    → Hiển thị warning: "Ngày 3 có X địa điểm. Bạn muốn xóa hay chuyển sang Ngày 2?"
    → 3 options: Xóa hết / Chuyển stops sang ngày trước / Hủy thay đổi
  - Nếu kéo dài (end_date lớn hơn):
    → Auto tạo thêm trip_days trống
    → Không ảnh hưởng gì đến dữ liệu hiện có
```

### 11.4 Budget Currency

```
Tình huống: Trip đi nhiều nước, mỗi stop khác tiền tệ
Hiện tại: Mặc định VND, conversion rate không track
V2 Solution:
  - Thêm currency field vào trip_stops.actual_spent
  - Dùng exchange rate API để convert về VND khi tổng hợp
  - Lưu snapshot tỷ giá tại thời điểm transaction
```

### 11.5 Khi User Xóa Location Đang Được Dùng Trong Trip

```
Xử lý (DB constraint ON DELETE SET NULL):
  - trip_stops.location_id → NULL
  - Hiển thị "Địa điểm này đã bị gỡ" trong UI
  - custom_name = location.name (snapshot trước khi xóa) — cần trigger lưu lại
  - Không xóa TripStop — user vẫn có record đã đến nơi đó
```

### 11.6 Phân Quyền (Authorization Matrix)

```
Action                          | OWNER | EDITOR | VIEWER | Guest(public)
--------------------------------|-------|--------|--------|---------------
Xem trip                        |  ✅   |  ✅    |  ✅    |  ✅ (if public)
Sửa trip info (title, dates...) |  ✅   |  ✅    |  ❌    |  ❌
Thêm/xóa accommodation          |  ✅   |  ✅    |  ❌    |  ❌
Thêm/xóa/reorder stops          |  ✅   |  ✅    |  ❌    |  ❌
Đổi stop status (check-in...)   |  ✅   |  ✅    |  ❌    |  ❌
Mời thành viên                  |  ✅   |  ✅    |  ❌    |  ❌
Xóa thành viên                  |  ✅   |  ❌    |  ❌    |  ❌
Xóa trip                        |  ✅   |  ❌    |  ❌    |  ❌
Đổi trip là_public              |  ✅   |  ❌    |  ❌    |  ❌
Transfer ownership               |  ✅   |  ❌    |  ❌    |  ❌
```

---

## 12. IMPLEMENTATION CHECKLIST

### Phase 1 — MVP (Core Trip Planning)
```
[ ] DB Migration:
    [ ] CREATE TABLE trips
    [ ] CREATE TABLE trip_members
    [ ] CREATE TABLE trip_days
    [ ] CREATE TABLE trip_stops
    [ ] CREATE TABLE trip_accommodations
    [ ] CREATE TABLE saved_locations
    [ ] CREATE TABLE trip_posts
    [ ] ALTER TABLE locations ADD geom, google_place_id
    [ ] ALTER TABLE location_reviews ADD trip_id, trip_stop_id, tags
    [ ] CREATE all indexes

[ ] Backend Services:
    [ ] TripService (CRUD + state machine)
    [ ] TripMemberService (invite, accept, roles)
    [ ] TripDayService (auto-generate, CRUD)
    [ ] TripStopService (CRUD, reorder, status transitions)
    [ ] TripAccommodationService (CRUD + geocoding)
    [ ] SavedLocationService

[ ] Background Jobs:
    [ ] CalculateTripDistances job (Google Directions)
    [ ] AutoCompleteTrip scheduler
    [ ] TripStartingReminder scheduler
    [ ] ReviewPrompt delayed job

[ ] API Endpoints:
    [ ] Tất cả endpoints trong Section 7

[ ] Authorization:
    [ ] Middleware check trip membership
    [ ] Permission matrix enforcement

[ ] Frontend:
    [ ] Trip List Screen
    [ ] Trip Create Screen
    [ ] Trip Detail Screen (days timeline)
    [ ] TripDay Screen (stops list)
    [ ] Accommodation Search & Add Screen
    [ ] Stop Search & Add Screen
    [ ] Map View Screen
    [ ] Drag & Drop reorder
    [ ] Active Trip tracking UI
    [ ] Trip Complete summary screen
```

### Phase 2 — Recommendations
```
[ ] DB: CREATE TABLE trip_recommendations
[ ] RecommendationService (scoring algorithm)
[ ] GenerateTripRecommendations job
[ ] GET /recommendations endpoint
[ ] Recommendation UI cards (by category)
[ ] Dismiss / Add to trip flow
[ ] WebSocket: RECOMMENDATIONS_READY event
```

### Phase 3 — Collaboration & Social
```
[ ] WebSocket server setup
[ ] Real-time sync events (Section 8.1)
[ ] TripMember invite/accept flow (UI)
[ ] Trip public / explore feed integration
[ ] Trip ↔ Post linking UI
[ ] Trip statistics screen (distance, budget, places count)
[ ] Share trip link (public URL)
```

### Phase 4 — Advanced (V2)
```
[ ] Personalized recommendations (user history)
[ ] Budget currency multi-currency
[ ] AI Camera suggestion at stop
[ ] Product recommendations from ecommerce
[ ] Trip templates (clone popular public trips)
[ ] Offline mode (cache trip data locally)
[ ] Export trip to PDF
```

---

## PHỤ LỤC A — SQL Migration Script Đầy Đủ

```sql
-- ================================================================
-- TRIPBLOGGER: TRIP PLANNING FEATURE MIGRATION
-- Version: 1.0
-- Run in transaction
-- ================================================================

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ----------------------------------------------------------------
-- BƯỚC 1: Alter bảng locations hiện có
-- ----------------------------------------------------------------
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS website VARCHAR(500),
  ADD COLUMN IF NOT EXISTS geom GEOMETRY(POINT, 4326);

UPDATE locations
  SET geom = ST_SetSRID(ST_MakePoint(longitude::float, latitude::float), 4326)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    AND geom IS NULL;

CREATE INDEX IF NOT EXISTS locations_geom_idx ON locations USING GIST(geom);
CREATE UNIQUE INDEX IF NOT EXISTS locations_google_place_id_idx
  ON locations(google_place_id) WHERE google_place_id IS NOT NULL;

-- ----------------------------------------------------------------
-- BƯỚC 2: Alter bảng location_reviews hiện có
-- ----------------------------------------------------------------
ALTER TABLE location_reviews
  ADD COLUMN IF NOT EXISTS trip_id UUID,
  ADD COLUMN IF NOT EXISTS trip_stop_id UUID,
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- ----------------------------------------------------------------
-- BƯỚC 3: Tạo bảng trips
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trips (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  destination_name VARCHAR(255),
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  status           VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  is_public        BOOLEAN NOT NULL DEFAULT FALSE,
  cover_media_id   UUID REFERENCES media(id) ON DELETE SET NULL,
  total_budget     DECIMAL(15,2),
  actual_budget    DECIMAL(15,2),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT trips_date_check CHECK (end_date >= start_date),
  CONSTRAINT trips_status_check CHECK (
    status IN ('DRAFT','PLANNING','ACTIVE','COMPLETED','ARCHIVED','CANCELLED')
  )
);

-- ----------------------------------------------------------------
-- BƯỚC 4: Tạo bảng trip_members
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trip_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL DEFAULT 'VIEWER',
  status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  note        TEXT,
  joined_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, user_id),
  CONSTRAINT trip_members_role_check CHECK (role IN ('OWNER','EDITOR','VIEWER')),
  CONSTRAINT trip_members_status_check CHECK (status IN ('PENDING','ACCEPTED','DECLINED','REMOVED'))
);

-- ----------------------------------------------------------------
-- BƯỚC 5: Tạo bảng trip_accommodations
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trip_accommodations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id             UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  location_id         UUID REFERENCES locations(id) ON DELETE SET NULL,
  custom_name         VARCHAR(255),
  custom_address      TEXT,
  custom_latitude     DECIMAL(10,8),
  custom_longitude    DECIMAL(11,8),
  check_in            DATE NOT NULL,
  check_out           DATE NOT NULL,
  room_type           VARCHAR(100),
  confirmation_code   VARCHAR(100),
  price_per_night     DECIMAL(10,2),
  price_currency      VARCHAR(3) DEFAULT 'VND',
  is_primary          BOOLEAN NOT NULL DEFAULT TRUE,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT accom_date_check CHECK (check_out > check_in),
  CONSTRAINT accom_location_check CHECK (
    location_id IS NOT NULL
    OR (custom_name IS NOT NULL AND custom_address IS NOT NULL)
  )
);

-- ----------------------------------------------------------------
-- BƯỚC 6: Tạo bảng trip_days
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trip_days (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id            UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  date               DATE NOT NULL,
  day_number         INT NOT NULL,
  title              VARCHAR(255),
  theme              VARCHAR(100),
  notes              TEXT,
  total_distance_km  DECIMAL(6,2),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, day_number),
  UNIQUE(trip_id, date),
  CONSTRAINT trip_days_positive CHECK (day_number > 0)
);

-- ----------------------------------------------------------------
-- BƯỚC 7: Tạo bảng trip_stops
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trip_stops (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_day_id           UUID NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
  location_id           UUID REFERENCES locations(id) ON DELETE SET NULL,
  custom_name           VARCHAR(255),
  custom_address        TEXT,
  custom_latitude       DECIMAL(10,8),
  custom_longitude      DECIMAL(11,8),
  order_index           INT NOT NULL DEFAULT 0,
  arrival_time          TIME,
  departure_time        TIME,
  duration_minutes      INT,
  status                VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
  transport_mode        VARCHAR(20) DEFAULT 'WALK',
  distance_from_prev_km DECIMAL(6,2),
  estimated_travel_min  INT,
  budget_estimate       DECIMAL(10,2),
  actual_spent          DECIMAL(10,2),
  notes                 TEXT,
  visited_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT trip_stops_status_check CHECK (
    status IN ('PLANNED','VISITING','VISITED','SKIPPED')
  ),
  CONSTRAINT trip_stops_transport_check CHECK (
    transport_mode IN ('WALK','MOTORBIKE','CAR','TAXI','BUS','BOAT','TRAIN','PLANE')
  ),
  CONSTRAINT trip_stops_order_check CHECK (order_index >= 0),
  CONSTRAINT trip_stops_location_check CHECK (
    location_id IS NOT NULL OR custom_name IS NOT NULL
  )
);

-- ----------------------------------------------------------------
-- BƯỚC 8: Tạo bảng trip_recommendations
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trip_recommendations (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id                   UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  location_id               UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  based_on_accommodation_id UUID REFERENCES trip_accommodations(id) ON DELETE SET NULL,
  score                     DECIMAL(5,4) NOT NULL DEFAULT 0,
  recommendation_basis      JSONB,
  distance_km               DECIMAL(6,2),
  estimated_duration_min    INT,
  is_dismissed              BOOLEAN NOT NULL DEFAULT FALSE,
  is_added                  BOOLEAN NOT NULL DEFAULT FALSE,
  generated_at              TIMESTAMPTZ DEFAULT NOW(),
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, location_id)
);

-- ----------------------------------------------------------------
-- BƯỚC 9: Tạo bảng saved_locations
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_locations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id     UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  collection_name VARCHAR(100) DEFAULT 'Mặc định',
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, location_id)
);

-- ----------------------------------------------------------------
-- BƯỚC 10: Tạo bảng trip_posts
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trip_posts (
  trip_id   UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  post_id   UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (trip_id, post_id)
);

-- ----------------------------------------------------------------
-- BƯỚC 11: FK constraints bị defer
-- ----------------------------------------------------------------
ALTER TABLE location_reviews
  ADD CONSTRAINT IF NOT EXISTS fk_review_trip
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------
-- BƯỚC 12: Tất cả indexes
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_public ON trips(is_public, created_at DESC) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_trip_members_trip ON trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user ON trip_members(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user_status ON trip_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trip_days_trip ON trip_days(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_stops_day ON trip_stops(trip_day_id);
CREATE INDEX IF NOT EXISTS idx_trip_stops_location ON trip_stops(location_id);
CREATE INDEX IF NOT EXISTS idx_trip_stops_order ON trip_stops(trip_day_id, order_index);
CREATE INDEX IF NOT EXISTS idx_trip_stops_status ON trip_stops(status);
CREATE INDEX IF NOT EXISTS idx_trip_accom_trip ON trip_accommodations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_accom_location ON trip_accommodations(location_id);
CREATE INDEX IF NOT EXISTS idx_trip_rec_trip ON trip_recommendations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_rec_score ON trip_recommendations(trip_id, score DESC) WHERE is_dismissed = FALSE;
CREATE INDEX IF NOT EXISTS idx_saved_loc_user ON saved_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_loc_collection ON saved_locations(user_id, collection_name);
CREATE INDEX IF NOT EXISTS idx_trip_posts_trip ON trip_posts(trip_id);

-- ----------------------------------------------------------------
-- BƯỚC 13: updated_at auto-update trigger
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_trips_updated_at') THEN
    CREATE TRIGGER trg_trips_updated_at BEFORE UPDATE ON trips
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_trip_days_updated_at') THEN
    CREATE TRIGGER trg_trip_days_updated_at BEFORE UPDATE ON trip_days
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_trip_stops_updated_at') THEN
    CREATE TRIGGER trg_trip_stops_updated_at BEFORE UPDATE ON trip_stops
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMIT;
-- ================================================================
-- MIGRATION HOÀN THÀNH
-- ================================================================
```

---

## PHỤ LỤC B — PROMPT TEMPLATES CHO TRIỂN KHAI

### Prompt 1: Backend Service Layer
```
Tôi đang xây dựng TripService cho ứng dụng TripBlogger (NestJS + PostgreSQL + TypeORM).

Context:
- Tech stack: NestJS, TypeORM, PostgreSQL, Redis (Bull queue), Socket.io
- Đã có sẵn: User module, Location module, Post module, Media module
- Bảng trips có structure: [paste SQL từ migration]
- Bảng trip_members có structure: [paste SQL]
- Bảng trip_days có structure: [paste SQL]

Yêu cầu viết TripService với các method:
1. createTrip(userId, dto): Tạo trip + auto-insert trip_member OWNER + auto-generate trip_days
2. getUserTrips(userId, query): Phân trang, filter theo status
3. getTripDetail(tripId, userId): Trả về trip + days + stops + members + accommodations
4. updateTrip(tripId, userId, dto): Validate permissions (OWNER/EDITOR only)
5. deleteTrip(tripId, userId): Chỉ OWNER, cascade delete
6. changeTripDates(tripId, userId, dto): Xử lý edge case (Section 11.3 trong spec)

Rules:
- Permission check theo TripMember role (OWNER/EDITOR/VIEWER matrix)
- Auto-transition status theo rules trong spec
- Throw proper HTTP exceptions

Viết TypeScript code đầy đủ với DTOs, validation, error handling.
```

### Prompt 2: Recommendation Engine
```
Tôi cần viết RecommendationService cho TripBlogger.

Context:
- PostgreSQL với PostGIS extension đã cài
- Bảng locations có cột geom (GEOMETRY POINT 4326)
- Bảng location_reviews có avg_rating, total_review, popularity_score
- Bảng trip_recommendations đã tồn tại

Scoring algorithm (từ spec):
SCORE = 0.30 * distance_score + 0.25 * rating_score + 0.20 * popularity_score
      + 0.10 * category_diversity_score + 0.10 * price_match_score + 0.05 * review_recency_score

distance_score: [paste bảng từ spec]
rating_score: (avg_rating / 5.0) * min(1.0, total_review / 10)

Yêu cầu:
1. generateRecommendations(tripId, accommodationId): Query candidates (SQL từ spec Section 5.3),
   tính score từng location, upsert top 50 vào trip_recommendations
2. getRecommendations(tripId, filter): Trả về recommendations grouped by category
3. dismissRecommendation / addRecommendationToTrip

Bao gồm: SQL query (dùng TypeORM query builder hoặc raw SQL), unit tests cho scoring logic.
```

### Prompt 3: Real-time Collaboration
```
Tôi cần implement real-time sync cho Trip collaboration feature trong NestJS app đã có Socket.io.

Spec:
- Channel: "trip:{tripId}"
- Events cần handle: STOP_ADDED, STOP_DELETED, STOPS_REORDERED, STOP_STATUS_CHANGED, RECOMMENDATIONS_READY, MEMBER_JOINED
- Chỉ broadcast đến members của trip đó (check trip_members table)
- Khi user connect → join rooms của tất cả trips họ là member ACCEPTED

Yêu cầu:
1. TripGateway (Socket.io gateway)
2. Authorization: verify JWT + check trip membership trước khi join room
3. Helper service để broadcast từ bất kỳ service nào
4. Handle disconnect gracefully
```

---

*Tài liệu này cập nhật lần cuối: v1.0*
*Người review trước khi implement: kiểm tra lại Section 4 (Business Rules) và Section 11 (Edge Cases)*
