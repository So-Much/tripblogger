import { MigrationInterface, QueryRunner } from 'typeorm';

export class LocationsFoundation1760000010000 implements MigrationInterface {
  name = 'LocationsFoundation1760000010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE location_types (
        id uniqueidentifier PRIMARY KEY,
        code nvarchar(64) NOT NULL UNIQUE,
        name nvarchar(128) NOT NULL,
        icon nvarchar(16) NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE()
      );
    `);

    await queryRunner.query(`
      INSERT INTO location_types (id, code, name, icon) VALUES
        ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa001', 'food', N'Ăn uống', N'🍽'),
        ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa002', 'cafe', N'Cà phê', N'☕'),
        ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa003', 'restaurant', N'Nhà hàng', N'🍜'),
        ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa004', 'attraction', N'Tham quan', N'🏔'),
        ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa005', 'accommodation', N'Chỗ ở', N'🏨'),
        ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa006', 'shopping', N'Mua sắm', N'🛍'),
        ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa007', 'entertainment', N'Giải trí', N'🎭'),
        ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa008', 'nature', N'Thiên nhiên', N'🌿'),
        ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa009', 'outdoor', N'Ngoài trời', N'⛺'),
        ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa00a', 'other', N'Khác', N'📍');
    `);

    await queryRunner.query(`
      CREATE TABLE locations (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        location_type_id uniqueidentifier NULL,
        name nvarchar(255) NOT NULL,
        address nvarchar(max) NULL,
        latitude decimal(10,8) NOT NULL,
        longitude decimal(11,8) NOT NULL,
        status nvarchar(32) NOT NULL DEFAULT 'ACTIVE',
        source_type nvarchar(32) NOT NULL DEFAULT 'MANUAL',
        external_source nvarchar(32) NULL,
        external_id nvarchar(255) NULL,
        google_place_id nvarchar(255) NULL,
        phone nvarchar(50) NULL,
        website nvarchar(500) NULL,
        avg_rating decimal(3,2) NOT NULL DEFAULT 0,
        total_review int NOT NULL DEFAULT 0,
        popularity_score decimal(8,4) NOT NULL DEFAULT 0,
        price_level tinyint NULL,
        open_hours_json nvarchar(max) NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_locations_location_types FOREIGN KEY (location_type_id) REFERENCES location_types(id) ON DELETE SET NULL,
        CONSTRAINT CK_locations_status CHECK (status IN ('ACTIVE','PENDING_VERIFICATION','INACTIVE')),
        CONSTRAINT CK_locations_source_type CHECK (source_type IN ('MANUAL','PHOTON','NOMINATIM','GOOGLE'))
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX UQ_locations_external ON locations (external_source, external_id)
        WHERE external_source IS NOT NULL AND external_id IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IX_locations_lat_lng ON locations (latitude, longitude);
    `);

    await queryRunner.query(`
      CREATE INDEX IX_locations_name ON locations (name);
    `);

    await queryRunner.query(`
      CREATE TABLE location_media (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        location_id uniqueidentifier NOT NULL,
        media_id uniqueidentifier NOT NULL,
        is_primary bit NOT NULL DEFAULT 0,
        aesthetic_score decimal(5,2) NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_location_media_locations FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
        CONSTRAINT FK_location_media_media FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE location_reviews (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        location_id uniqueidentifier NOT NULL,
        user_id uniqueidentifier NOT NULL,
        rating tinyint NOT NULL,
        content nvarchar(max) NULL,
        trip_id uniqueidentifier NULL,
        trip_stop_id uniqueidentifier NULL,
        tags_json nvarchar(max) NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_location_reviews_locations FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
        CONSTRAINT FK_location_reviews_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE NO ACTION,
        CONSTRAINT CK_location_reviews_rating CHECK (rating >= 1 AND rating <= 5)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IX_location_reviews_location ON location_reviews (location_id, created_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS location_reviews;`);
    await queryRunner.query(`DROP TABLE IF EXISTS location_media;`);
    await queryRunner.query(`DROP TABLE IF EXISTS locations;`);
    await queryRunner.query(`DROP TABLE IF EXISTS location_types;`);
  }
}
