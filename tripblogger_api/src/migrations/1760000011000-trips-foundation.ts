import { MigrationInterface, QueryRunner } from 'typeorm';

export class TripsFoundation1760000011000 implements MigrationInterface {
  name = 'TripsFoundation1760000011000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_trips_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_trips_cover_media FOREIGN KEY (cover_media_id) REFERENCES media(id) ON DELETE SET NULL,
        CONSTRAINT CK_trips_dates CHECK (end_date >= start_date),
        CONSTRAINT CK_trips_status CHECK (
          status IN ('DRAFT','PLANNING','ACTIVE','COMPLETED','ARCHIVED','CANCELLED')
        )
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IX_trips_user_id ON trips (user_id);
      CREATE INDEX IX_trips_status ON trips (status);
    `);

    await queryRunner.query(`
      CREATE TABLE trip_members (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        trip_id uniqueidentifier NOT NULL,
        user_id uniqueidentifier NOT NULL,
        role nvarchar(20) NOT NULL DEFAULT 'VIEWER',
        status nvarchar(20) NOT NULL DEFAULT 'PENDING',
        note nvarchar(max) NULL,
        joined_at datetime2 NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_trip_members_trips FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
        CONSTRAINT FK_trip_members_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE NO ACTION,
        CONSTRAINT UQ_trip_members_trip_user UNIQUE (trip_id, user_id),
        CONSTRAINT CK_trip_members_role CHECK (role IN ('OWNER','EDITOR','VIEWER')),
        CONSTRAINT CK_trip_members_status CHECK (status IN ('PENDING','ACCEPTED','DECLINED','REMOVED'))
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IX_trip_members_trip ON trip_members (trip_id);
      CREATE INDEX IX_trip_members_user ON trip_members (user_id);
    `);

    await queryRunner.query(`
      CREATE TABLE trip_accommodations (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        trip_id uniqueidentifier NOT NULL,
        location_id uniqueidentifier NULL,
        custom_name nvarchar(255) NULL,
        custom_address nvarchar(max) NULL,
        custom_latitude decimal(10,8) NULL,
        custom_longitude decimal(11,8) NULL,
        check_in date NOT NULL,
        check_out date NOT NULL,
        room_type nvarchar(100) NULL,
        confirmation_code nvarchar(100) NULL,
        price_per_night decimal(10,2) NULL,
        price_currency nvarchar(3) NOT NULL DEFAULT 'VND',
        is_primary bit NOT NULL DEFAULT 1,
        notes nvarchar(max) NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_trip_accom_trips FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
        CONSTRAINT FK_trip_accom_locations FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
        CONSTRAINT CK_trip_accom_dates CHECK (check_out > check_in)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE trip_days (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        trip_id uniqueidentifier NOT NULL,
        date date NOT NULL,
        day_number int NOT NULL,
        title nvarchar(255) NULL,
        theme nvarchar(100) NULL,
        notes nvarchar(max) NULL,
        total_distance_km decimal(6,2) NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_trip_days_trips FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
        CONSTRAINT UQ_trip_days_trip_day_number UNIQUE (trip_id, day_number),
        CONSTRAINT UQ_trip_days_trip_date UNIQUE (trip_id, date),
        CONSTRAINT CK_trip_days_day_number CHECK (day_number > 0)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE trip_stops (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        trip_day_id uniqueidentifier NOT NULL,
        location_id uniqueidentifier NULL,
        custom_name nvarchar(255) NULL,
        custom_address nvarchar(max) NULL,
        custom_latitude decimal(10,8) NULL,
        custom_longitude decimal(11,8) NULL,
        order_index int NOT NULL DEFAULT 0,
        arrival_time time NULL,
        departure_time time NULL,
        duration_minutes int NULL,
        status nvarchar(20) NOT NULL DEFAULT 'PLANNED',
        transport_mode nvarchar(20) NULL DEFAULT 'WALK',
        distance_from_prev_km decimal(6,2) NULL,
        estimated_travel_min int NULL,
        budget_estimate decimal(10,2) NULL,
        actual_spent decimal(10,2) NULL,
        notes nvarchar(max) NULL,
        visited_at datetime2 NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_trip_stops_days FOREIGN KEY (trip_day_id) REFERENCES trip_days(id) ON DELETE CASCADE,
        CONSTRAINT FK_trip_stops_locations FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
        CONSTRAINT CK_trip_stops_status CHECK (status IN ('PLANNED','VISITING','VISITED','SKIPPED')),
        CONSTRAINT CK_trip_stops_transport CHECK (
          transport_mode IN ('WALK','MOTORBIKE','CAR','TAXI','BUS','BOAT','TRAIN','PLANE')
        ),
        CONSTRAINT CK_trip_stops_order CHECK (order_index >= 0)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IX_trip_stops_day_order ON trip_stops (trip_day_id, order_index);
    `);

    await queryRunner.query(`
      CREATE TABLE saved_locations (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        user_id uniqueidentifier NOT NULL,
        location_id uniqueidentifier NOT NULL,
        collection_name nvarchar(100) NOT NULL DEFAULT N'Mặc định',
        note nvarchar(max) NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_saved_locations_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_saved_locations_locations FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
        CONSTRAINT UQ_saved_locations_user_location UNIQUE (user_id, location_id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE trip_posts (
        trip_id uniqueidentifier NOT NULL,
        post_id uniqueidentifier NOT NULL,
        linked_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_trip_posts PRIMARY KEY (trip_id, post_id),
        CONSTRAINT FK_trip_posts_trips FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
        CONSTRAINT FK_trip_posts_posts FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      ALTER TABLE location_reviews ADD CONSTRAINT FK_location_reviews_trips
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE location_reviews ADD CONSTRAINT FK_location_reviews_trip_stops
        FOREIGN KEY (trip_stop_id) REFERENCES trip_stops(id) ON DELETE SET NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_location_reviews_trip_stops')
        ALTER TABLE location_reviews DROP CONSTRAINT FK_location_reviews_trip_stops;
    `);
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_location_reviews_trips')
        ALTER TABLE location_reviews DROP CONSTRAINT FK_location_reviews_trips;
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS trip_posts;`);
    await queryRunner.query(`DROP TABLE IF EXISTS saved_locations;`);
    await queryRunner.query(`DROP TABLE IF EXISTS trip_stops;`);
    await queryRunner.query(`DROP TABLE IF EXISTS trip_days;`);
    await queryRunner.query(`DROP TABLE IF EXISTS trip_accommodations;`);
    await queryRunner.query(`DROP TABLE IF EXISTS trip_members;`);
    await queryRunner.query(`DROP TABLE IF EXISTS trips;`);
  }
}
