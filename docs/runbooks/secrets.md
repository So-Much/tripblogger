# Secrets

All secrets live in `.env.compose` (git-ignored). Nothing is stored in machine environment variables or a paid secret manager.

```powershell
npm run secrets:init
```

- Creates `.env.compose` from `.env.compose.example` if it does not exist.
- Replaces placeholder values (empty, or containing `change_me` / `change_this` / `your_`) of JWT, admin, internal-token, S3, Typesense and Grafana secrets with random ones, and appends any of those keys that are missing.
- Never changes a value you set yourself.
- Services refuse to start in production mode with placeholder secrets unless `ALLOW_PLACEHOLDER_SECRETS=1`.

## Rotating

| Secret | Effect of changing it |
| --- | --- |
| `JWT_*` | Every user must sign in again |
| `ADMIN_SECRET` | Update anything that calls admin endpoints (e.g. `npm run e2e` reads it from `.env.compose`) |
| `GEO_INTERNAL_TOKEN` | Restart geo and trip together |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | Recreate seaweedfs and core together (`up -d seaweedfs core`); stored images are kept |
| `GRAFANA_ADMIN_PASSWORD` | Only applied on a fresh Grafana volume; otherwise change it in the Grafana UI |

To rotate one value, clear it (leave `KEY=`), run `npm run secrets:init`, then `docker compose --env-file .env.compose --profile infra --profile apps up -d`.

## MSSQL_SA_PASSWORD

`secrets:init` only warns about it: SQL Server stores the SA password inside the `mssql_data` volume on first start, so changing `.env.compose` alone locks the services out.

1. Take a backup: `npm run backup`.
2. Change the password inside SQL Server:
   ```powershell
   docker exec -it tripblogger-mssql-1 /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "<old>" -Q "ALTER LOGIN sa WITH PASSWORD = '<new>'"
   ```
3. Put `<new>` in `MSSQL_SA_PASSWORD` in `.env.compose`.
4. `docker compose --env-file .env.compose --profile infra --profile apps up -d` (recreates services with the new password).
