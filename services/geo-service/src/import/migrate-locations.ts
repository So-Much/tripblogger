import 'dotenv/config';
import { DataSource } from 'typeorm';
import { categoryFromDbTypeCode, normalizeVi } from '@tripblogger/contracts';
import { PlaceEntity } from '../entities/place.entity';
import { PlaceReviewEntity } from '../entities/place-review.entity';
import { SavedPlaceEntity } from '../entities/saved-place.entity';
import { CheckinEntity } from '../entities/checkin.entity';
import { geoDataSourceOptions } from '../database/data-source';

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
  const geo = new DataSource(geoDataSourceOptions());
  await core.initialize();
  await geo.initialize();
  const rows = (await core.query(
    `SELECT l.id, l.name, l.address, l.latitude, l.longitude, l.status, l.phone, l.website, l.avg_rating, l.total_review, t.code AS type_code
     FROM locations l
     LEFT JOIN location_types t ON t.id = l.location_type_id`,
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
      category: categoryFromDbTypeCode(row.type_code != null ? String(row.type_code) : null),
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
  const saved = await copyOptional(core, geo, 'saved_locations', async (row) => {
    await geo.query(
      `IF NOT EXISTS (SELECT 1 FROM saved_places WHERE id = @0)
       INSERT INTO saved_places (id, user_id, place_id, collection_name, note, created_at)
       VALUES (@0,@1,@2,@3,@4,COALESCE(@5, SYSUTCDATETIME()))`,
      [row.id, row.user_id, row.location_id, row.collection_name ?? 'Mặc định', row.note, row.created_at],
    );
  });
  const reviews = await copyOptional(core, geo, 'location_reviews', async (row) => {
    await geo.query(
      `IF NOT EXISTS (SELECT 1 FROM place_reviews WHERE id = @0)
       INSERT INTO place_reviews (id, place_id, user_id, rating, body, tags_json, created_at)
       VALUES (@0,@1,@2,@3,@4,@5,COALESCE(@6, SYSUTCDATETIME()))`,
      [row.id, row.location_id, row.user_id, row.rating, row.content, row.tags_json, row.created_at],
    );
  });
  const checkins = await copyOptional(core, geo, 'user_checkins', async (row) => {
    await geo.query(
      `IF NOT EXISTS (SELECT 1 FROM checkins WHERE id = @0)
       INSERT INTO checkins (id, user_id, place_id, lat, lng, privacy_level, created_at)
       VALUES (@0,@1,@2,@3,@4,@5,COALESCE(@6, SYSUTCDATETIME()))`,
      [row.id, row.user_id, row.location_id, row.latitude, row.longitude, row.privacy_level, row.checkin_time],
    );
  });
  await core.destroy();
  await geo.destroy();
  console.log(JSON.stringify({ upserted, saved, reviews, checkins }));
}

async function copyOptional(
  core: DataSource,
  _geo: DataSource,
  table: string,
  insert: (row: Record<string, unknown>) => Promise<void>,
): Promise<number> {
  try {
    const rows = (await core.query(`SELECT * FROM ${table}`)) as Array<Record<string, unknown>>;
    for (const row of rows) await insert(row);
    return rows.length;
  } catch (err) {
    console.warn(`skip ${table}: ${err instanceof Error ? err.message : err}`);
    return 0;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
