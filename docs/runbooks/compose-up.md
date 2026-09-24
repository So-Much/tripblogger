# Compose up

```powershell
cd D:\tripblogger
copy .env.compose.example .env.compose
node infra/jwt/generate-dev-keys.js
docker compose --env-file .env.compose --profile infra up -d
docker compose --env-file .env.compose --profile apps up --build
```

Check: `http://localhost:3000/api/health` and `http://localhost:8080` (Traefik dashboard).

Observability (optional):

```powershell
docker compose -f docker-compose.yml -f tripblogger_api/docker-compose.observability.yml --profile infra --profile observability up -d
```
