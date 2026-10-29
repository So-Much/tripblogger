import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SQL Server UNIQUE constraints allow a single NULL, so only one member could ever
 * register without an email. A filtered unique index keeps emails unique but allows many NULLs.
 */
export class MemberEmailFilteredUnique1763200000000 implements MigrationInterface {
  name = 'MemberEmailFilteredUnique1763200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DECLARE @name sysname;
      SELECT @name = kc.name
      FROM sys.key_constraints kc
      JOIN sys.index_columns ic ON ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id
      JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
      WHERE kc.parent_object_id = OBJECT_ID('member_profiles') AND kc.type = 'UQ' AND c.name = 'email';
      IF @name IS NOT NULL EXEC('ALTER TABLE member_profiles DROP CONSTRAINT [' + @name + ']');
    `);
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_member_profiles_email' AND object_id = OBJECT_ID('member_profiles'))
        CREATE UNIQUE INDEX UX_member_profiles_email ON member_profiles(email) WHERE email IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX UX_member_profiles_email ON member_profiles;`);
    await queryRunner.query(`ALTER TABLE member_profiles ADD CONSTRAINT UQ_member_profiles_email UNIQUE (email);`);
  }
}
