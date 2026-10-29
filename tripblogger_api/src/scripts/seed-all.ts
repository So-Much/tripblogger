import { spawnSync } from 'child_process';
import { join } from 'path';

/**
 * Runs all seed scripts in dependency order.
 *
 * Usage: npm run seed:all
 *
 * Individual seeds can still be run separately via npm run seed:<name>.
 */
const SEED_SCRIPTS = [
  'seed-roles-statuses.ts',
  'seed-categories.ts',
  'seed-compositions.ts',
  'seed-user.ts',
  'seed-buyer-user.ts',
  'seed-posts.ts',
  'seed-commerce-products.ts',
  'seed-coupons.ts',
  'seed-locations.ts',
] as const;

const apiRoot = join(__dirname, '..', '..');

function runSeed(script: string) {
  console.log(`\n=== Running ${script} ===\n`);
  const result = spawnSync('npx', ['ts-node', join('src', 'scripts', script)], {
    cwd: apiRoot,
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });

  if (result.status !== 0) {
    throw new Error(`Seed failed: ${script} (exit ${result.status ?? 'unknown'})`);
  }
}

function main() {
  console.log('TripBlogger — seed all data');
  console.log(`Scripts: ${SEED_SCRIPTS.length}`);

  for (const script of SEED_SCRIPTS) {
    runSeed(script);
  }

  console.log('\n=== All seeds completed successfully ===\n');
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
