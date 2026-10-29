import { MigrationInterface, QueryRunner } from 'typeorm';

/** Per-trip budget + member total travel budget cap. */
export class TripBudget1763000000000 implements MigrationInterface {
  name = 'TripBudget1763000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE trips
        ADD budget_amount decimal(15,2) NULL,
            budget_currency nvarchar(8) NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE member_profiles
        ADD total_travel_budget_amount decimal(15,2) NULL,
            total_travel_budget_currency nvarchar(8) NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE member_profiles
        DROP COLUMN total_travel_budget_amount, total_travel_budget_currency;
    `);

    await queryRunner.query(`
      ALTER TABLE trips
        DROP COLUMN budget_amount, budget_currency;
    `);
  }
}
