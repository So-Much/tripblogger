import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommerceFoundation1760000004000 implements MigrationInterface {
  name = 'CommerceFoundation1760000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE categories (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        name nvarchar(256) NOT NULL UNIQUE,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE tags (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        name nvarchar(128) NOT NULL UNIQUE,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE products_commerce (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        seller_id uniqueidentifier NOT NULL,
        category_id uniqueidentifier NOT NULL,
        title nvarchar(512) NOT NULL,
        slug nvarchar(512) NOT NULL UNIQUE,
        tags_json nvarchar(max) NULL,
        media_json nvarchar(max) NULL,
        description nvarchar(max) NOT NULL,
        price decimal(18,2) NOT NULL,
        product_type nvarchar(32) NOT NULL DEFAULT 'NEW',
        stock int NOT NULL DEFAULT 0,
        stock_unit nvarchar(64) NOT NULL DEFAULT N'cái',
        status nvarchar(32) NOT NULL DEFAULT 'DRAFT',
        analytics_json nvarchar(max) NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        published_at datetime2 NULL,
        CONSTRAINT CK_products_type CHECK (product_type IN ('NEW', 'SECONDHAND')),
        CONSTRAINT CK_products_status CHECK (status IN (
          'DRAFT','PENDING_REVIEW','PENDING_VERIFICATION','PUBLISHED',
          'RESERVED','OUTOFSTOCK','SOLD','RETURNED','REFUNDED',
          'BLOCKED','REMOVED','PREORDER','NEEDSPHOTOS'
        )),
        CONSTRAINT CK_products_price CHECK (price >= 0),
        CONSTRAINT CK_products_stock CHECK (stock >= 0),
        CONSTRAINT FK_products_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
      );
    `);

    await queryRunner.query(`CREATE INDEX IX_products_seller ON products_commerce(seller_id);`);
    await queryRunner.query(`CREATE INDEX IX_products_category ON products_commerce(category_id);`);
    await queryRunner.query(`CREATE INDEX IX_products_status ON products_commerce(status);`);

    await queryRunner.query(`
      CREATE TABLE product_tags (
        product_id uniqueidentifier NOT NULL,
        tag_id uniqueidentifier NOT NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_product_tags PRIMARY KEY (product_id, tag_id),
        CONSTRAINT FK_pt_product FOREIGN KEY (product_id) REFERENCES products_commerce(id) ON DELETE CASCADE,
        CONSTRAINT FK_pt_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE seller_verifications (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        user_id uniqueidentifier NOT NULL,
        status nvarchar(32) NOT NULL DEFAULT 'PENDING',
        requested_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        reviewed_at datetime2 NULL,
        reviewed_by uniqueidentifier NULL,
        CONSTRAINT CK_sv_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
        CONSTRAINT FK_sv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_sv_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)
      );
    `);

    await queryRunner.query(`
      ALTER TABLE member_profiles ADD is_verified_seller bit NOT NULL CONSTRAINT DF_mp_is_verified_seller DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE member_profiles DROP CONSTRAINT DF_mp_is_verified_seller;
    `);
    await queryRunner.query(`ALTER TABLE member_profiles DROP COLUMN is_verified_seller;`);
    await queryRunner.query(`DROP TABLE IF EXISTS seller_verifications;`);
    await queryRunner.query(`DROP TABLE IF EXISTS product_tags;`);
    await queryRunner.query(`DROP TABLE IF EXISTS products_commerce;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tags;`);
    await queryRunner.query(`DROP TABLE IF EXISTS categories;`);
  }
}
