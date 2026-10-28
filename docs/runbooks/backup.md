# Backup and restore

```powershell
npm run backup                 # -> backups/<timestamp>/
npm run backup -- --keep 7     # also delete all but the 7 newest backups
npm run restore -- <timestamp>  # e.g. 20261029-101500
```

A backup contains:

- `tripblogger.bak`, `tripblogger_geo.bak`, `tripblogger_trips.bak` — SQL Server native backups (written through the `./backups/mssql` bind mount).
- `seaweedfs.tgz` — tar of the `tripblogger_seaweedfs_data` volume (uploaded images + filer metadata).

Restore stops core, geo and trip, restores the three databases `WITH REPLACE`, replaces the SeaweedFS volume, then starts the services again. Redis is not backed up: it only holds caches and the event stream (the outbox in Geo can republish).

`backups/` is git-ignored. Copy it to another disk or a free cloud drive if you want an off-machine copy.
