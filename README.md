# TripBlogger

Monorepo gồm **API NestJS** (SQL Server, auth JWT) và **ứng dụng mobile/web Expo** (React Native, Expo Router). Mục tiêu: nền tảng nội dung du lịch kết hợp gợi ý thương mại (feed, profile, deals).

## Cấu trúc thư mục

| Thư mục | Mô tả |
|--------|--------|
| [`tripblogger_api/`](./tripblogger_api/) | Backend NestJS, TypeORM migrations, seed, OpenAPI có thể bật qua Swagger |
| [`tripblogger_app/`](./tripblogger_app/) | Client Expo: routing `app/`, màn `src/screens/`, API client Axios, Zustand |
| [`README.md`](./README.md) | Tài liệu khởi động tổng (file này) |

Chi tiết từng package: [`tripblogger_api/README.md`](./tripblogger_api/README.md), [`tripblogger_app/README.md`](./tripblogger_app/README.md).

## Yêu cầu môi trường

- **Node.js** LTS (khuyến nghị 20+)
- **npm** hoặc tương đương
- API: **Microsoft SQL Server** (instance đạt JDBC/connection string trong `.env`)
- **Redis**, queue (tuỳ cấu hình `tripblogger_api`): nếu chạy full `start:dev` mà không có Redis có thể lỗi kết nối — chỉ seed/migration không cần bật Nest nếu bạn chỉ muốn cập nhật DB.

## Backend (`tripblogger_api`)

1. Sao chép môi trường: `cp tripblogger_api/.env.example tripblogger_api/.env` (Windows: copy tay) và điền `DB_*`, `JWT_*`.
2. Cài đặt: `cd tripblogger_api && npm install`
3. Migration: `npm run migration:run`
4. Seed dữ liệu demo:
   ```bash
   npm run seed:all
   ```
   Hoặc seed từng module — xem bảng lệnh trong [`tripblogger_api/README.md`](./tripblogger_api/README.md).
5. Chạy dev: `npm run start:dev`  
   API chạy tại cổng mặc định **`http://localhost:3000`** với prefix **`/api`** (ví dụ đăng nhập: `POST /api/auth/login`).

Chi tiết: [`tripblogger_api/README.md`](./tripblogger_api/README.md).

## App (`tripblogger_app`)

1. `cd tripblogger_app && npm install`
2. Sao chép `tripblogger_app/.env.example` → `.env`, đặt:
   ```env
   EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
   ```
3. **`localhost` chỉ đúng khi simulator/emulator chia sẻ mạng với máy dev.** Trên điện thoại qua Expo Go, app trong repo đã **tự đổi localhost sang IP Metro** khi đang development; vẫn có thể ghi rõ URL máy chủ vào `.env` nếu cần.
4. Chạy: `npm run start` (hoặc `npx expo start`)

Chi tiết: [`tripblogger_app/README.md`](./tripblogger_app/README.md).

## Seed user demo

Sau `seed:user`, có thể dùng tài khoản đã định nghĩa trong [`tripblogger_api/src/scripts/seed-user.ts`](./tripblogger_api/src/scripts/seed-user.ts) (email/password cập nhật theo script; mật khẩu tối thiểu khớp rule API).

## Production Migration Checklist

Danh sách này dùng khi chuyển từ local/dev sang production, đặc biệt cho phần upload ảnh, server, bảo mật và vận hành.

### 1) Hạ tầng server

- Tách riêng môi trường: `dev`, `staging`, `production` (không dùng chung DB/Redis).
- Chuẩn bị máy chủ cho:
  - API NestJS (process manager hoặc container).
  - SQL Server production.
  - Redis production.
  - Reverse proxy (Nginx/Caddy) trước API.
- Cấu hình domain + TLS (HTTPS bắt buộc).

### 2) Biến môi trường production

- API (`tripblogger_api/.env` trên server):
  - `NODE_ENV=production`
  - `PORT`
  - `DB_*`
  - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (khóa mạnh, không tái sử dụng khóa dev)
  - `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`
  - `REDIS_*`
  - `ADMIN_SECRET`
  - `GOOGLE_OAUTH_AUDIENCES`
- App (`tripblogger_app/.env` khi build):
  - `EXPO_PUBLIC_API_BASE_URL=https://<your-domain>/api`
  - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` theo môi trường.

### 3) Database migration + seed

- Chạy migration trước khi mở traffic:
  - `cd tripblogger_api && npm run migration:run`
- Chỉ seed dữ liệu hệ thống cần thiết ở production (roles/statuses), tránh seed user demo.
- Kiểm tra index/constraint sau migration, đảm bảo bảng auth/session/profile đúng schema.

### 4) Upload ảnh avatar (rất quan trọng)

- Hiện tại avatar lưu local tại `uploads/avatars` và serve qua `/uploads/*`.
- Với production:
  - Gắn volume/persistent disk cho thư mục `uploads` (không lưu ephemeral disk).
  - Thiết lập quota + theo dõi dung lượng đĩa.
  - Bật backup thư mục uploads định kỳ.
  - Chặn upload file không hợp lệ (mime, size) ở API (đã có validate cơ bản).
- `.gitignore` đã bỏ qua `**/uploads/` để không làm phình repo.
- Khuyến nghị trung hạn: chuyển sang object storage (S3/Cloudinary) để scale và CDN tốt hơn.

### 5) Build và deploy

- API:
  - `npm ci`
  - `npm run build`
  - chạy `node dist/main.js` (qua PM2/systemd/container).
- App Expo:
  - build profile production (Android/iOS) với env production.
  - xác nhận app gọi đúng domain API production.
- Reverse proxy:
  - route `/api/*` vào API service.
  - route `/uploads/*` vào static assets API hoặc mount trực tiếp từ proxy.

### 6) Bảo mật production

- Không bật Swagger/public debug trừ khi cần và có auth.
- Bật HTTPS-only, HSTS ở proxy.
- Rotate secrets định kỳ (JWT secrets, admin secret, DB password).
- Giới hạn CORS theo domain app thật.
- Giám sát login/refresh thất bại bất thường và rate-limit endpoint auth.

### 7) Quan sát hệ thống và backup

- Bật logging tập trung cho API (request ID, error tracking).
- Theo dõi: CPU/RAM, latency, error rate, DB connection pool, Redis health, disk usage của uploads.
- Backup:
  - SQL Server backup tự động + kiểm tra restore định kỳ.
  - Backup thư mục uploads + kiểm tra phục hồi.

### 8) Smoke test sau release

- Đăng ký/đăng nhập/refresh/logout trên ít nhất 2 thiết bị.
- Chỉnh profile:
  - đổi display name
  - upload avatar từ thư viện/camera
  - xóa avatar
- Đóng/mở app xác nhận session còn hiệu lực cho đến khi refresh token hết hạn.
- Kiểm tra URL avatar truy cập được từ mạng ngoài (không chỉ localhost).

## Git & bảo mật

- **Không commit** `.env`, file chứa mật khẩu, keystore hay token.
- `.gitignore` gốc đã loại **`node_modules`**, **`__pycache__`**, **`.expo`**, **IDE (`.vscode`, `.idea`, `.cursor`)** và các pattern secret phổ biến.

Nếu team muốn đồng bộ một phần cấu hình Cursor/rules, chỉ có thể thêm tay: `git add -f đường-dẫn-file`.

## License

Đặt theo policy dự án của bạn (chưa gắn license mặc định trong repo).
