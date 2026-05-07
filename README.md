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
4. Seed vai trò/trạng thái và user demo:
   ```bash
   npm run seed:roles-statuses
   npm run seed:user
   ```
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

## Git & bảo mật

- **Không commit** `.env`, file chứa mật khẩu, keystore hay token.
- `.gitignore` gốc đã loại **`node_modules`**, **`__pycache__`**, **`.expo`**, **IDE (`.vscode`, `.idea`, `.cursor`)** và các pattern secret phổ biến.

Nếu team muốn đồng bộ một phần cấu hình Cursor/rules, chỉ có thể thêm tay: `git add -f đường-dẫn-file`.

## License

Đặt theo policy dự án của bạn (chưa gắn license mặc định trong repo).
