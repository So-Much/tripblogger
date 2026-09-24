# Backup

**SQL Server (three databases):**

```powershell
sqlcmd -S 127.0.0.1,1433 -U sa -P "YourStrong!Passw0rd" -Q "BACKUP DATABASE tripblogger TO DISK='D:\tripblogger-data\backup\tripblogger.bak' WITH INIT"
sqlcmd -S 127.0.0.1,1433 -U sa -P "YourStrong!Passw0rd" -Q "BACKUP DATABASE tripblogger_trips TO DISK='D:\tripblogger-data\backup\tripblogger_trips.bak' WITH INIT"
sqlcmd -S 127.0.0.1,1433 -U sa -P "YourStrong!Passw0rd" -Q "BACKUP DATABASE tripblogger_geo TO DISK='D:\tripblogger-data\backup\tripblogger_geo.bak' WITH INIT"
```

**Volumes:** copy `D:\tripblogger-data\photon` and Docker volumes `typesense_data` / `mssql_data` (Docker Desktop → Volumes, or `docker run --rm -v tripblogger_typesense_data:/data -v D:/tripblogger-data/backup:/out alpine tar czf /out/typesense.tgz /data`).
