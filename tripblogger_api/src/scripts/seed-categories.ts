import 'dotenv/config';
import 'reflect-metadata';
import dataSource from '../config/db/typeorm.datasource';

const CATEGORIES = [
  'Outdoor Gear',
  'Travel Tech',
  'Luggage & Bags',
  'Clothing',
  'Accessories',
  'Camping',
  'Photography',
  'Books & Maps',
];

async function main() {
  await dataSource.initialize();
  for (const name of CATEGORIES) {
    const exists = await dataSource.query(`SELECT 1 FROM categories WHERE name = @0`, [name]);
    if (exists.length === 0) {
      await dataSource.query(`INSERT INTO categories (id, name) VALUES (NEWID(), @0)`, [name]);
      console.log(`Seeded category: ${name}`);
    } else {
      console.log(`Category already exists: ${name}`);
    }
  }
  await dataSource.destroy();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
