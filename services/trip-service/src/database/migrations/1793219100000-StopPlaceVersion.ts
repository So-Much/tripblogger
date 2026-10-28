import { MigrationInterface, QueryRunner } from 'typeorm';

export class StopPlaceVersion1793219100000 implements MigrationInterface {
  name = 'StopPlaceVersion1793219100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('trip_stops', 'place_version'))) {
      await queryRunner.query(`ALTER TABLE "trip_stops" ADD "place_version" int`);
    }
    await queryRunner.query(
      `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_trip_stops_place_id' AND object_id = OBJECT_ID('trip_stops'))
       CREATE INDEX "IDX_trip_stops_place_id" ON "trip_stops" ("place_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_trip_stops_place_id" ON "trip_stops"`);
    await queryRunner.query(`ALTER TABLE "trip_stops" DROP COLUMN "place_version"`);
  }
}
