import 'dotenv/config';
import 'reflect-metadata';
import { randomUUID } from 'crypto';
import dataSource from '../config/db/typeorm.datasource';
import { haversineKm } from '../common/utils/haversine';
import { computeRecommendationScore } from '../modules/trips/utils/trip-scoring';

/**
 * Seeds ACTIVE locations (POIs) and an optional demo trip with recommendations.
 *
 * Prerequisites: `npm run seed:user`
 *
 * Env:
 * - LOCATIONS_SEED_RESET=1 — remove tb-loc-* locations and demo trip, then re-seed
 * - LOCATIONS_SEED_SKIP_TRIP=1 — only seed locations (no demo trip / recommendations)
 * - LOCATIONS_SEED_EMAIL (default: minhnhieu50@gmail.com) — owner of demo trip
 */
const DEFAULT_USER_EMAIL = 'minhnhieu50@gmail.com';
const EXTERNAL_SOURCE = 'tripblogger';
const DEMO_TRIP_TITLE = 'Khám phá Đà Nẵng (demo)';

const TYPE = {
  food: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa001',
  cafe: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa002',
  restaurant: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa003',
  attraction: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa004',
  accommodation: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa005',
  shopping: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa006',
  entertainment: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa007',
  nature: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa008',
  outdoor: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa009',
} as const;

type PoiSeed = {
  externalId: string;
  name: string;
  address: string;
  typeId: string;
  lat: number;
  lng: number;
  avgRating: number;
  totalReview: number;
  popularityScore: number;
  priceLevel?: number;
};

