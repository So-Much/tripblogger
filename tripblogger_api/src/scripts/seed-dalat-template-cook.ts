import 'dotenv/config';
import 'reflect-metadata';
import { randomUUID } from 'crypto';
import dataSource from '../config/db/typeorm.datasource';

/**
 * Seeds Đà Lạt destination + featured POI/FOOD/STAY + 1 published template.
 * Idempotent via external_id prefix `tb-dalat-*`.
 *
 * Run: npm run seed:dalat-template-cook
 */
const EXTERNAL_SOURCE = 'tripblogger';
const TYPE = {
  food: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa001',
  attraction: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa004',
  accommodation: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa005',
  nature: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa008',
} as const;

type SeedLoc = {
  externalId: string;
  name: string;
  address: string;
  typeId: string;
  lat: number;
  lng: number;
  slotType: 'POI' | 'FOOD' | 'STAY';
  featuredRank: number;
  defaultDurationMin: number;
  vibeTags?: string[];
};

const DALAT: SeedLoc[] = [
  {
    externalId: 'tb-dalat-poi-xuanhuong',
    name: 'Hồ Xuân Hương',
    address: 'Trung tâm TP. Đà Lạt',
    typeId: TYPE.attraction,
    lat: 11.9404,
    lng: 108.4583,
    slotType: 'POI',
    featuredRank: 1,
    defaultDurationMin: 90,
  },
  {
    externalId: 'tb-dalat-poi-datanla',
    name: 'Thác Datanla',
    address: 'Quốc lộ 20, Đà Lạt',
    typeId: TYPE.nature,
    lat: 11.9006,
    lng: 108.4489,
    slotType: 'POI',
    featuredRank: 2,
    defaultDurationMin: 120,
  },
  {
    externalId: 'tb-dalat-poi-crazyhouse',
    name: 'Crazy House',
    address: '3 Đường Huỳnh Thúc Kháng, Đà Lạt',
    typeId: TYPE.attraction,
    lat: 11.9365,
    lng: 108.4315,
    slotType: 'POI',
    featuredRank: 3,
    defaultDurationMin: 90,
  },
  {
    externalId: 'tb-dalat-poi-langbiang',
    name: 'Đỉnh Langbiang',
    address: 'Lạc Dương, Lâm Đồng',
    typeId: TYPE.nature,
    lat: 12.0472,
    lng: 108.4256,
    slotType: 'POI',
    featuredRank: 4,
    defaultDurationMin: 150,
  },
  {
    externalId: 'tb-dalat-poi-valley',
    name: 'Valley of Love',
    address: 'Mai Anh Đào, Đà Lạt',
    typeId: TYPE.attraction,
    lat: 11.9558,
    lng: 108.4308,
    slotType: 'POI',
    featuredRank: 5,
    defaultDurationMin: 90,
  },
  {
    externalId: 'tb-dalat-food-onghao',
    name: 'Quán Ăn Ông Hảo',
    address: 'Phan Đình Phùng, Đà Lạt',
    typeId: TYPE.food,
    lat: 11.9432,
    lng: 108.4372,
    slotType: 'FOOD',
    featuredRank: 6,
    defaultDurationMin: 60,
  },
  {
    externalId: 'tb-dalat-food-banhmi',
    name: 'Bánh Mì Xíu Mại',
    address: 'Nguyễn Văn Trỗi, Đà Lạt',
    typeId: TYPE.food,
    lat: 11.9418,
    lng: 108.4412,
    slotType: 'FOOD',
    featuredRank: 7,
    defaultDurationMin: 45,
  },
  {
    externalId: 'tb-dalat-food-cafe',
    name: 'Café Túi Mơ To',
    address: 'Hoàng Diệu, Đà Lạt',
    typeId: TYPE.food,
    lat: 11.9481,
    lng: 108.4395,
    slotType: 'FOOD',
    featuredRank: 8,
    defaultDurationMin: 60,
  },
  {
    externalId: 'tb-dalat-stay-glamping',
    name: 'Đà Lạt Glamping Haven',
    address: 'Ngoại ô Đà Lạt',
    typeId: TYPE.accommodation,
    lat: 11.912,
    lng: 108.462,
    slotType: 'STAY',
    featuredRank: 9,
    defaultDurationMin: 0,
    vibeTags: ['GLAMPING'],
  },
  {
    externalId: 'tb-dalat-stay-central',
    name: 'Terracotta Hotel & Resort Đà Lạt',
    address: 'Phường 10, Đà Lạt',
    typeId: TYPE.accommodation,
    lat: 11.935,
    lng: 108.445,
    slotType: 'STAY',
    featuredRank: 10,
    defaultDurationMin: 0,
    vibeTags: ['CENTRAL'],
  },
  {
    externalId: 'tb-dalat-stay-homestay',
    name: 'Homestay An Nhiên Đà Lạt',
    address: 'An Sơn, Đà Lạt',
    typeId: TYPE.accommodation,
    lat: 11.968,
    lng: 108.452,
    slotType: 'STAY',
    featuredRank: 11,
    defaultDurationMin: 0,
    vibeTags: ['HOMESTAY'],
  },
];

