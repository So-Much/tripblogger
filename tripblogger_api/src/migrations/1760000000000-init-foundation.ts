import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitFoundation1760000000000 implements MigrationInterface {
  name = 'InitFoundation1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE roles (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        code nvarchar(64) NOT NULL UNIQUE,
        name nvarchar(128) NOT NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE users (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        role_id uniqueidentifier NOT NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_users_roles_role_id FOREIGN KEY (role_id) REFERENCES roles(id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE guest_profiles (
        user_id uniqueidentifier PRIMARY KEY,
        session_id nvarchar(255) NOT NULL UNIQUE,
        browsing_history nvarchar(max) NULL,
        CONSTRAINT FK_guest_profiles_users_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE member_profiles (
        user_id uniqueidentifier PRIMARY KEY,
        username nvarchar(64) NOT NULL UNIQUE,
        email nvarchar(255) NOT NULL UNIQUE,
        password_hash nvarchar(255) NOT NULL,
        CONSTRAINT FK_member_profiles_users_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE status_catalog (
        code nvarchar(64) PRIMARY KEY,
        display_name nvarchar(255) NOT NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE user_statuses (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        user_id uniqueidentifier NOT NULL,
        status_code nvarchar(64) NOT NULL,
        is_active bit NOT NULL DEFAULT 1,
        source nvarchar(255) NULL,
        set_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_user_statuses_users_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_user_statuses_status_catalog_status_code FOREIGN KEY (status_code) REFERENCES status_catalog(code)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        user_id uniqueidentifier NOT NULL,
        token_jti nvarchar(128) NOT NULL UNIQUE,
        token_hash nvarchar(255) NOT NULL,
        device_info nvarchar(255) NULL,
        expires_at datetime2 NOT NULL,
        revoked_at datetime2 NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_refresh_tokens_users_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE refresh_tokens;');
    await queryRunner.query('DROP TABLE user_statuses;');
    await queryRunner.query('DROP TABLE status_catalog;');
    await queryRunner.query('DROP TABLE member_profiles;');
    await queryRunner.query('DROP TABLE guest_profiles;');
    await queryRunner.query('DROP TABLE users;');
    await queryRunner.query('DROP TABLE roles;');
  }
}
