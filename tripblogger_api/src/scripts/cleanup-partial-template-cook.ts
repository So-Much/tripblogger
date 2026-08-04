import 'dotenv/config';
import dataSource from '../config/db/typeorm.datasource';

/**
 * Cleans a partially-applied Template-Cook migration so it can be re-run.
 * Safe to run if tables/columns are missing.
 */
async function main() {
  await dataSource.initialize();
  const qr = dataSource.createQueryRunner();
  await qr.connect();

  const dropTables = [
    'trip_check_in_media',
    'trip_check_ins',
    'event_blocks',
    'template_blocks',
    'trip_templates',
    'destinations',
  ];

  for (const t of dropTables) {
    try {
      await qr.query(`DROP TABLE IF EXISTS ${t}`);
      console.log('dropped', t);
    } catch (e) {
      console.log('drop skip', t, (e as Error).message);
    }
  }

  const statements = [
    `IF COL_LENGTH('locations','destination_id') IS NOT NULL
     BEGIN
       IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_locations_destinations')
         ALTER TABLE locations DROP CONSTRAINT FK_locations_destinations;
       IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_locations_slot_type')
         ALTER TABLE locations DROP CONSTRAINT CK_locations_slot_type;
       IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_locations_destination_featured' AND object_id = OBJECT_ID('locations'))
         DROP INDEX IX_locations_destination_featured ON locations;
       ALTER TABLE locations DROP COLUMN destination_id, featured_rank, default_duration_min, slot_type, vibe_tags;
     END`,
    `IF COL_LENGTH('trips','destination_id') IS NOT NULL
     BEGIN
       IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_trips_edit_mode')
         ALTER TABLE trips DROP CONSTRAINT CK_trips_edit_mode;
       IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_trips_templates')
         ALTER TABLE trips DROP CONSTRAINT FK_trips_templates;
       IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_trips_destinations')
         ALTER TABLE trips DROP CONSTRAINT FK_trips_destinations;
       IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_trips_edit_mode')
         ALTER TABLE trips DROP CONSTRAINT DF_trips_edit_mode;
       ALTER TABLE trips DROP COLUMN destination_id, template_id, night_count, edit_mode, pick_location_ids;
     END`,
    `IF COL_LENGTH('trip_accommodations','mode') IS NOT NULL
     BEGIN
       IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_trip_accom_vibe')
         ALTER TABLE trip_accommodations DROP CONSTRAINT CK_trip_accom_vibe;
       IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_trip_accom_mode')
         ALTER TABLE trip_accommodations DROP CONSTRAINT CK_trip_accom_mode;
       IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_trip_accom_placeholder')
         ALTER TABLE trip_accommodations DROP CONSTRAINT DF_trip_accom_placeholder;
       IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_trip_accom_mode')
         ALTER TABLE trip_accommodations DROP CONSTRAINT DF_trip_accom_mode;
       ALTER TABLE trip_accommodations DROP COLUMN mode, vibe, is_placeholder;
     END`,
    `IF COL_LENGTH('trip_posts','assemble_kind') IS NOT NULL
     BEGIN
       IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_trip_posts_assemble_kind')
         ALTER TABLE trip_posts DROP CONSTRAINT CK_trip_posts_assemble_kind;
       ALTER TABLE trip_posts DROP COLUMN assemble_kind;
     END`,
    `DELETE FROM migrations WHERE name = 'TripTemplateCook1762700000000'`,
  ];

  for (const sql of statements) {
    try {
      await qr.query(sql);
      console.log('ok statement');
    } catch (e) {
      console.log('statement skip', (e as Error).message);
    }
  }

  await qr.release();
  await dataSource.destroy();
  console.log('cleanup done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
