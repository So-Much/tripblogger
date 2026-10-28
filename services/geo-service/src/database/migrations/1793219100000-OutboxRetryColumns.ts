import { MigrationInterface, QueryRunner } from 'typeorm';

export class OutboxRetryColumns1793219100000 implements MigrationInterface {
  name = 'OutboxRetryColumns1793219100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('place_outbox', 'attempts'))) {
      await queryRunner.query(
        `ALTER TABLE "place_outbox" ADD "attempts" int NOT NULL CONSTRAINT "DF_a8925f9cae598801e3d9293252f" DEFAULT 0`,
      );
    }
    if (!(await queryRunner.hasColumn('place_outbox', 'last_error'))) {
      await queryRunner.query(`ALTER TABLE "place_outbox" ADD "last_error" nvarchar(500)`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "place_outbox" DROP COLUMN "last_error"`);
    await queryRunner.query(`ALTER TABLE "place_outbox" DROP CONSTRAINT "DF_a8925f9cae598801e3d9293252f"`);
    await queryRunner.query(`ALTER TABLE "place_outbox" DROP COLUMN "attempts"`);
  }
}
