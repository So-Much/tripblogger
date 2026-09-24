# Add another country

No code change.

1. Download the Geofabrik `.osm.pbf` for that country into `D:\tripblogger-data\osm\<country>.pbf`.
2. Filter + export GeoJSONSeq (same osmium commands as Vietnam).
3. `npm run geo:import -- --geojsonseq=D:/tripblogger-data/osm/<country>.geojsonseq`
4. Add the Photon region extract into the same Photon data dir (or a second Photon container) and point `PHOTON_URL` at it.
