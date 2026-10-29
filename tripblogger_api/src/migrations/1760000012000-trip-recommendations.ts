import { MigrationInterface, QueryRunner } from 'typeorm';

export class TripRecommendations1760000012000 implements MigrationInterface {
  name = 'TripRecommendations1760000012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE trip_recommendations (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        trip_id uniqueidentifier NOT NULL,
        location_id uniqueidentifier NOT NULL,
        based_on_accommodation_id uniqueidentifier NULL,
        score decimal(5,4) NOT NULL DEFAULT 0,
        recommendation_basis_json nvarchar(max) NULL,
        distance_km decimal(6,2) NULL,
        estimated_duration_min int NULL,
        is_dismissed bit NOT NULL DEFAULT 0,
        is_added bit NOT NULL DEFAULT 0,
        generated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_trip_rec_trips FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
        CONSTRAINT FK_trip_rec_locations FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE NO ACTION,
        CONSTRAINT FK_trip_rec_accom FOREIGN KEY (based_on_accommodation_id) REFERENCES trip_accommodations(id) ON DELETE NO ACTION,
        CONSTRAINT UQ_trip_rec_trip_location UNIQUE (trip_id, location_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IX_trip_rec_trip_score ON trip_recommendations (trip_id, score DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS trip_recommendations;`);
  }
}
