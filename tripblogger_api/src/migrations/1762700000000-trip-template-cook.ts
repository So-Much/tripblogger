import { MigrationInterface, QueryRunner } from 'typeorm';

export class TripTemplateCook1762700000000 implements MigrationInterface {
  name = 'TripTemplateCook1762700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE destinations (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        code nvarchar(32) NOT NULL,
        name nvarchar(255) NOT NULL,
        centroid_lat decimal(10,8) NOT NULL,
        centroid_lng decimal(11,8) NOT NULL,
        status nvarchar(20) NOT NULL DEFAULT 'ACTIVE',
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT UQ_destinations_code UNIQUE (code),
        CONSTRAINT CK_destinations_status CHECK (status IN ('ACTIVE','INACTIVE'))
      );
    `);

    await queryRunner.query(`
      CREATE TABLE trip_templates (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        destination_id uniqueidentifier NOT NULL,
        title nvarchar(255) NOT NULL,
        night_count int NOT NULL,
        style_tags nvarchar(max) NULL,
        summary nvarchar(max) NULL,
        is_published bit NOT NULL DEFAULT 0,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_trip_templates_destinations FOREIGN KEY (destination_id)
          REFERENCES destinations(id) ON DELETE NO ACTION,
        CONSTRAINT CK_trip_templates_night_count CHECK (night_count > 0)
      );
    `);
    await queryRunner.query(`CREATE INDEX IX_trip_templates_destination ON trip_templates (destination_id);`);

    await queryRunner.query(`
      CREATE TABLE template_blocks (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        template_id uniqueidentifier NOT NULL,
        location_id uniqueidentifier NOT NULL,
        suggested_day_hint int NULL,
        order_index int NOT NULL DEFAULT 0,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_template_blocks_templates FOREIGN KEY (template_id)
          REFERENCES trip_templates(id) ON DELETE CASCADE,
        CONSTRAINT FK_template_blocks_locations FOREIGN KEY (location_id)
          REFERENCES locations(id) ON DELETE NO ACTION
      );
    `);
    await queryRunner.query(`CREATE INDEX IX_template_blocks_template ON template_blocks (template_id);`);

    await queryRunner.query(`
      ALTER TABLE locations ADD
        destination_id uniqueidentifier NULL,
        featured_rank int NULL,
        default_duration_min int NULL,
        slot_type nvarchar(20) NULL,
        vibe_tags nvarchar(max) NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE locations ADD CONSTRAINT FK_locations_destinations
        FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE SET NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE locations ADD CONSTRAINT CK_locations_slot_type
        CHECK (slot_type IS NULL OR slot_type IN ('POI','FOOD','STAY'));
    `);
    await queryRunner.query(`CREATE INDEX IX_locations_destination_featured ON locations (destination_id, featured_rank);`);

    await queryRunner.query(`
      ALTER TABLE trips ADD
        destination_id uniqueidentifier NULL,
        template_id uniqueidentifier NULL,
        night_count int NULL,
        edit_mode nvarchar(20) NOT NULL CONSTRAINT DF_trips_edit_mode DEFAULT 'AUTO',
        pick_location_ids nvarchar(max) NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE trips ADD CONSTRAINT FK_trips_destinations
        FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE SET NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE trips ADD CONSTRAINT FK_trips_templates
        FOREIGN KEY (template_id) REFERENCES trip_templates(id) ON DELETE SET NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE trips ADD CONSTRAINT CK_trips_edit_mode
        CHECK (edit_mode IN ('AUTO','MANUAL'));
    `);

    await queryRunner.query(`
      ALTER TABLE trip_accommodations ADD
        mode nvarchar(20) NOT NULL CONSTRAINT DF_trip_accom_mode DEFAULT 'CUSTOM',
        vibe nvarchar(20) NULL,
        is_placeholder bit NOT NULL CONSTRAINT DF_trip_accom_placeholder DEFAULT 0;
    `);
    await queryRunner.query(`
      ALTER TABLE trip_accommodations ADD CONSTRAINT CK_trip_accom_mode
        CHECK (mode IN ('VIBE','CUSTOM'));
    `);
    await queryRunner.query(`
      ALTER TABLE trip_accommodations ADD CONSTRAINT CK_trip_accom_vibe
        CHECK (vibe IS NULL OR vibe IN ('GLAMPING','CENTRAL','HOMESTAY'));
    `);

    await queryRunner.query(`
      ALTER TABLE trip_posts ADD
        assemble_kind nvarchar(32) NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE trip_posts ADD CONSTRAINT CK_trip_posts_assemble_kind
        CHECK (assemble_kind IS NULL OR assemble_kind IN ('BLOG_DRAFT'));
    `);

    await queryRunner.query(`
      CREATE TABLE event_blocks (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        trip_id uniqueidentifier NOT NULL,
        trip_day_id uniqueidentifier NULL,
        order_index int NOT NULL DEFAULT 0,
        location_id uniqueidentifier NULL,
        custom_name nvarchar(255) NULL,
        custom_address nvarchar(max) NULL,
        custom_lat decimal(10,8) NULL,
        custom_lng decimal(11,8) NULL,
        slot_type nvarchar(20) NOT NULL DEFAULT 'POI',
        status nvarchar(20) NOT NULL DEFAULT 'PLANNED',
        source nvarchar(20) NOT NULL DEFAULT 'PICK',
        planned_duration_min int NOT NULL DEFAULT 60,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_event_blocks_trips FOREIGN KEY (trip_id)
          REFERENCES trips(id) ON DELETE CASCADE,
        CONSTRAINT FK_event_blocks_days FOREIGN KEY (trip_day_id)
          REFERENCES trip_days(id) ON DELETE NO ACTION,
        CONSTRAINT FK_event_blocks_locations FOREIGN KEY (location_id)
          REFERENCES locations(id) ON DELETE SET NULL,
        CONSTRAINT CK_event_blocks_slot_type CHECK (slot_type IN ('POI','FOOD','STAY','CUSTOM')),
        CONSTRAINT CK_event_blocks_status CHECK (status IN ('PLANNED','DONE','SKIPPED')),
        CONSTRAINT CK_event_blocks_source CHECK (source IN ('TEMPLATE','PICK','SWAP','MANUAL')),
        CONSTRAINT CK_event_blocks_place CHECK (
          location_id IS NOT NULL OR custom_name IS NOT NULL
        )
      );
    `);
    await queryRunner.query(`CREATE INDEX IX_event_blocks_trip ON event_blocks (trip_id);`);
    await queryRunner.query(`CREATE INDEX IX_event_blocks_day ON event_blocks (trip_day_id);`);

    await queryRunner.query(`
      CREATE TABLE trip_check_ins (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        trip_id uniqueidentifier NOT NULL,
        event_block_id uniqueidentifier NULL,
        checked_in_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        latitude decimal(10,8) NULL,
        longitude decimal(11,8) NULL,
        note nvarchar(max) NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_trip_check_ins_trips FOREIGN KEY (trip_id)
          REFERENCES trips(id) ON DELETE CASCADE,
        CONSTRAINT FK_trip_check_ins_blocks FOREIGN KEY (event_block_id)
          REFERENCES event_blocks(id) ON DELETE NO ACTION
      );
    `);
    await queryRunner.query(`CREATE INDEX IX_trip_check_ins_trip ON trip_check_ins (trip_id);`);

    await queryRunner.query(`
      CREATE TABLE trip_check_in_media (
        check_in_id uniqueidentifier NOT NULL,
        media_id uniqueidentifier NOT NULL,
        order_index int NOT NULL DEFAULT 0,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_trip_check_in_media PRIMARY KEY (check_in_id, media_id),
        CONSTRAINT FK_trip_check_in_media_checkin FOREIGN KEY (check_in_id)
          REFERENCES trip_check_ins(id) ON DELETE CASCADE,
        CONSTRAINT FK_trip_check_in_media_media FOREIGN KEY (media_id)
          REFERENCES media(id) ON DELETE NO ACTION
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS trip_check_in_media;`);
    await queryRunner.query(`DROP TABLE IF EXISTS trip_check_ins;`);
    await queryRunner.query(`DROP TABLE IF EXISTS event_blocks;`);

    await queryRunner.query(`ALTER TABLE trip_posts DROP CONSTRAINT CK_trip_posts_assemble_kind;`);
    await queryRunner.query(`ALTER TABLE trip_posts DROP COLUMN assemble_kind;`);

    await queryRunner.query(`ALTER TABLE trip_accommodations DROP CONSTRAINT CK_trip_accom_vibe;`);
    await queryRunner.query(`ALTER TABLE trip_accommodations DROP CONSTRAINT CK_trip_accom_mode;`);
    await queryRunner.query(`ALTER TABLE trip_accommodations DROP CONSTRAINT DF_trip_accom_placeholder;`);
    await queryRunner.query(`ALTER TABLE trip_accommodations DROP CONSTRAINT DF_trip_accom_mode;`);
    await queryRunner.query(`ALTER TABLE trip_accommodations DROP COLUMN mode, vibe, is_placeholder;`);

    await queryRunner.query(`ALTER TABLE trips DROP CONSTRAINT CK_trips_edit_mode;`);
    await queryRunner.query(`ALTER TABLE trips DROP CONSTRAINT FK_trips_templates;`);
    await queryRunner.query(`ALTER TABLE trips DROP CONSTRAINT FK_trips_destinations;`);
    await queryRunner.query(`ALTER TABLE trips DROP CONSTRAINT DF_trips_edit_mode;`);
    await queryRunner.query(`
      ALTER TABLE trips DROP COLUMN destination_id, template_id, night_count, edit_mode, pick_location_ids;
    `);

    await queryRunner.query(`ALTER TABLE locations DROP CONSTRAINT CK_locations_slot_type;`);
    await queryRunner.query(`ALTER TABLE locations DROP CONSTRAINT FK_locations_destinations;`);
    await queryRunner.query(`DROP INDEX IX_locations_destination_featured ON locations;`);
    await queryRunner.query(`
      ALTER TABLE locations DROP COLUMN destination_id, featured_rank, default_duration_min, slot_type, vibe_tags;
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS template_blocks;`);
    await queryRunner.query(`DROP TABLE IF EXISTS trip_templates;`);
    await queryRunner.query(`DROP TABLE IF EXISTS destinations;`);
  }
}