async function main() {
  await dataSource.initialize();
  const qr = dataSource.createQueryRunner();
  await qr.connect();

  try {
    let destId: string;
    const existingDest = await qr.query(
      `SELECT id FROM destinations WHERE code = 'DALAT'`,
    );
    if (existingDest[0]?.id) {
      destId = existingDest[0].id;
      console.log('Destination DALAT exists:', destId);
    } else {
      destId = randomUUID();
      await qr.query(
        `INSERT INTO destinations (id, code, name, centroid_lat, centroid_lng, status)
         VALUES (@0, 'DALAT', N'Đà Lạt', 11.9404, 108.4583, 'ACTIVE')`,
        [destId],
      );
      console.log('Created destination DALAT:', destId);
    }

    const locationIds: string[] = [];
    for (const poi of DALAT) {
      const rows = await qr.query(
        `SELECT id FROM locations WHERE external_source = @0 AND external_id = @1`,
        [EXTERNAL_SOURCE, poi.externalId],
      );
      let locId: string;
      if (rows[0]?.id) {
        locId = rows[0].id;
        await qr.query(
          `UPDATE locations SET
            destination_id = @0,
            featured_rank = @1,
            default_duration_min = @2,
            slot_type = @3,
            vibe_tags = @4,
            name = @5,
            address = @6,
            latitude = @7,
            longitude = @8,
            status = 'ACTIVE',
            updated_at = GETUTCDATE()
           WHERE id = @9`,
          [
            destId,
            poi.featuredRank,
            poi.defaultDurationMin,
            poi.slotType,
            poi.vibeTags ? JSON.stringify(poi.vibeTags) : null,
            poi.name,
            poi.address,
            poi.lat,
            poi.lng,
            locId,
          ],
        );
      } else {
        locId = randomUUID();
        await qr.query(
          `INSERT INTO locations (
            id, location_type_id, name, address, latitude, longitude, status,
            source_type, external_source, external_id, avg_rating, total_review,
            popularity_score, destination_id, featured_rank, default_duration_min,
            slot_type, vibe_tags
          ) VALUES (
            @0, @1, @2, @3, @4, @5, 'ACTIVE',
            'MANUAL', @6, @7, 4.5, 100,
            0.8, @8, @9, @10,
            @11, @12
          )`,
          [
            locId,
            poi.typeId,
            poi.name,
            poi.address,
            poi.lat,
            poi.lng,
            EXTERNAL_SOURCE,
            poi.externalId,
            destId,
            poi.featuredRank,
            poi.defaultDurationMin,
            poi.slotType,
            poi.vibeTags ? JSON.stringify(poi.vibeTags) : null,
          ],
        );
      }
      locationIds.push(locId);
      console.log('Location:', poi.name, locId);
    }

    const tplRows = await qr.query(
      `SELECT id FROM trip_templates WHERE destination_id = @0 AND title = @1`,
      [destId, 'Đà Lạt 2N1Đ chill'],
    );
    let templateId: string;
    if (tplRows[0]?.id) {
      templateId = tplRows[0].id;
      await qr.query(`DELETE FROM template_blocks WHERE template_id = @0`, [templateId]);
    } else {
      templateId = randomUUID();
      await qr.query(
        `INSERT INTO trip_templates (
          id, destination_id, title, night_count, style_tags, summary, is_published
        ) VALUES (@0, @1, @2, 2, @3, @4, 1)`,
        [
          templateId,
          destId,
          'Đà Lạt 2N1Đ chill',
          JSON.stringify(['chill', 'foodie', 'nature']),
          'Khung tour Đà Lạt 2 đêm: hồ, thác, cafe và chỗ ở theo vibe.',
        ],
      );
    }

    // Prefill picks: first 6 non-STAY
    const pickLocs = DALAT.map((p, i) => ({ ...p, id: locationIds[i] })).filter(
      (p) => p.slotType !== 'STAY',
    );
    for (let i = 0; i < Math.min(6, pickLocs.length); i++) {
      await qr.query(
        `INSERT INTO template_blocks (id, template_id, location_id, suggested_day_hint, order_index)
         VALUES (@0, @1, @2, @3, @4)`,
        [randomUUID(), templateId, pickLocs[i].id, i < 3 ? 1 : 2, i],
      );
    }

    console.log('Template ready:', templateId);
    console.log('Done.');
  } finally {
    await qr.release();
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
