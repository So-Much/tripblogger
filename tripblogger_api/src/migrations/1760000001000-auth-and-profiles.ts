import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthAndProfiles1760000001000 implements MigrationInterface {
  name = 'AuthAndProfiles1760000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE member_profiles
      ALTER COLUMN email nvarchar(255) NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE member_profiles
      ADD display_name nvarchar(128) NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE member_profiles
      ADD avatar_url nvarchar(512) NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE oauth_identities (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        provider nvarchar(32) NOT NULL,
        provider_subject nvarchar(255) NOT NULL,
        user_id uniqueidentifier NOT NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT UQ_oauth_identities_provider_subject UNIQUE (provider, provider_subject),
        CONSTRAINT FK_oauth_identities_users_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE oauth_identities;');
    await queryRunner.query(`
      ALTER TABLE member_profiles
      DROP COLUMN avatar_url;
    `);
    await queryRunner.query(`
      ALTER TABLE member_profiles
      DROP COLUMN display_name;
    `);
    await queryRunner.query(`
      ALTER TABLE member_profiles
      ALTER COLUMN email nvarchar(255) NOT NULL;
    `);
  }
}

