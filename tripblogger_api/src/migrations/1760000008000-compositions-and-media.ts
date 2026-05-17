import { MigrationInterface, QueryRunner } from 'typeorm';

type LegacyMediaItem = Record<string, unknown>;

export class CompositionsAndMedia1760000008000 implements MigrationInterface {
  name = 'CompositionsAndMedia1760000008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE compositions (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        name nvarchar(128) NOT NULL,
        slug nvarchar(64) NOT NULL UNIQUE,
        description nvarchar(512) NULL,
        thumbnail_url nvarchar(512) NULL,
        is_active bit NOT NULL DEFAULT 1,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE composition_guides (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        composition_id uniqueidentifier NOT NULL,
        step_order int NOT NULL,
        instruction nvarchar(512) NOT NULL,
        trigger_condition nvarchar(64) NOT NULL,
        CONSTRAINT FK_composition_guides_composition FOREIGN KEY (composition_id)
          REFERENCES compositions(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IX_composition_guides_composition_order
      ON composition_guides (composition_id, step_order);
    `);

    await queryRunner.query(`
      CREATE TABLE overlay_configs (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        composition_id uniqueidentifier NOT NULL,
        svg_path nvarchar(max) NOT NULL,
        aspect_ratio nvarchar(16) NOT NULL,
        CONSTRAINT FK_overlay_configs_composition FOREIGN KEY (composition_id)
          REFERENCES compositions(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IX_overlay_configs_composition_ratio
      ON overlay_configs (composition_id, aspect_ratio);
    `);

    await queryRunner.query(`
      CREATE TABLE media (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        post_id uniqueidentifier NULL,
        user_id uniqueidentifier NOT NULL,
        type nvarchar(32) NOT NULL,
        url nvarchar(1024) NOT NULL,
        thumbnail_url nvarchar(1024) NULL,
        preview_url nvarchar(1024) NULL,
        original_url nvarchar(1024) NULL,
        mime_type nvarchar(128) NULL,
        width int NULL,
        height int NULL,
        size bigint NULL,
        placeholder nvarchar(max) NULL,
        storage nvarchar(32) NULL DEFAULT 'local',
        source_path nvarchar(512) NULL,
        composition_id uniqueidentifier NULL,
        position int NOT NULL DEFAULT 0,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_media_posts_post_id FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        CONSTRAINT FK_media_users_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE NO ACTION,
        CONSTRAINT FK_media_compositions FOREIGN KEY (composition_id) REFERENCES compositions(id) ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IX_media_post_position ON media (post_id, position);
    `);

    const hasMediaJson = await queryRunner.hasColumn('posts', 'media_json');
    if (hasMediaJson) {
      const posts = (await queryRunner.query(`
        SELECT id, user_id, media_json FROM posts WHERE media_json IS NOT NULL
      `)) as Array<{ id: string; user_id: string; media_json: string }>;

      for (const post of posts) {
        let items: LegacyMediaItem[] = [];
        try {
          const parsed = JSON.parse(post.media_json) as unknown;
          items = Array.isArray(parsed) ? (parsed as LegacyMediaItem[]) : [];
        } catch {
          console.warn(`[migration] skip media_json parse for post ${post.id}`);
          continue;
        }

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const type = String(item.type ?? (item.kind === 'video' ? 'video' : 'image'));
          const url = String(item.url ?? item.originalUrl ?? '');
          if (!url) continue;

          const compositionId =
            typeof item.compositionId === 'string' && item.compositionId ? item.compositionId : null;

          await queryRunner.query(
            `
            INSERT INTO media (
              post_id, user_id, type, url, thumbnail_url, preview_url, original_url,
              mime_type, width, height, size, placeholder, storage, source_path,
              composition_id, position
            ) VALUES (
              @0, @1, @2, @3, @4, @5, @6, @7, @8, @9, @10, @11, @12, @13, @14, @15
            )
          `,
            [
              post.id,
              post.user_id,
              type,
              url,
              typeof item.thumbnailUrl === 'string' ? item.thumbnailUrl : null,
              typeof item.previewUrl === 'string' ? item.previewUrl : null,
              typeof item.originalUrl === 'string' ? item.originalUrl : null,
              typeof item.mimeType === 'string' ? item.mimeType : null,
              typeof item.width === 'number' ? item.width : null,
              typeof item.height === 'number' ? item.height : null,
              typeof item.size === 'number' ? item.size : null,
              typeof item.placeholder === 'string' ? item.placeholder : null,
              typeof item.storage === 'string' ? item.storage : 'local',
              typeof item.sourcePath === 'string' ? item.sourcePath : null,
              compositionId,
              i,
            ],
          );
        }
      }

      await queryRunner.query(`ALTER TABLE posts DROP COLUMN media_json;`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasMediaJson = await queryRunner.hasColumn('posts', 'media_json');
    if (!hasMediaJson) {
      await queryRunner.query(`ALTER TABLE posts ADD media_json nvarchar(max) NULL;`);
    }

    const posts = (await queryRunner.query(`
      SELECT DISTINCT post_id FROM media WHERE post_id IS NOT NULL
    `)) as Array<{ post_id: string }>;

    for (const row of posts) {
      const mediaRows = (await queryRunner.query(
        `
        SELECT type, url, thumbnail_url, preview_url, original_url, mime_type, width, height,
               size, placeholder, storage, source_path, composition_id, position
        FROM media WHERE post_id = @0 ORDER BY position ASC
      `,
        [row.post_id],
      )) as Array<Record<string, unknown>>;

      const payload = mediaRows.map((m) => ({
        type: m.type,
        kind: m.type === 'video' ? 'video' : 'image',
        url: m.url,
        thumbnailUrl: m.thumbnail_url,
        previewUrl: m.preview_url,
        originalUrl: m.original_url,
        mimeType: m.mime_type,
        width: m.width,
        height: m.height,
        size: m.size,
        placeholder: m.placeholder,
        storage: m.storage,
        sourcePath: m.source_path,
        compositionId: m.composition_id,
      }));

      await queryRunner.query(`UPDATE posts SET media_json = @0 WHERE id = @1`, [
        JSON.stringify(payload),
        row.post_id,
      ]);
    }

    await queryRunner.query(`DROP INDEX IX_media_post_position ON media;`);
    await queryRunner.query(`DROP TABLE media;`);
    await queryRunner.query(`DROP INDEX IX_overlay_configs_composition_ratio ON overlay_configs;`);
    await queryRunner.query(`DROP TABLE overlay_configs;`);
    await queryRunner.query(`DROP INDEX IX_composition_guides_composition_order ON composition_guides;`);
    await queryRunner.query(`DROP TABLE composition_guides;`);
    await queryRunner.query(`DROP TABLE compositions;`);
  }
}
