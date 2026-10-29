import { MigrationInterface, QueryRunner } from 'typeorm';

export class TripFavoriteAndJournal1762600000000 implements MigrationInterface {
  name = 'TripFavoriteAndJournal1762600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trips" ADD "is_favorite" bit NOT NULL CONSTRAINT "DF_trips_is_favorite" DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT "DF_trips_is_favorite"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "is_favorite"`);
  }
}
