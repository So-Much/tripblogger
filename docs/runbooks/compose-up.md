# Compose up

Everything runs locally in Docker; no paid or cloud service is required.

```powershell
cd D:\Work\Projects\tripblogger
copy .env.compose.example .env.compose
node infra/jwt/generate-dev-keys.js
npm run secrets:init
docker compose --env-file .env.compose --profile infra --profile apps up -d --build
npm run e2e
```

`secrets:init` only replaces empty or sample secret values with random ones; it never touches values you already set, and never rewrites `MSSQL_SA_PASSWORD` (see [secrets.md](secrets.md)). Nothing is written to machine environment variables — everything stays in `.env.compose`.

Check: `http://localhost:3000/api/health` and `http://localhost:8080` (Traefik dashboard).

## Profiles

| Profile | Services | Notes |
| --- | --- | --- |
| `infra` | mssql, redis (AOF), seaweedfs, traefik | Required |
| `apps` | core, geo, trip | Required |
| `obs` | prometheus `:9090`, grafana `:3001`, jaeger `:16686` | Set `OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318` to send traces |
| `search` | typesense | Optional; Geo falls back to SQL when `TYPESENSE_HOST` is empty |
| `geocoder` | photon (self-hosted) | Optional; Geo uses public `photon.komoot.io` when `PHOTON_URL` is empty |
| `tools` | k6 | `npm run load:smoke`, `npm run load:test` |

```powershell
docker compose --env-file .env.compose --profile infra --profile apps --profile obs up -d
```

Grafana login is `admin` / `GRAFANA_ADMIN_PASSWORD` from `.env.compose`; the "TripBlogger services" dashboard and Prometheus alert rules are provisioned automatically.

## Uploads (SeaweedFS)

Images go to a self-hosted S3-compatible store (SeaweedFS), never to the database. Core writes with the S3 API (`S3_ACCESS_KEY` / `S3_SECRET_KEY`); clients read via Traefik at `http://localhost:3000/uploads/<key>`. That route only allows GET/HEAD, strips `Authorization`/`Cookie`, and the anonymous identity can only read the `uploads` bucket.

Filer metadata is stored in SQLite (`/data/filer.db`) inside the `seaweedfs_data` volume — LevelDB lost entries after a Docker Desktop crash.

## Typesense and Photon are optional

- **Typesense** segfaults (exit 139) on the WSL 6.18 kernel. With `TYPESENSE_HOST=` empty, Geo searches with SQL (bounding-box prefilter). When enabled and unreachable, a 30 s circuit breaker keeps requests fast.
- **Photon** self-hosted needs a large country index. Leaving `PHOTON_URL=` empty uses the public instance with a 7-day Redis cache; a failing base URL is skipped for 60 s.

## Troubleshooting

- `set: illegal option -` from seaweedfs: `infra/seaweedfs/start.sh` was checked out with CRLF. The entrypoint strips `\r`, and `.gitattributes` forces LF for `*.sh`.
- Trip logs `NOGROUP`: Redis lost the consumer group; the consumer recreates it automatically from the start of the stream.
- Changes to `infra/traefik/dynamic.yml` need `docker restart tripblogger-traefik-1`.
