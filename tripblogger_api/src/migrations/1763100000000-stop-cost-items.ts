import { MigrationInterface, QueryRunner } from 'typeorm';

/** Line-item cost breakdown per stop (JSON array). */
export class StopCostItems1763100000000 implements MigrationInterface {
  name = 'StopCostItems1763100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE trip_stops
      ADD cost_items_json nvarchar(max) NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE trip_stops DROP COLUMN cost_items_json;
    `);
  }
}
