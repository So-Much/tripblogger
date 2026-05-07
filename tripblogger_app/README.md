# TripBlogger — App (Expo)

Ứng dụng Expo Router + React Native: feed (mock), commerce widgets, đăng nhập JWT, theme sáng/tối, safe area cho iPhone.

## Cần có

- Node.js LTS  
- Backend [`tripblogger_api`](../tripblogger_api/) đang chạy (hoặc URL API hợp lệ trong `.env`)

## Cấu trúc nhanh

| Đường dẫn | Vai trò |
|-----------|--------|
| `app/` | File-based routing (tabs, `(auth)/login`) |
| `src/screens/` | Màn full-screen |
| `src/components/` | UI tái sử dụng (feed, commerce, home) |
| `src/services/api/` | Axios client; URL base resolve trong dev để tránh lỗi `localhost` trên thiết bị thật |
| `src/hooks/` | React Query + auth |
| `src/store/` | Zustand (`tokens`, `me`) |
| `src/mocks/` | Dữ liệu giả cho UI |

## Setup

```bash
cd tripblogger_app
npm install
```

1. Sao chép `.env.example` → `.env`  
2. `EXPO_PUBLIC_API_BASE_URL` trỏ tới API, ví dụ `http://localhost:3000/api` hoặc `http://<IP-máy-chủ>:3000/api`.

## Chạy

```bash
npm run start
```

Hoặc `npm run ios` / `npm run android` / `npm run web`.

Lint:

```bash
npm run lint
```

## Tài liệu repo gốc

Hướng dẫn chung và backend: [**README ngang cấp**](../README.md).