const POIS: PoiSeed[] = [
  // Đà Nẵng — chỗ ở
  {
    externalId: 'tb-loc-dn-hotel-furama',
    name: 'Furama Resort Đà Nẵng',
    address: '105 Võ Nguyên Giáp, Ngũ Hành Sơn, Đà Nẵng',
    typeId: TYPE.accommodation,
    lat: 16.0392,
    lng: 108.2514,
    avgRating: 4.6,
    totalReview: 842,
    popularityScore: 0.92,
    priceLevel: 4,
  },
  {
    externalId: 'tb-loc-dn-hotel-novotel',
    name: 'Novotel Danang Premier Han River',
    address: '36 Bạch Đằng, Hải Châu, Đà Nẵng',
    typeId: TYPE.accommodation,
    lat: 16.0678,
    lng: 108.2451,
    avgRating: 4.4,
    totalReview: 531,
    popularityScore: 0.85,
    priceLevel: 4,
  },
  {
    externalId: 'tb-loc-dn-hotel-mikazuki',
    name: 'Mikazuki Japanese Resort',
    address: 'Ngũ Hành Sơn, Đà Nẵng',
    typeId: TYPE.accommodation,
    lat: 16.0285,
    lng: 108.2598,
    avgRating: 4.5,
    totalReview: 412,
    popularityScore: 0.78,
    priceLevel: 3,
  },
  // Đà Nẵng — ăn uống
  {
    externalId: 'tb-loc-dn-mi-quang-ba-mua',
    name: 'Mì Quảng Bà Mua',
    address: '19 Trần Bình Trọng, Hải Châu, Đà Nẵng',
    typeId: TYPE.restaurant,
    lat: 16.0621,
    lng: 108.2143,
    avgRating: 4.7,
    totalReview: 1204,
    popularityScore: 0.95,
    priceLevel: 1,
  },
  {
    externalId: 'tb-loc-dn-be-man',
    name: 'Bé Mặn',
    address: '88 Hoàng Diệu, Hải Châu, Đà Nẵng',
    typeId: TYPE.restaurant,
    lat: 16.0604,
    lng: 108.2208,
    avgRating: 4.5,
    totalReview: 876,
    popularityScore: 0.88,
    priceLevel: 2,
  },
  {
    externalId: 'tb-loc-dn-madame-lan',
    name: 'Madam Lân Restaurant',
    address: '4 Bạch Đằng, Hải Châu, Đà Nẵng',
    typeId: TYPE.restaurant,
    lat: 16.0682,
    lng: 108.2235,
    avgRating: 4.3,
    totalReview: 654,
    popularityScore: 0.81,
    priceLevel: 3,
  },
  {
    externalId: 'tb-loc-dn-ban-co',
    name: 'Bánh Xèo Bà Cô',
    address: '23 Khoái Châu, Hải Châu, Đà Nẵng',
    typeId: TYPE.food,
    lat: 16.0598,
    lng: 108.2176,
    avgRating: 4.6,
    totalReview: 432,
    popularityScore: 0.76,
    priceLevel: 1,
  },
  // Đà Nẵng — cà phê
  {
    externalId: 'tb-loc-dn-43-factory',
    name: '43 Factory Coffee Roaster',
    address: '129 Lê Duẩn, Hải Châu, Đà Nẵng',
    typeId: TYPE.cafe,
    lat: 16.0654,
    lng: 108.2189,
    avgRating: 4.8,
    totalReview: 967,
    popularityScore: 0.91,
    priceLevel: 2,
  },
  {
    externalId: 'tb-loc-dn-cong-caphe',
    name: 'Cộng Cà Phê Đà Nẵng',
    address: '96 Bạch Đằng, Hải Châu, Đà Nẵng',
    typeId: TYPE.cafe,
    lat: 16.0671,
    lng: 108.2242,
    avgRating: 4.2,
    totalReview: 389,
    popularityScore: 0.72,
    priceLevel: 1,
  },
  {
    externalId: 'tb-loc-dn-7-brewsters',
    name: '7 Brewsters Coffee',
    address: '35 Trần Phú, Hải Châu, Đà Nẵng',
    typeId: TYPE.cafe,
    lat: 16.0635,
    lng: 108.2211,
    avgRating: 4.4,
    totalReview: 278,
    popularityScore: 0.65,
    priceLevel: 2,
  },
  // Đà Nẵng — tham quan
  {
    externalId: 'tb-loc-dn-dragon-bridge',
    name: 'Cầu Rồng',
    address: 'Nguyễn Văn Linh, Hải Châu, Đà Nẵng',
    typeId: TYPE.attraction,
    lat: 16.0613,
    lng: 108.2275,
    avgRating: 4.6,
    totalReview: 2100,
    popularityScore: 0.98,
    priceLevel: 1,
  },
  {
    externalId: 'tb-loc-dn-marble-mountains',
    name: 'Ngũ Hành Sơn',
    address: 'Ngũ Hành Sơn, Đà Nẵng',
    typeId: TYPE.attraction,
    lat: 15.9642,
    lng: 108.2634,
    avgRating: 4.5,
    totalReview: 1850,
    popularityScore: 0.94,
    priceLevel: 2,
  },
  {
    externalId: 'tb-loc-dn-my-khe-beach',
    name: 'Bãi biển Mỹ Khê',
    address: 'Phước Mỹ, Sơn Trà, Đà Nẵng',
    typeId: TYPE.nature,
    lat: 16.0471,
    lng: 108.2483,
    avgRating: 4.7,
    totalReview: 1560,
    popularityScore: 0.96,
    priceLevel: 1,
  },
  {
    externalId: 'tb-loc-dn-cham-museum',
    name: 'Bảo tàng Điêu khắc Chăm',
    address: '2 2 Tháng 9, Hải Châu, Đà Nẵng',
    typeId: TYPE.attraction,
    lat: 16.0601,
    lng: 108.2202,
    avgRating: 4.4,
    totalReview: 720,
    popularityScore: 0.83,
    priceLevel: 2,
  },
  {
    externalId: 'tb-loc-dn-lady-buddha',
    name: 'Tượng Phật Bà Quan Âm',
    address: 'Sơn Trà, Đà Nẵng',
    typeId: TYPE.attraction,
    lat: 16.0998,
    lng: 108.2775,
    avgRating: 4.6,
    totalReview: 980,
    popularityScore: 0.89,
    priceLevel: 1,
  },
  {
    externalId: 'tb-loc-dn-asia-park',
    name: 'Sun World Asia Park',
    address: '1 Phan Đăng Lưu, Hải Châu, Đà Nẵng',
    typeId: TYPE.entertainment,
    lat: 16.0548,
    lng: 108.2148,
    avgRating: 4.3,
    totalReview: 640,
    popularityScore: 0.79,
    priceLevel: 3,
  },
  {
    externalId: 'tb-loc-dn-han-market',
    name: 'Chợ Hàn',
    address: '119 Trần Phú, Hải Châu, Đà Nẵng',
    typeId: TYPE.shopping,
    lat: 16.0639,
    lng: 108.2198,
    avgRating: 4.1,
    totalReview: 510,
    popularityScore: 0.74,
    priceLevel: 1,
  },
  {
    externalId: 'tb-loc-dn-lotte-mart',
    name: 'Lotte Mart Đà Nẵng',
    address: '6 Nại Nam, Hải Châu, Đà Nẵng',
    typeId: TYPE.shopping,
    lat: 16.0562,
    lng: 108.2125,
    avgRating: 4.0,
    totalReview: 320,
    popularityScore: 0.68,
    priceLevel: 2,
  },
  {
    externalId: 'tb-loc-dn-son-tra-peninsula',
    name: 'Bán đảo Sơn Trà',
    address: 'Sơn Trà, Đà Nẵng',
    typeId: TYPE.outdoor,
    lat: 16.0885,
    lng: 108.2652,
    avgRating: 4.8,
    totalReview: 890,
    popularityScore: 0.87,
    priceLevel: 1,
  },
  // Hà Nội
  {
    externalId: 'tb-loc-hn-hoan-kiem',
    name: 'Hồ Hoàn Kiếm',
    address: 'Hoàn Kiếm, Hà Nội',
    typeId: TYPE.attraction,
    lat: 21.0285,
    lng: 105.8522,
    avgRating: 4.7,
    totalReview: 3200,
    popularityScore: 0.99,
    priceLevel: 1,
  },
  {
    externalId: 'tb-loc-hn-train-street',
    name: 'Phố cổ Hà Nội',
    address: 'Hoàn Kiếm, Hà Nội',
    typeId: TYPE.attraction,
    lat: 21.0335,
    lng: 105.8495,
    avgRating: 4.5,
    totalReview: 2100,
    popularityScore: 0.93,
    priceLevel: 1,
  },
  {
    externalId: 'tb-loc-hn-bun-cha-huong-lien',
    name: 'Bún Chả Hương Liên',
    address: '24 Lê Văn Hưu, Hai Bà Trưng, Hà Nội',
    typeId: TYPE.restaurant,
    lat: 21.0178,
    lng: 105.8542,
    avgRating: 4.4,
    totalReview: 890,
    popularityScore: 0.86,
    priceLevel: 1,
  },
  {
    externalId: 'tb-loc-hn-egg-coffee',
    name: 'Cà Phê Giang',
    address: '39 Nguyễn Hữu Huân, Hoàn Kiếm, Hà Nội',
    typeId: TYPE.cafe,
    lat: 21.0342,
    lng: 105.8531,
    avgRating: 4.6,
    totalReview: 760,
    popularityScore: 0.84,
    priceLevel: 1,
  },
  {
    externalId: 'tb-loc-hn-west-lake',
    name: 'Hồ Tây',
    address: 'Tây Hồ, Hà Nội',
    typeId: TYPE.nature,
    lat: 21.0558,
    lng: 105.8215,
    avgRating: 4.5,
    totalReview: 1120,
    popularityScore: 0.88,
    priceLevel: 1,
  },
  {
    externalId: 'tb-loc-hn-temple-literature',
    name: 'Văn Miếu Quốc Tử Giám',
    address: 'Đống Đa, Hà Nội',
    typeId: TYPE.attraction,
    lat: 21.0278,
    lng: 105.8355,
    avgRating: 4.6,
    totalReview: 1450,
    popularityScore: 0.91,
    priceLevel: 2,
  },
  // TP.HCM
  {
    externalId: 'tb-loc-hcm-ben-thanh',
    name: 'Chợ Bến Thành',
    address: 'Quận 1, TP.HCM',
    typeId: TYPE.shopping,
    lat: 10.7725,
    lng: 106.698,
    avgRating: 4.2,
    totalReview: 2800,
    popularityScore: 0.95,
    priceLevel: 2,
  },
  {
    externalId: 'tb-loc-hcm-notre-dame',
    name: 'Nhà thờ Đức Bà Sài Gòn',
    address: 'Quận 1, TP.HCM',
    typeId: TYPE.attraction,
    lat: 10.7798,
    lng: 106.699,
    avgRating: 4.5,
    totalReview: 1900,
    popularityScore: 0.92,
    priceLevel: 1,
  },
  {
    externalId: 'tb-loc-hcm-bitexco',
    name: 'Bitexco Financial Tower',
    address: 'Quận 1, TP.HCM',
    typeId: TYPE.attraction,
    lat: 10.7719,
    lng: 106.7042,
    avgRating: 4.4,
    totalReview: 980,
    popularityScore: 0.85,
    priceLevel: 3,
  },
  {
    externalId: 'tb-loc-hcm-pho-le',
    name: 'Phở Lệ',
    address: '413 Nguyễn Trãi, Quận 5, TP.HCM',
    typeId: TYPE.restaurant,
    lat: 10.7542,
    lng: 106.6598,
    avgRating: 4.3,
    totalReview: 620,
    popularityScore: 0.77,
    priceLevel: 1,
  },
  {
    externalId: 'tb-loc-hcm-landmark81',
    name: 'Landmark 81',
    address: 'Bình Thạnh, TP.HCM',
    typeId: TYPE.attraction,
    lat: 10.7951,
    lng: 106.7219,
    avgRating: 4.6,
    totalReview: 1340,
    popularityScore: 0.9,
    priceLevel: 4,
  },
];

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function resetSeedData() {
  const demoTrips = (await dataSource.query(
    `SELECT id FROM trips WHERE title = @0`,
    [DEMO_TRIP_TITLE],
  )) as Array<{ id: string }>;

  for (const row of demoTrips) {
    await dataSource.query(`DELETE FROM trip_recommendations WHERE trip_id = @0`, [row.id]);
    await dataSource.query(`DELETE FROM trip_stops WHERE trip_day_id IN (SELECT id FROM trip_days WHERE trip_id = @0)`, [
      row.id,
    ]);
    await dataSource.query(`DELETE FROM trip_days WHERE trip_id = @0`, [row.id]);
    await dataSource.query(`DELETE FROM trip_accommodations WHERE trip_id = @0`, [row.id]);
    await dataSource.query(`DELETE FROM trip_members WHERE trip_id = @0`, [row.id]);
    await dataSource.query(`DELETE FROM trips WHERE id = @0`, [row.id]);
  }

  await dataSource.query(
    `DELETE FROM locations WHERE external_source = @0 AND external_id LIKE N'tb-loc-%'`,
    [EXTERNAL_SOURCE],
  );
  console.log('Reset: removed demo trip(s) and tb-loc-* locations');
}

