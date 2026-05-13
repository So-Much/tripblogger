import 'dotenv/config';
import 'reflect-metadata';
import dataSource from '../config/db/typeorm.datasource';
import { DEFAULT_ANALYTICS_JSON } from '../modules/commerce/constants';

/**
 * Seeds many published demo products for the TripBlogger marketplace (SQL Server).
 *
 * Prerequisites: `npm run seed:roles-statuses`, `npm run seed:categories`, `npm run seed:user`
 *
 * Env:
 * - COMMERCE_SEED_EMAIL (default: same email as seed-user.ts)
 * - COMMERCE_SEED_COUNT (default: 48, max 80)
 * - COMMERCE_SEED_RESET=1 — delete existing rows whose slug starts with `tb-seed-` for this seller, then re-seed
 */
const DEFAULT_SELLER_EMAIL = 'minhnhieu50@gmail.com';

const CATEGORY_NAMES = [
  'Outdoor Gear',
  'Travel Tech',
  'Luggage & Bags',
  'Clothing',
  'Accessories',
  'Camping',
  'Photography',
  'Books & Maps',
];

const PREFIXES = ['Pro', 'Compact', 'Ultra', 'Smart', 'Travel', 'Mini', 'Premium', 'Lite', 'Air', 'Urban'];
const NOUNS = [
  'Backpack',
  'Daypack',
  'Packing Cubes',
  'Neck Pillow',
  'Adapter Kit',
  'Power Bank',
  'Cable Organizer',
  'RFID Wallet',
  'Sunglasses Case',
  'Water Bottle',
  'Quick-dry Towel',
  'Rain Cover',
  'Dry Bag',
  'Headlamp',
  'Camping Mug',
  'Sleeping Liner',
  'Trekking Poles',
  'First-aid Pouch',
  'Portable Speaker',
  'Noise-cancelling Buds',
  'Lens Cloth Kit',
  'SD Card Case',
  'Trip Journal',
  'City Map Set',
  'Luggage Scale',
  'TSA Lock Set',
  'Compression Sack',
  'Shoe Bag',
  'Toiletry Bag',
  'Tech Pouch',
  'Tablet Sleeve',
  'Laptop Sleeve',
  'Carry-on Cover',
  'Luggage Tag Set',
  'Travel Pillow',
  'Eye Mask',
  'Earplugs Pack',
  'Portable Steamer',
  'Foldable Hanger',
  'Laundry Bag',
  'Document Holder',
  'Passport Wallet',
  'SIM Card Holder',
  'USB-C Hub',
  'Wireless Charger',
  'Action Mount',
  'Mini Tripod',
  'LED Clip Light',
  'Insulated Bottle',
  'Cooling Towel',
  'UV Arm Sleeves',
  'Running Belt',
  'Hiking Socks',
  'Merino Tee',
  'Travel Hoodie',
  'Packable Jacket',
];

function mediaJsonForSeed(seed: number): string {
  const base = `https://picsum.photos/seed/tbcommerce${seed}`;
  const item = {
    type: 'image',
    kind: 'image',
    url: `${base}/720/720`,
    thumbnailUrl: `${base}/360/360`,
    previewUrl: `${base}/720/720`,
    originalUrl: `${base}/1080/1080`,
  };
  return JSON.stringify([item]);
}

async function main() {
  const sellerEmail = process.env.COMMERCE_SEED_EMAIL ?? DEFAULT_SELLER_EMAIL;
  const count = Math.min(80, Math.max(1, Number(process.env.COMMERCE_SEED_COUNT ?? 48) || 48));
  const reset = process.env.COMMERCE_SEED_RESET === '1' || process.env.COMMERCE_SEED_RESET === 'true';

  await dataSource.initialize();

  const sellerRows = (await dataSource.query(
    `SELECT u.id AS id FROM users u
     INNER JOIN member_profiles mp ON mp.user_id = u.id
     WHERE mp.email = @0`,
    [sellerEmail],
  )) as Array<{ id: string }>;
  const sellerId = sellerRows[0]?.id as string | undefined;
  if (!sellerId) {
    await dataSource.destroy();
    throw new Error(`No member user found for COMMERCE_SEED_EMAIL=${sellerEmail}. Run npm run seed:user first.`);
  }

  const catRows = (await dataSource.query(
    `SELECT id, name FROM categories WHERE name IN (${CATEGORY_NAMES.map((_, i) => `@${i}`).join(', ')})`,
    CATEGORY_NAMES,
  )) as Array<{ id: string; name: string }>;
  const byName = new Map(catRows.map((r: { id: string; name: string }) => [r.name, r.id]));
  for (const name of CATEGORY_NAMES) {
    if (!byName.has(name)) {
      await dataSource.destroy();
      throw new Error(`Missing category "${name}". Run npm run seed:categories first.`);
    }
  }

  if (reset) {
    const del = await dataSource.query(
      `DELETE FROM products_commerce WHERE seller_id = @0 AND slug LIKE N'tb-seed-%'`,
      [sellerId],
    );
    console.log(`Reset: removed demo products (driver raw): ${JSON.stringify(del)}`);
  }

  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < count; i++) {
    const slug = `tb-seed-${String(i + 1).padStart(3, '0')}`;
    const exists = await dataSource.query(`SELECT 1 AS x FROM products_commerce WHERE slug = @0`, [slug]);
    if (exists.length > 0) {
      skipped += 1;
      continue;
    }

    const catName = CATEGORY_NAMES[i % CATEGORY_NAMES.length];
    const categoryId = byName.get(catName)!;
    const title = `${PREFIXES[i % PREFIXES.length]} ${NOUNS[i % NOUNS.length]} · ${catName}`;
    const price = 49000 + (i % 17) * 37000 + (i % 5) * 12000;
    const stock = 3 + (i % 40);
    const productType = i % 5 === 0 ? 'SECONDHAND' : 'NEW';
    const description = `<p><strong>${title}</strong> — hàng demo seed cho sàn TripBlogger. Đổi trả trong 7 ngày (demo).</p><p>SKU: ${slug}</p>`;
    const tagsJson = JSON.stringify(['tripblogger-demo', 'seed', catName.toLowerCase().replace(/\s+/g, '-')]);
    const mediaJson = mediaJsonForSeed(1000 + i);

    await dataSource.query(
      `INSERT INTO products_commerce (
        id, seller_id, category_id, title, slug, tags_json, media_json, description,
        price, product_type, stock, stock_unit, status, analytics_json, published_at
      ) VALUES (
        NEWID(), @0, @1, @2, @3, @4, @5, @6,
        @7, @8, @9, N'cái', N'PUBLISHED', @10, SYSUTCDATETIME()
      )`,
      [
        sellerId,
        categoryId,
        title,
        slug,
        tagsJson,
        mediaJson,
        description,
        price,
        productType,
        stock,
        DEFAULT_ANALYTICS_JSON,
      ],
    );
    inserted += 1;
  }

  await dataSource.destroy();
  console.log(`Commerce seed done. inserted=${inserted} skipped=${skipped} seller=${sellerEmail} totalRequested=${count}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
