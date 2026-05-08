import { MigrationInterface, QueryRunner } from 'typeorm';

export class PostsAndSocial1760000002000 implements MigrationInterface {
  name = 'PostsAndSocial1760000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // If a previous attempt partially created `reacts`, drop it so we can re-create
    // FKs without running into MSSQL "multiple cascade paths".
    await queryRunner.query(`
      IF OBJECT_ID('reacts', 'U') IS NOT NULL
      DROP TABLE reacts;
    `);

    await queryRunner.query(`
      CREATE TABLE react_types (
        id uniqueidentifier PRIMARY KEY,
        code nvarchar(32) NOT NULL UNIQUE,
        name nvarchar(64) NOT NULL,
        media nvarchar(512) NULL,
        use_for nvarchar(32) NOT NULL,
        CONSTRAINT CK_react_types_use_for CHECK (use_for IN ('POST', 'COMMENT', 'BOTH'))
      );
    `);

    await queryRunner.query(`
      INSERT INTO react_types (id, code, name, media, use_for) VALUES
      ('11111111-1111-4111-8111-111111111101', 'HEART', 'Tim', NULL, 'POST'),
      ('11111111-1111-4111-8111-111111111102', 'HAHA', 'Haha', NULL, 'POST'),
      ('11111111-1111-4111-8111-111111111103', 'ANGRY', 'Tức giận', NULL, 'POST'),
      ('11111111-1111-4111-8111-111111111104', 'SAD', 'Buồn', NULL, 'POST'),
      ('11111111-1111-4111-8111-111111111105', 'WOW', 'Wow', NULL, 'POST'),
      ('11111111-1111-4111-8111-111111111106', 'SHARE', 'Share', NULL, 'POST');
    `);

    await queryRunner.query(`
      CREATE TABLE posts (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        user_id uniqueidentifier NOT NULL,
        title nvarchar(512) NOT NULL,
        content_html nvarchar(max) NOT NULL,
        media_json nvarchar(max) NULL,
        category nvarchar(128) NULL,
        tags_json nvarchar(max) NULL,
        visibility nvarchar(32) NOT NULL DEFAULT 'PUBLIC',
        location_json nvarchar(max) NULL,
        status nvarchar(32) NOT NULL DEFAULT 'DRAFT',
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT CK_posts_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'DELETED')),
        CONSTRAINT CK_posts_visibility CHECK (visibility IN ('PUBLIC', 'PRIVATE')),
        CONSTRAINT FK_posts_users_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IX_posts_user_created_id ON posts (user_id, created_at DESC, id DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE comments (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        user_id uniqueidentifier NOT NULL,
        post_id uniqueidentifier NOT NULL,
        content nvarchar(max) NOT NULL,
        parent_comment_id uniqueidentifier NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_comments_users_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE NO ACTION,
        CONSTRAINT FK_comments_posts_post_id FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        CONSTRAINT FK_comments_parent FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE NO ACTION
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IX_comments_post_created_id ON comments (post_id, created_at DESC, id DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE reacts (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        user_id uniqueidentifier NOT NULL,
        post_id uniqueidentifier NULL,
        comment_id uniqueidentifier NULL,
        type_id uniqueidentifier NOT NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_reacts_users_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_reacts_posts_post_id FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE NO ACTION,
        CONSTRAINT FK_reacts_comments_comment_id FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE NO ACTION,
        CONSTRAINT FK_reacts_types_type_id FOREIGN KEY (type_id) REFERENCES react_types(id) ON DELETE NO ACTION,
        CONSTRAINT CK_reacts_one_target CHECK (
          (post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL)
        )
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX UQ_reacts_post_user ON reacts (user_id, post_id)
      WHERE post_id IS NOT NULL AND comment_id IS NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX UQ_reacts_comment_user_type ON reacts (user_id, comment_id, type_id)
      WHERE comment_id IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IX_reacts_post_id ON reacts (post_id) WHERE post_id IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IX_reacts_comment_id ON reacts (comment_id) WHERE comment_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IX_reacts_comment_id ON reacts;');
    await queryRunner.query('DROP INDEX IX_reacts_post_id ON reacts;');
    await queryRunner.query('DROP INDEX UQ_reacts_comment_user_type ON reacts;');
    await queryRunner.query('DROP INDEX UQ_reacts_post_user ON reacts;');
    await queryRunner.query('DROP TABLE reacts;');
    await queryRunner.query('DROP INDEX IX_comments_post_created_id ON comments;');
    await queryRunner.query('DROP TABLE comments;');
    await queryRunner.query('DROP INDEX IX_posts_user_created_id ON posts;');
    await queryRunner.query('DROP TABLE posts;');
    await queryRunner.query('DROP TABLE react_types;');
  }
}
