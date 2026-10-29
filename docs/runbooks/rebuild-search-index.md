# Rebuild Typesense `places`

1. Typesense must be up (`docker compose --profile infra up -d typesense`).
2. Delete collection (optional): `curl -X DELETE "http://localhost:8108/collections/places" -H "X-TYPESENSE-API-KEY: $TYPESENSE_API_KEY"`
3. Restart geo-service (it calls `ensureCollection`) or run import again — import upserts MSSQL; Geo `TypesensePlaces.upsertPlaces` runs after contribute/import when wired. For a full rebuild after fixture import, restart geo so the next search creates the collection, then re-run `geo:import --fixture` and a small script that reads MSSQL and upserts (import CLI currently writes MSSQL only — follow-up: call Typesense from CLI). Until then, create/approve a place via `POST /api/places` to populate the index, or restart after setting an admin reindex hook.

Practical first-run: import fixture → from Node REPL / a one-off in geo `TypesensePlaces.upsertPlaces(await places.find())` on boot if `GEO_REINDEX=1` (not implemented). Search degrades to SQL `normalized_name` so fixture rows are still findable without Typesense.
