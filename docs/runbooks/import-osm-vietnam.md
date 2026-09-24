# Import OSM Vietnam

**Fixture (CI / first demo, no download):**

```powershell
cd D:\tripblogger\services\geo-service
$env:DB_HOST='127.0.0.1'; $env:DB_USERNAME='sa'; $env:DB_PASSWORD='YourStrong!Passw0rd'; $env:DB_NAME='tripblogger_geo'; $env:DB_SYNC='1'
npm run geo:import -- --fixture
```

**Full extract (~300 MB PBF):**

1. Download `https://download.geofabrik.de/asia/vietnam-latest.osm.pbf` to `D:\tripblogger-data\osm\`.
2. If `osmium` is installed: `osmium tags-filter vietnam-latest.osm.pbf nwr/amenity nwr/shop nwr/tourism nwr/leisure -o vn-poi.osm.pbf` then `osmium export vn-poi.osm.pbf -f geojsonseq -o D:\tripblogger-data\osm\vietnam.geojsonseq`.
3. `npm run geo:import -- --geojsonseq=D:/tripblogger-data/osm/vietnam.geojsonseq`

**Photon index:** follow `rtuszik/photon-docker` docs for region `vietnam` into `D:\tripblogger-data\photon`. Until then reverse geocode returns 503.
