# TripBlogger API Foundation

Tài liệu monorepo (app + hạ tầng): [README gốc](../README.md).

## Run

1. Copy `.env.example` to `.env` and fill values.
2. Install deps: `npm install`
3. Run migrations: `npm run migration:run`
4. Seed roles/statuses: `npm run seed:roles-statuses`
5. Start dev server: `npm run start:dev`

## Timestamps (UTC)

SQL Server `datetime2` columns and API JSON (`createdAt`, `updatedAt`, …) are **UTC**. SSMS shows wall-clock UTC (e.g. 03:51 for a 10:51 VN action). The mobile app formats ISO strings with `Z` in the device local timezone. For ad-hoc queries in SSMS, use `AT TIME ZONE` or subtract your offset.

TypeORM MSSQL must use `options.useUTC: true` so the driver does not treat DB UTC values as the API host's local time (which would make comments show 03:51 instead of 10:51 on VN devices). Restart the API after changing DB options.

## Architecture

- `src/modules/*`: domain modules (`auth`, `users`, `health`)
- `src/config/*`: infra config (`db`, `redis`, `queue`, `otel`)
- `src/common/*`: shared guards/decorators/interceptors
- `src/migrations/*`: SQL Server migrations

## Auth Flow

- Access token TTL short (`JWT_ACCESS_TTL`)
- Refresh token rotate and revoke-by-jti in `refresh_tokens`
- Role guard (`roles`) + status guard (`required_statuses`)

## Queues and Metrics

- BullMQ queues: `image-processing`, `email`
- Metrics endpoint: `GET /api/metrics`
