import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drop all trip-domain tables and trip-related columns.
 * Keeps `saved_locations` (moved under locations module).
 */
export class DropTripTables1762800000000 implements MigrationInterface {
  name = 'DropTripTables1762800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop inbound FKs from non-trip tables / cross-refs that block DROP TABLE
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_location_reviews_trip_stops')
        ALTER TABLE location_reviews DROP CONSTRAINT FK_location_reviews_trip_stops;
    `);
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_location_reviews_trips')
        ALTER TABLE location_reviews DROP CONSTRAINT FK_location_reviews_trips;
    `);
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_trips_templates')
        ALTER TABLE trips DROP CONSTRAINT FK_trips_templates;
    `);
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_trips_destinations')
        ALTER TABLE trips DROP CONSTRAINT FK_trips_destinations;
    `);
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_locations_destinations')
        ALTER TABLE locations DROP CONSTRAINT FK_locations_destinations;
    `);
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_locations_destination_featured' AND object_id = OBJECT_ID('locations'))
        DROP INDEX IX_locations_destination_featured ON locations;
    `);
    // trip_recommendations → trip_accommodations (NO ACTION)
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_trip_rec_accom')
        ALTER TABLE trip_recommendations DROP CONSTRAINT FK_trip_rec_accom;
    `);
    // event_blocks → trip_days (NO ACTION)
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_event_blocks_days')
        ALTER TABLE event_blocks DROP CONSTRAINT FK_event_blocks_days;
    `);
    // trip_check_ins → event_blocks (NO ACTION)
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_trip_check_ins_blocks')
        ALTER TABLE trip_check_ins DROP CONSTRAINT FK_trip_check_ins_blocks;
    `);

    // Child tables first (FK order)
    await queryRunner.query(`
      IF OBJECT_ID('trip_check_in_media', 'U') IS NOT NULL DROP TABLE trip_check_in_media;
    `);
    await queryRunner.query(`
      IF OBJECT_ID('trip_check_ins', 'U') IS NOT NULL DROP TABLE trip_check_ins;
    `);
    await queryRunner.query(`
      IF OBJECT_ID('event_blocks', 'U') IS NOT NULL DROP TABLE event_blocks;
    `);
    await queryRunner.query(`
      IF OBJECT_ID('template_blocks', 'U') IS NOT NULL DROP TABLE template_blocks;
    `);
    await queryRunner.query(`
      IF OBJECT_ID('trip_recommendations', 'U') IS NOT NULL DROP TABLE trip_recommendations;
    `);
    await queryRunner.query(`
      IF OBJECT_ID('trip_posts', 'U') IS NOT NULL DROP TABLE trip_posts;
    `);
    await queryRunner.query(`
      IF OBJECT_ID('trip_stops', 'U') IS NOT NULL DROP TABLE trip_stops;
    `);
    await queryRunner.query(`
      IF OBJECT_ID('trip_days', 'U') IS NOT NULL DROP TABLE trip_days;
    `);
    await queryRunner.query(`
      IF OBJECT_ID('trip_accommodations', 'U') IS NOT NULL DROP TABLE trip_accommodations;
    `);
    await queryRunner.query(`
      IF OBJECT_ID('trip_members', 'U') IS NOT NULL DROP TABLE trip_members;
    `);
    // Drop trips before trip_templates (trips.template_id referenced templates)
    await queryRunner.query(`
      IF OBJECT_ID('trips', 'U') IS NOT NULL DROP TABLE trips;
    `);
    await queryRunner.query(`
      IF OBJECT_ID('trip_templates', 'U') IS NOT NULL DROP TABLE trip_templates;
    `);
    await queryRunner.query(`
      IF OBJECT_ID('destinations', 'U') IS NOT NULL DROP TABLE destinations;
    `);

    // Drop trip-related columns on locations (keep featured_rank / duration / slot / vibe)
    await queryRunner.query(`
      IF COL_LENGTH('locations', 'destination_id') IS NOT NULL
        ALTER TABLE locations DROP COLUMN destination_id;
    `);

    // Drop trip columns on location_reviews
    await queryRunner.query(`
      IF COL_LENGTH('location_reviews', 'trip_id') IS NOT NULL
        ALTER TABLE location_reviews DROP COLUMN trip_id;
    `);
    await queryRunner.query(`
      IF COL_LENGTH('location_reviews', 'trip_stop_id') IS NOT NULL
        ALTER TABLE location_reviews DROP COLUMN trip_stop_id;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Minimal recreate so revert is possible; schema is not identical to historical migrations.
    await queryRunner.query(`
      IF COL_LENGTH('location_reviews', 'trip_id') IS NULL
        ALTER TABLE location_reviews ADD trip_id uniqueidentifier NULL;
    `);
    await queryRunner.query(`
      IF COL_LENGTH('location_reviews', 'trip_stop_id') IS NULL
        ALTER TABLE location_reviews ADD trip_stop_id uniqueidentifier NULL;
    `);

    await queryRunner.query(`
      IF OBJECT_ID('destinations', 'U') IS NULL
      CREATE TABLE destinations (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        code nvarchar(32) NOT NULL,
        name nvarchar(255) NOT NULL,
        centroid_lat decimal(10,8) NOT NULL,
        centroid_lng decimal(11,8) NOT NULL,
        status nvarchar(20) NOT NULL DEFAULT 'ACTIVE',
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT UQ_destinations_code UNIQUE (code)
      );
    `);

    await queryRunner.query(`
      IF COL_LENGTH('locations', 'destination_id') IS NULL
        ALTER TABLE locations ADD destination_id uniqueidentifier NULL;
    `);

    await queryRunner.query(`
      IF OBJECT_ID('trips', 'U') IS NULL
      CREATE TABLE trips (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        user_id uniqueidentifier NOT NULL,
        title nvarchar(255) NOT NULL,
        description nvarchar(max) NULL,
        destination_name nvarchar(255) NULL,
        start_date date NOT NULL,
        end_date date NOT NULL,
        status nvarchar(50) NOT NULL DEFAULT 'DRAFT',
        is_public bit NOT NULL DEFAULT 0,
        cover_media_id uniqueidentifier NULL,
        total_budget decimal(15,2) NULL,
        actual_budget decimal(15,2) NULL,
        notes nvarchar(max) NULL,
        is_favorite bit NOT NULL DEFAULT 0,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_trips_users_restore FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      IF OBJECT_ID('trip_members', 'U') IS NULL
      CREATE TABLE trip_members (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        trip_id uniqueidentifier NOT NULL,
        user_id uniqueidentifier NOT NULL,
        role nvarchar(20) NOT NULL DEFAULT 'VIEWER',
        status nvarchar(20) NOT NULL DEFAULT 'PENDING',
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_trip_members_trips_restore FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      IF OBJECT_ID('trip_days', 'U') IS NULL
      CREATE TABLE trip_days (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        trip_id uniqueidentifier NOT NULL,
        day_number int NOT NULL,
        date date NOT NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_trip_days_trips_restore FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      IF OBJECT_ID('trip_stops', 'U') IS NULL
      CREATE TABLE trip_stops (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        trip_day_id uniqueidentifier NOT NULL,
        location_id uniqueidentifier NULL,
        title nvarchar(255) NOT NULL,
        order_index int NOT NULL DEFAULT 0,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_trip_stops_days_restore FOREIGN KEY (trip_day_id) REFERENCES trip_days(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      IF OBJECT_ID('trip_accommodations', 'U') IS NULL
      CREATE TABLE trip_accommodations (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        trip_id uniqueidentifier NOT NULL,
        location_id uniqueidentifier NULL,
        check_in date NOT NULL,
        check_out date NOT NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_trip_accom_trips_restore FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      IF OBJECT_ID('trip_posts', 'U') IS NULL
      CREATE TABLE trip_posts (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        trip_id uniqueidentifier NOT NULL,
        post_id uniqueidentifier NOT NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_trip_posts_trips_restore FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      IF OBJECT_ID('trip_recommendations', 'U') IS NULL
      CREATE TABLE trip_recommendations (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        trip_id uniqueidentifier NOT NULL,
        location_id uniqueidentifier NOT NULL,
        score decimal(10,4) NOT NULL DEFAULT 0,
        generated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_trip_recs_trips_restore FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      IF OBJECT_ID('trip_templates', 'U') IS NULL
      CREATE TABLE trip_templates (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        destination_id uniqueidentifier NOT NULL,
        title nvarchar(255) NOT NULL,
        night_count int NOT NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_trip_templates_dest_restore FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE NO ACTION
      );
    `);

    await queryRunner.query(`
      IF OBJECT_ID('template_blocks', 'U') IS NULL
      CREATE TABLE template_blocks (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        template_id uniqueidentifier NOT NULL,
        location_id uniqueidentifier NOT NULL,
        order_index int NOT NULL DEFAULT 0,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_template_blocks_tpl_restore FOREIGN KEY (template_id) REFERENCES trip_templates(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      IF OBJECT_ID('event_blocks', 'U') IS NULL
      CREATE TABLE event_blocks (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        trip_id uniqueidentifier NOT NULL,
        location_id uniqueidentifier NULL,
        day_index int NOT NULL DEFAULT 0,
        order_index int NOT NULL DEFAULT 0,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_event_blocks_trips_restore FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      IF OBJECT_ID('trip_check_ins', 'U') IS NULL
      CREATE TABLE trip_check_ins (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        trip_id uniqueidentifier NOT NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_trip_check_ins_trips_restore FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      IF OBJECT_ID('trip_check_in_media', 'U') IS NULL
      CREATE TABLE trip_check_in_media (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        trip_check_in_id uniqueidentifier NOT NULL,
        media_id uniqueidentifier NOT NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_trip_check_in_media_restore FOREIGN KEY (trip_check_in_id) REFERENCES trip_check_ins(id) ON DELETE CASCADE
      );
    `);
  }
}
