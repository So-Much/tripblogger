import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReactSingleAndTypes1760000003000 implements MigrationInterface {
  name = 'ReactSingleAndTypes1760000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'UQ_reacts_post_user_type' AND object_id = OBJECT_ID('reacts')
      )
      DROP INDEX UQ_reacts_post_user_type ON reacts;
    `);

    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'UQ_reacts_post_user' AND object_id = OBJECT_ID('reacts')
      )
      DROP INDEX UQ_reacts_post_user ON reacts;
    `);

    await queryRunner.query(`
      ;WITH dedupe AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, post_id ORDER BY created_at DESC, id DESC) AS rn
        FROM reacts
        WHERE post_id IS NOT NULL AND comment_id IS NULL
      )
      DELETE FROM reacts WHERE id IN (SELECT id FROM dedupe WHERE rn > 1);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX UQ_reacts_post_user ON reacts (user_id, post_id)
      WHERE post_id IS NOT NULL AND comment_id IS NULL;
    `);

    await queryRunner.query(`
      UPDATE reacts
      SET type_id = '11111111-1111-4111-8111-111111111101'
      WHERE type_id IN (
        '11111111-1111-4111-8111-111111111101',
        '11111111-1111-4111-8111-111111111102'
      );
    `);

    await queryRunner.query(`
      UPDATE reacts
      SET type_id = '11111111-1111-4111-8111-111111111102'
      WHERE type_id = '11111111-1111-4111-8111-111111111103';
    `);

    await queryRunner.query(`
      UPDATE reacts
      SET type_id = '11111111-1111-4111-8111-111111111106'
      WHERE type_id = '11111111-1111-4111-8111-111111111104';
    `);

    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM react_types WHERE id = '11111111-1111-4111-8111-111111111103')
      DELETE FROM react_types WHERE id = '11111111-1111-4111-8111-111111111103';
    `);

    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM react_types WHERE id = '11111111-1111-4111-8111-111111111104')
      DELETE FROM react_types WHERE id = '11111111-1111-4111-8111-111111111104';
    `);

    await queryRunner.query(`
      UPDATE react_types
      SET code = 'HEART', name = 'Tim', use_for = 'POST'
      WHERE id = '11111111-1111-4111-8111-111111111101';
    `);

    await queryRunner.query(`
      UPDATE react_types
      SET code = 'HAHA', name = 'Haha', use_for = 'POST'
      WHERE id = '11111111-1111-4111-8111-111111111102';
    `);

    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM react_types WHERE id = '11111111-1111-4111-8111-111111111103')
      INSERT INTO react_types (id, code, name, media, use_for)
      VALUES ('11111111-1111-4111-8111-111111111103', 'ANGRY', 'Tức giận', NULL, 'POST');
    `);

    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM react_types WHERE id = '11111111-1111-4111-8111-111111111104')
      INSERT INTO react_types (id, code, name, media, use_for)
      VALUES ('11111111-1111-4111-8111-111111111104', 'SAD', 'Buồn', NULL, 'POST');
    `);

    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM react_types WHERE id = '11111111-1111-4111-8111-111111111105')
      INSERT INTO react_types (id, code, name, media, use_for)
      VALUES ('11111111-1111-4111-8111-111111111105', 'WOW', 'Wow', NULL, 'POST');
    `);

    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM react_types WHERE id = '11111111-1111-4111-8111-111111111106')
      INSERT INTO react_types (id, code, name, media, use_for)
      VALUES ('11111111-1111-4111-8111-111111111106', 'SHARE', 'Share', NULL, 'POST');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'UQ_reacts_post_user' AND object_id = OBJECT_ID('reacts')
      )
      DROP INDEX UQ_reacts_post_user ON reacts;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX UQ_reacts_post_user_type ON reacts (user_id, post_id, type_id)
      WHERE post_id IS NOT NULL AND comment_id IS NULL;
    `);
  }
}

