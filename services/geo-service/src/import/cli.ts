import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import Typesense from 'typesense';
import { normalizeVi } from '@tripblogger/contracts';
import { PlaceEntity } from '../entities/place.entity';
import { parseGeoJsonSeq } from './parse-geojsonseq';

const COLLECTION = 'places';

async function upsertTypesense(places: PlaceEntity[]) {
  if (!places.length) return;
  const client = new Typesense.Client({
    nodes: [
      {
        host: process.env.TYPESENSE_HOST ?? '127.0.0.1',
        port: Number(process.env.TYPESENSE_PORT ?? 8108),
        protocol: 'http',
      },
    ],
    apiKey: process.env.TYPESENSE_API_KEY ?? 'xyz',
    connectionTimeoutSeconds: 5,
  });
  try {
    await client.collections(COLLECTION).retrieve();
  } catch {
    await client.collections().create({
      name: COLLECTION,
      fields: [
        { name: 'id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'normalized_name', type: 'string' },
        { name: 'aliases', type: 'string', optional: true },
        { name: 'address', type: 'string', optional: true },
        { name: 'category', type: 'string', facet: true },
        { name: 'location', type: 'geopoint' },
        { name: 'rating_avg', type: 'float' },
        { name: 'review_count', type: 'int32' },
        { name: 'popularity', type: 'float' },
        { name: 'status', type: 'string', facet: true },
        { name: 'source', type: 'string' },
      ],
      default_sorting_field: 'popularity',
    } as never);
  }
  const docs = places.map((p) => ({
    id: p.id,
    name: p.name,
    normalized_name: p.normalizedName,
    aliases: p.aliases ?? '',
    address: p.address ?? '',
    category: p.category,
    location: [Number(p.lat), Number(p.lng)],
    rating_avg: Number(p.ratingAvg) || 0,
    review_count: p.reviewCount || 0,
    popularity: Number(p.popularity) || 0,
    status: p.status,
    source: p.source,
  }));
  await client.collections(COLLECTION).documents().import(docs, { action: 'upsert' });
}

async function main() {
  const fixture = process.argv.includes('--fixture');
  const geojsonArg = process.argv.find((a) => a.startsWith('--geojsonseq='))?.slice('--geojsonseq='.length);
  const path = fixture
    ? join(__dirname, '../../fixtures/vietnam-sample.geojsonseq')
    : geojsonArg ?? join(process.env.DATA_ROOT ?? 'D:/tripblogger-data', 'osm', 'vietnam.geojsonseq');
  const text = readFileSync(path, 'utf8');
  const pois = parseGeoJsonSeq(text);

  const ds = new DataSource({
    type: 'mssql',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 1433),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME ?? 'tripblogger_geo',
    options: { encrypt: false, trustServerCertificate: true, useUTC: true },
    entities: [PlaceEntity],
    synchronize: process.env.DB_SYNC === '1',
  });
  await ds.initialize();
  const repo = ds.getRepository(PlaceEntity);
  const saved: PlaceEntity[] = [];
  let upserted = 0;
  for (const poi of pois) {
    if (poi.osmType && poi.osmId) {
      const existing = await repo.findOne({ where: { osmType: poi.osmType, osmId: poi.osmId } });
      if (existing?.source === 'user') continue;
      if (existing) {
        existing.name = poi.name;
        existing.normalizedName = normalizeVi(poi.name);
        existing.category = poi.category;
        existing.address = poi.address;
        existing.openingHoursRaw = poi.openingHours;
        existing.phone = poi.phone;
        existing.website = poi.website;
        existing.wikidataId = poi.wikidataId;
        existing.lat = String(poi.lat);
        existing.lng = String(poi.lng);
        const row = await repo.save(existing);
        saved.push(row);
        upserted++;
        continue;
      }
    }
    const row = await repo.save(
      repo.create({
        osmType: poi.osmType,
        osmId: poi.osmId,
        name: poi.name,
        normalizedName: normalizeVi(poi.name),
        category: poi.category,
        subcategory: poi.subcategory,
        lat: String(poi.lat),
        lng: String(poi.lng),
        address: poi.address,
        phone: poi.phone,
        website: poi.website,
        openingHoursRaw: poi.openingHours,
        wikidataId: poi.wikidataId,
        source: 'osm',
        status: 'active',
      }),
    );
    saved.push(row);
    upserted++;
  }
  await ds.destroy();

  let typesenseUpserted = 0;
  try {
    await upsertTypesense(saved);
    typesenseUpserted = saved.length;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`Typesense upsert skipped: ${err instanceof Error ? err.message : err}`);
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ upserted, typesenseUpserted, source: path }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
