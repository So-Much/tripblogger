import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommerceGuestCheckout1760000007000 implements MigrationInterface {
  name = 'CommerceGuestCheckout1760000007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE orders ALTER COLUMN address_id uniqueidentifier NULL;`);
    await queryRunner.query(`ALTER TABLE orders ADD guest_recipient_name nvarchar(256) NULL;`);
    await queryRunner.query(`ALTER TABLE orders ADD guest_phone nvarchar(20) NULL;`);
    await queryRunner.query(`ALTER TABLE orders ADD guest_email nvarchar(256) NULL;`);
    await queryRunner.query(`ALTER TABLE orders ADD guest_province nvarchar(128) NULL;`);
    await queryRunner.query(`ALTER TABLE orders ADD guest_district nvarchar(128) NULL;`);
    await queryRunner.query(`ALTER TABLE orders ADD guest_ward nvarchar(128) NULL;`);
    await queryRunner.query(`ALTER TABLE orders ADD guest_street nvarchar(512) NULL;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN guest_street;`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN guest_ward;`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN guest_district;`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN guest_province;`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN guest_email;`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN guest_phone;`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN guest_recipient_name;`);
    await queryRunner.query(`ALTER TABLE orders ALTER COLUMN address_id uniqueidentifier NOT NULL;`);
  }
}
