import { MigrationInterface, QueryRunner } from 'typeorm';

export class PostMediaJunction1760000009000 implements MigrationInterface {
  name = 'PostMediaJunction1760000009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasPostMedia = await queryRunner.hasTable('post_media');
    if (!hasPostMedia) {
      await queryRunner.query(`
        CREATE TABLE post_media (
          id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
          post_id uniqueidentifier NOT NULL,
          media_id uniqueidentifier NOT NULL,
          position int NOT NULL DEFAULT 0,
          CONSTRAINT FK_post_media_posts FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
          CONSTRAINT FK_post_media_media FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE NO ACTION
        );
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX UQ_post_media_post_media ON post_media (post_id, media_id);
      `);
      await queryRunner.query(`
        CREATE INDEX IX_post_media_post_position ON post_media (post_id, position);
      `);
    }

    const mediaHasPostId = await queryRunner.hasColumn('media', 'post_id');
    if (mediaHasPostId) {
      await queryRunner.query(`
        INSERT INTO post_media (post_id, media_id, position)
        SELECT m.post_id, m.id, m.position
        FROM media m
        WHERE m.post_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM post_media pm WHERE pm.post_id = m.post_id AND pm.media_id = m.id
        );
      `);

      await queryRunner.query(`
        IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_media_posts_post_id')
          ALTER TABLE media DROP CONSTRAINT FK_media_posts_post_id;
      `);
      await queryRunner.query(`
        IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_media_post_position' AND object_id = OBJECT_ID('media'))
          DROP INDEX IX_media_post_position ON media;
      `);
      await queryRunner.query(`ALTER TABLE media DROP COLUMN post_id;`);
    }

    if (await queryRunner.hasColumn('media', 'position')) {
      await queryRunner.query(`
        DECLARE @df nvarchar(256);
        SELECT @df = d.name
        FROM sys.default_constraints d
        INNER JOIN sys.columns c ON d.parent_column_id = c.column_id AND d.parent_object_id = c.object_id
        WHERE d.parent_object_id = OBJECT_ID('media') AND c.name = 'position';
        IF @df IS NOT NULL EXEC('ALTER TABLE media DROP CONSTRAINT [' + @df + ']');
      `);
      await queryRunner.query(`ALTER TABLE media DROP COLUMN position;`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasPostId = await queryRunner.hasColumn('media', 'post_id');
    if (!hasPostId) {
      await queryRunner.query(`ALTER TABLE media ADD post_id uniqueidentifier NULL;`);
      await queryRunner.query(`
        ALTER TABLE media ADD CONSTRAINT FK_media_posts_post_id
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
      `);
    }

    if (!(await queryRunner.hasColumn('media', 'position'))) {
      await queryRunner.query(`ALTER TABLE media ADD position int NOT NULL DEFAULT 0;`);
    }

    await queryRunner.query(`
      UPDATE m SET m.post_id = pm.post_id, m.position = pm.position
      FROM media m
      INNER JOIN post_media pm ON pm.media_id = m.id;
    `);

    await queryRunner.query(`DROP INDEX UQ_post_media_post_media ON post_media;`);
    await queryRunner.query(`DROP INDEX IX_post_media_post_position ON post_media;`);
    await queryRunner.query(`DROP TABLE post_media;`);

    await queryRunner.query(`
      CREATE INDEX IX_media_post_position ON media (post_id, position);
    `);
  }
}
