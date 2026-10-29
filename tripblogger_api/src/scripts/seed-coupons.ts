import 'dotenv/config';
import 'reflect-metadata';
import dataSource from '../config/db/typeorm.datasource';

/**
 * Seeds demo coupons for checkout testing.
 *
 * Prerequisites: none (categories/products optional for CATEGORY/PRODUCT coupons)
 *
 * Env:
 * - COUPONS_SEED_RESET=1 — delete demo coupons whose code starts with TB-
 */
type CouponSeed = {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrderValue: number | null;
  maxDiscountAmount: number | null;
  maxUses: number | null;
  appliesTo: 'ALL' | 'CATEGORY' | 'PRODUCT';
  appliesToIdsJson: string | null;
  expiresInDays: number;
};

const COUPONS: CouponSeed[] = [
  {
    id: 'c2222222-2222-4222-8222-222222222201',
    code: 'TB-WELCOME10',
    type: 'PERCENTAGE',
    value: 10,
    minOrderValue: 100000,
    maxDiscountAmount: 80000,
    maxUses: 1000,
    appliesTo: 'ALL',
    appliesToIdsJson: null,
    expiresInDays: 365,
  },
  {
    id: 'c2222222-2222-4222-8222-222222222202',
    code: 'TB-FLAT50K',
    type: 'FIXED',
    value: 50000,
    minOrderValue: 300000,
    maxDiscountAmount: null,
    maxUses: 500,
    appliesTo: 'ALL',
    appliesToIdsJson: null,
    expiresInDays: 180,
  },
  {
    id: 'c2222222-2222-4222-8222-222222222203',
    code: 'TB-FREESHIP',
    type: 'FIXED',
    value: 30000,
    minOrderValue: 200000,
    maxDiscountAmount: null,
    maxUses: null,
    appliesTo: 'ALL',
    appliesToIdsJson: null,
    expiresInDays: 90,
  },
  {
    id: 'c2222222-2222-4222-8222-222222222204',
    code: 'TB-OUTDOOR15',
    type: 'PERCENTAGE',
    value: 15,
    minOrderValue: 250000,
    maxDiscountAmount: 120000,
    maxUses: 200,
    appliesTo: 'CATEGORY',
    appliesToIdsJson: null,
    expiresInDays: 120,
  },
];

async function resolveOutdoorCategoryId(): Promise<string | null> {
  const rows = (await dataSource.query(`SELECT id FROM categories WHERE name = @0`, ['Outdoor Gear'])) as Array<{
    id: string;
  }>;
  return rows[0]?.id ?? null;
}

async function resetCoupons() {
  const del = await dataSource.query(`DELETE FROM coupons WHERE code LIKE N'TB-%'`);
  console.log(`Reset: removed demo coupons (driver raw): ${JSON.stringify(del)}`);
}

async function upsertCoupon(seed: CouponSeed, outdoorCategoryId: string | null): Promise<'inserted' | 'updated' | 'skipped'> {
  let appliesToIdsJson = seed.appliesToIdsJson;
  if (seed.code === 'TB-OUTDOOR15' && outdoorCategoryId) {
    appliesToIdsJson = JSON.stringify([outdoorCategoryId]);
  }

  const existing = (await dataSource.query(`SELECT id FROM coupons WHERE code = @0`, [seed.code])) as Array<{ id: string }>;
  if (existing.length > 0) {
    await dataSource.query(
      `UPDATE coupons SET
        type = @1, value = @2, min_order_value = @3, max_discount_amount = @4,
        max_uses = @5, applies_to = @6, applies_to_ids_json = @7,
        status = N'ACTIVE', active_at = SYSUTCDATETIME(), expires_at = DATEADD(day, @8, SYSUTCDATETIME())
       WHERE code = @0`,
      [
        seed.code,
        seed.type,
        seed.value,
        seed.minOrderValue,
        seed.maxDiscountAmount,
        seed.maxUses,
        seed.appliesTo,
        appliesToIdsJson,
        seed.expiresInDays,
      ],
    );
    return 'updated';
  }

  await dataSource.query(
    `INSERT INTO coupons (
      id, code, type, value, min_order_value, max_discount_amount,
      max_uses, used_count, applies_to, applies_to_ids_json,
      status, active_at, expires_at
    ) VALUES (
      @0, @1, @2, @3, @4, @5,
      @6, 0, @7, @8,
      N'ACTIVE', SYSUTCDATETIME(), DATEADD(day, @9, SYSUTCDATETIME())
    )`,
    [
      seed.id,
      seed.code,
      seed.type,
      seed.value,
      seed.minOrderValue,
      seed.maxDiscountAmount,
      seed.maxUses,
      seed.appliesTo,
      appliesToIdsJson,
      seed.expiresInDays,
    ],
  );
  return 'inserted';
}

async function main() {
  const reset = process.env.COUPONS_SEED_RESET === '1' || process.env.COUPONS_SEED_RESET === 'true';

  await dataSource.initialize();

  if (reset) {
    await resetCoupons();
  }

  const outdoorCategoryId = await resolveOutdoorCategoryId();
  if (!outdoorCategoryId) {
    console.log('Category "Outdoor Gear" not found — TB-OUTDOOR15 will seed without category filter.');
  }

  let inserted = 0;
  let updated = 0;
  for (const coupon of COUPONS) {
    const result = await upsertCoupon(coupon, outdoorCategoryId);
    if (result === 'inserted') {
      inserted += 1;
      console.log(`Seeded coupon: ${coupon.code}`);
    } else {
      updated += 1;
      console.log(`Updated coupon: ${coupon.code}`);
    }
  }

  await dataSource.destroy();
  console.log(`Coupons seed done. inserted=${inserted} updated=${updated} total=${COUPONS.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
