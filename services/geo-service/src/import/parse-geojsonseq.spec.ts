import { parseGeoJsonSeq } from './parse-geojsonseq';

const line = JSON.stringify({
  type: 'Feature',
  id: 'node/1',
  properties: { name: 'Phở Cỏ', amenity: 'restaurant' },
  geometry: { type: 'Point', coordinates: [105.85, 21.03] },
});

describe('parseGeoJsonSeq', () => {
  it('parses two features and skips nameless', () => {
    const nameless = JSON.stringify({
      type: 'Feature',
      properties: { amenity: 'bench' },
      geometry: { type: 'Point', coordinates: [105, 21] },
    });
    const pois = parseGeoJsonSeq(`${line}\n${nameless}\n`);
    expect(pois).toHaveLength(1);
    expect(pois[0].name).toBe('Phở Cỏ');
    expect(pois[0].category).toBe('restaurant');
    expect(pois[0].osmType).toBe('node');
  });
});
