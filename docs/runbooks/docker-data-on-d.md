# Move Docker Desktop disk to D:

Drive C is nearly full. Put the Docker VM disk on D.

1. Quit Docker Desktop (tray → Quit).
2. Docker Desktop → Settings → Resources → Advanced → **Disk image location**.
3. Set `D:\docker` (create the folder first).
4. Apply & restart. Confirm `docker info` works.
5. Create data root: `mkdir D:\tripblogger-data\photon`, `mkdir D:\tripblogger-data\osm`.
6. In `.env.compose` set `DATA_ROOT=D:/tripblogger-data`.
