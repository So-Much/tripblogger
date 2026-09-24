import 'dotenv/config';
import { DataSource } from 'typeorm';
import { normalizeVi } from '@tripblogger/contracts';
import { PlaceEntity } from '../entities/place.entity';

/** Read-only copy of Core `locations` into Geo `places`, keeping the same UUID. */
async function main() {
  const core = new DataSource({
    type: 'mssql',
    host: process.env.CORE_DB_HOST ?? process.env.DB_HOST,
    port: Number(process.env.CORE_DB_PORT ?? process.env.DB_PORT ?? 1433),
    username: process.env.CORE_DB_USERNAME ?? process.env.DB_USERNAME,
    password: process.env.CORE_DB_PASSWORD ?? process.env.DB_PASSWORD,
    database: process.env.CORE_DB_NAME ?? 'tripblogger',
    options: { encrypt: false, trustServerCertificate: true, useUTC: true },
  });
  const geo = new DataSource({
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
  await core.initialize();
  await geo.initialize();
  const rows = (await core.query(
    `SELECT id, name, address, latitude, longitude, status, phone, website, avg_rating, total_review FROM locations`,
  )) as Array<Record<string, unknown>>;
  const repo = geo.getRepository(PlaceEntity);
  let upserted = 0;
  for (const row of rows) {
    const id = String(row.id);
    const existing = await repo.findOne({ where: { id } });
    const status =
      row.status === 'ACTIVE' ? 'active' : row.status === 'PENDING_VERIFICATION' ? 'pending' : 'rejected';
    const payload = {
      id,
      name: String(row.name),
      normalizedName: normalizeVi(String(row.name)),
      category: 'other',
      lat: String(row.latitude),
      lng: String(row.longitude),
      address: row.address != null ? String(row.address) : null,
      phone: row.phone != null ? String(row.phone) : null,
      website: row.website != null ? String(row.website) : null,
      source: 'seed' as const,
      status: status as 'active' | 'pending' | 'rejected',
      ratingAvg: String(row.avg_rating ?? 0),
      reviewCount: Number(row.total_review ?? 0),
    };
    if (existing) {
      Object.assign(existing, payload);
      await repo.save(existing);
    } else {
      await repo.save(repo.create(payload));
    }
    upserted++;
  }
  await core.destroy();
  await geo.destroy();
  console.log(JSON.stringify({ upserted }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
