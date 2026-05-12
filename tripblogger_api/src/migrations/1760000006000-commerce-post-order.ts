import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommercePostOrder1760000006000 implements MigrationInterface {
  name = 'CommercePostOrder1760000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE shipments (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        order_id uniqueidentifier NOT NULL,
        seller_id uniqueidentifier NOT NULL,
        tracking_code nvarchar(128) NULL,
        carrier nvarchar(32) NOT NULL DEFAULT 'OTHER',
        status nvarchar(32) NOT NULL DEFAULT 'WAITING',
        estimated_delivery datetime2 NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT CK_shipments_carrier CHECK (carrier IN ('GHN','GHTK','VNPOST','OTHER')),
        CONSTRAINT CK_shipments_status CHECK (status IN ('WAITING','PICKING','INTRANSIT','DELIVERED','FAILED')),
        CONSTRAINT FK_shipments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        CONSTRAINT FK_shipments_seller FOREIGN KEY (seller_id) REFERENCES users(id)
      );
    `);
    await queryRunner.query(`CREATE INDEX IX_shipments_order ON shipments(order_id);`);

    await queryRunner.query(`
      CREATE TABLE product_ratings (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        product_id uniqueidentifier NOT NULL,
        user_id uniqueidentifier NOT NULL,
        order_product_id uniqueidentifier NOT NULL,
        score int NOT NULL,
        review nvarchar(max) NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT CK_ratings_score CHECK (score BETWEEN 1 AND 5),
        CONSTRAINT FK_ratings_product FOREIGN KEY (product_id) REFERENCES products_commerce(id) ON DELETE CASCADE,
        CONSTRAINT FK_ratings_user FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT FK_ratings_order_product FOREIGN KEY (order_product_id) REFERENCES order_products(id),
        CONSTRAINT UQ_ratings_product_user_op UNIQUE (product_id, user_id, order_product_id)
      );
    `);
    await queryRunner.query(`CREATE INDEX IX_ratings_product ON product_ratings(product_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS product_ratings;`);
    await queryRunner.query(`DROP TABLE IF EXISTS shipments;`);
  }
}