async function upsertLocation(poi: PoiSeed): Promise<string> {
  const existing = (await dataSource.query(
    `SELECT id FROM locations WHERE external_source = @0 AND external_id = @1`,
    [EXTERNAL_SOURCE, poi.externalId],
  )) as Array<{ id: string }>;

  if (existing[0]?.id) {
    await dataSource.query(
      `UPDATE locations SET
        location_type_id = @2, name = @3, address = @4,
        latitude = @5, longitude = @6, status = N'ACTIVE',
        avg_rating = @7, total_review = @8, popularity_score = @9,
        price_level = @10, updated_at = GETUTCDATE()
       WHERE id = @0`,
      [
        existing[0].id,
        poi.externalId,
        poi.typeId,
        poi.name,
        poi.address,
        poi.lat,
        poi.lng,
        poi.avgRating,
        poi.totalReview,
        poi.popularityScore,
        poi.priceLevel ?? null,
      ],
    );
    return existing[0].id;
  }

  const id = randomUUID();
  await dataSource.query(
    `INSERT INTO locations (
      id, location_type_id, name, address, latitude, longitude,
      status, source_type, external_source, external_id,
      avg_rating, total_review, popularity_score, price_level
    ) VALUES (
      @0, @1, @2, @3, @4, @5,
      N'ACTIVE', N'MANUAL', @6, @7,
      @8, @9, @10, @11
    )`,
    [
      id,
      poi.typeId,
      poi.name,
      poi.address,
      poi.lat,
      poi.lng,
      EXTERNAL_SOURCE,
      poi.externalId,
      poi.avgRating,
      poi.totalReview,
      poi.popularityScore,
      poi.priceLevel ?? null,
    ],
  );
  return id;
}

