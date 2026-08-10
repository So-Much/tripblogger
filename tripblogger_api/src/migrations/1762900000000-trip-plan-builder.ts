import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Plan Builder trip schema (spec §6).
 * Recreates trips / trip_days / trip_stops / trip_stop_tags after DropTripTables.
 */
export class TripPlanBuilder1762900000000 implements MigrationInterface {
  name = 'TripPlanBuilder1762900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE trips (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        user_id uniqueidentifier NOT NULL,
        title nvarchar(255) NOT NULL,
        destination_label nvarchar(255) NOT NULL,
        destination_lat decimal(10,8) NOT NULL,
        destination_lng decimal(11,8) NOT NULL,
        start_date date NOT NULL,
        end_date date NOT NULL,
        default_travel_mode nvarchar(16) NOT NULL DEFAULT 'motorbike',
        default_buffer_minutes int NOT NULL DEFAULT 15,
        default_day_start_time nvarchar(8) NOT NULL DEFAULT '08:00',
        status nvarchar(16) NOT NULL DEFAULT 'draft',
        version int NOT NULL DEFAULT 1,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_trips_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT CK_trips_dates CHECK (end_date >= start_date),
        CONSTRAINT CK_trips_default_travel_mode CHECK (
          default_travel_mode IN ('motorbike','car','foot','bike')
        ),
        CONSTRAINT CK_trips_status CHECK (
          status IN ('draft','active','completed','archived')
        )
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IX_trips_user_id ON trips (user_id);
    `);

    await queryRunner.query(`
      CREATE TABLE trip_days (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        trip_id uniqueidentifier NOT NULL,
        date date NOT NULL,
        day_index int NOT NULL,
        start_time nvarchar(8) NULL,
        CONSTRAINT FK_trip_days_trips FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
        CONSTRAINT UQ_trip_days_trip_date UNIQUE (trip_id, date),
        CONSTRAINT CK_trip_days_day_index CHECK (day_index >= 0)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IX_trip_days_trip_id ON trip_days (trip_id);
    `);

    await queryRunner.query(`
      CREATE TABLE trip_stops (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        trip_id uniqueidentifier NOT NULL,
        trip_day_id uniqueidentifier NULL,
        position int NOT NULL,
        name nvarchar(255) NOT NULL,
        address nvarchar(max) NULL,
        lat decimal(10,8) NOT NULL,
        lng decimal(11,8) NOT NULL,
        category nvarchar(64) NULL,
        external_place_id nvarchar(255) NULL,
        opening_hours_raw nvarchar(max) NULL,
        location_id uniqueidentifier NULL,
        duration_minutes int NOT NULL,
        buffer_after_minutes int NULL,
        travel_mode_override nvarchar(16) NULL,
        anchor_time nvarchar(8) NULL,
        priority nvarchar(16) NOT NULL DEFAULT 'nice',
        status nvarchar(16) NOT NULL DEFAULT 'todo',
        travel_from_prev_seconds int NULL,
        travel_from_prev_distance_m int NULL,
        travel_mode_used nvarchar(16) NULL,
        travel_computed_at datetime2 NULL,
        note nvarchar(max) NULL,
        estimated_cost_amount decimal(15,2) NULL,
        estimated_cost_currency nvarchar(8) NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_trip_stops_trips FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
        CONSTRAINT FK_trip_stops_days FOREIGN KEY (trip_day_id) REFERENCES trip_days(id) ON DELETE NO ACTION,
        CONSTRAINT FK_trip_stops_locations FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
        CONSTRAINT CK_trip_stops_position CHECK (position >= 0),
        CONSTRAINT CK_trip_stops_priority CHECK (priority IN ('must','nice')),
        CONSTRAINT CK_trip_stops_status CHECK (status IN ('todo','doing','done','skipped')),
        CONSTRAINT CK_trip_stops_travel_mode_override CHECK (
          travel_mode_override IS NULL OR travel_mode_override IN ('motorbike','car','foot','bike')
        ),
        CONSTRAINT CK_trip_stops_travel_mode_used CHECK (
          travel_mode_used IS NULL OR travel_mode_used IN ('motorbike','car','foot','bike')
        )
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IX_trip_stops_trip_id ON trip_stops (trip_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IX_trip_stops_day_position ON trip_stops (trip_day_id, position);
    `);

    await queryRunner.query(`
      CREATE INDEX IX_trip_stops_idea_bucket ON trip_stops (trip_id)
        WHERE trip_day_id IS NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE trip_stop_tags (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        trip_stop_id uniqueidentifier NOT NULL,
        tag nvarchar(64) NOT NULL,
        is_system bit NOT NULL DEFAULT 0,
        CONSTRAINT FK_trip_stop_tags_stops FOREIGN KEY (trip_stop_id) REFERENCES trip_stops(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IX_trip_stop_tags_stop ON trip_stop_tags (trip_stop_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IX_trip_stop_tags_tag ON trip_stop_tags (tag);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS trip_stop_tags;`);
    await queryRunner.query(`DROP TABLE IF EXISTS trip_stops;`);
    await queryRunner.query(`DROP TABLE IF EXISTS trip_days;`);
    await queryRunner.query(`DROP TABLE IF EXISTS trips;`);
  }
}