async function seedDemoTrip(userId: string, hotelLocationId: string, hotelLat: number, hotelLng: number) {
  const existing = (await dataSource.query(`SELECT id FROM trips WHERE title = @0`, [DEMO_TRIP_TITLE])) as Array<{
    id: string;
  }>;
  if (existing[0]?.id) {
    console.log(`Demo trip already exists: ${DEMO_TRIP_TITLE}`);
    return existing[0].id;
  }

  const start = new Date();
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 4);

  const tripId = randomUUID();
  const accomId = randomUUID();
  const memberId = randomUUID();

  await dataSource.query(
    `INSERT INTO trips (
      id, user_id, title, description, destination_name,
      start_date, end_date, status, is_public, total_budget
    ) VALUES (
      @0, @1, @2, N'Chuyến đi demo để thử gợi ý địa điểm quanh khách sạn Furama.',
      N'Đà Nẵng', @3, @4, N'PLANNING', 0, 8000000
    )`,
    [tripId, userId, DEMO_TRIP_TITLE, formatDate(start), formatDate(end)],
  );

  await dataSource.query(
    `INSERT INTO trip_members (id, trip_id, user_id, role, status, joined_at)
     VALUES (@0, @1, @2, N'OWNER', N'ACCEPTED', GETUTCDATE())`,
    [memberId, tripId, userId],
  );

  await dataSource.query(
    `INSERT INTO trip_accommodations (
      id, trip_id, location_id, check_in, check_out,
      room_type, price_per_night, is_primary
    ) VALUES (
      @0, @1, @2, @3, @4, N'Deluxe Ocean View', 3200000, 1
    )`,
    [accomId, tripId, hotelLocationId, formatDate(start), formatDate(end)],
  );

  const locRows = (await dataSource.query(
    `SELECT l.id, l.latitude, l.longitude, l.avg_rating, l.total_review, l.popularity_score, l.price_level, lt.code AS type_code
     FROM locations l
     LEFT JOIN location_types lt ON lt.id = l.location_type_id
     WHERE l.status = N'ACTIVE' AND l.external_source = @0`,
    [EXTERNAL_SOURCE],
  )) as Array<{
    id: string;
    latitude: string;
    longitude: string;
    avg_rating: string;
    total_review: number;
    popularity_score: string;
    price_level: number | null;
    type_code: string | null;
  }>;

  const days = Math.max(1, (end.getTime() - start.getTime()) / 86400000 + 1);
  const tripDailyBudget = 8000000 / days;

  const scored: { id: string; score: number; distanceKm: number }[] = [];
  for (const loc of locRows) {
    if (loc.id === hotelLocationId) continue;
    const lat2 = Number(loc.latitude);
    const lng2 = Number(loc.longitude);
    const distanceKm = haversineKm(hotelLat, hotelLng, lat2, lng2);
    if (distanceKm > 10) continue;
    const score = computeRecommendationScore({
      distanceKm,
      avgRating: Number(loc.avg_rating),
      totalReview: loc.total_review,
      popularityScore: Number(loc.popularity_score),
      categoryAlreadyInTrip: 0,
      priceLevel: loc.price_level,
      tripDailyBudget,
      lastReviewMonthsAgo: null,
    });
    scored.push({ id: loc.id, score, distanceKm });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 50);
  const now = new Date();

  for (const item of top) {
    await dataSource.query(
      `INSERT INTO trip_recommendations (
        id, trip_id, location_id, based_on_accommodation_id,
        score, distance_km, generated_at
      ) VALUES (
        @0, @1, @2, @3, @4, @5, @6
      )`,
      [
        randomUUID(),
        tripId,
        item.id,
        accomId,
        item.score.toFixed(4),
        item.distanceKm.toFixed(2),
        now,
      ],
    );
  }

  console.log(`Created demo trip "${DEMO_TRIP_TITLE}" with ${top.length} recommendations`);
  return tripId;
}

async function main() {
  const reset = process.env.LOCATIONS_SEED_RESET === '1' || process.env.LOCATIONS_SEED_RESET === 'true';
  const skipTrip = process.env.LOCATIONS_SEED_SKIP_TRIP === '1' || process.env.LOCATIONS_SEED_SKIP_TRIP === 'true';
  const userEmail = process.env.LOCATIONS_SEED_EMAIL ?? DEFAULT_USER_EMAIL;

  await dataSource.initialize();

  if (reset) {
    await resetSeedData();
  }

  let inserted = 0;
  let updated = 0;
  let hotelId = '';
  let hotelLat = 0;
  let hotelLng = 0;

  for (const poi of POIS) {
    const existing = (await dataSource.query(
      `SELECT id FROM locations WHERE external_source = @0 AND external_id = @1`,
      [EXTERNAL_SOURCE, poi.externalId],
    )) as Array<{ id: string }>;

    const id = await upsertLocation(poi);
    if (existing[0]?.id) updated += 1;
    else inserted += 1;

    if (poi.externalId === 'tb-loc-dn-hotel-furama') {
      hotelId = id;
      hotelLat = poi.lat;
      hotelLng = poi.lng;
    }
  }

  console.log(`Locations: ${inserted} inserted, ${updated} updated (${POIS.length} total POIs)`);

  if (!skipTrip && hotelId) {
    const userRows = (await dataSource.query(
      `SELECT u.id FROM users u INNER JOIN member_profiles mp ON mp.user_id = u.id WHERE mp.email = @0`,
      [userEmail],
    )) as Array<{ id: string }>;
    const userId = userRows[0]?.id;
    if (!userId) {
      throw new Error(`No user for ${userEmail}. Run npm run seed:user first.`);
    }
    await seedDemoTrip(userId, hotelId, hotelLat, hotelLng);
  }

  await dataSource.destroy();
}

main()
  .then(() => console.log('Seed locations completed'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
