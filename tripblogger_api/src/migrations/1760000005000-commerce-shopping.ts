import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommerceShopping1760000005000 implements MigrationInterface {
  name = 'CommerceShopping1760000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE wishlists (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        user_id uniqueidentifier NOT NULL,
        product_id uniqueidentifier NOT NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT UQ_wishlists_user_product UNIQUE (user_id, product_id),
        CONSTRAINT FK_wishlists_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_wishlists_product FOREIGN KEY (product_id) REFERENCES products_commerce(id) ON DELETE NO ACTION
      );
    `);

    await queryRunner.query(`
      CREATE TABLE carts (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        user_id uniqueidentifier NOT NULL,
        status nvarchar(32) NOT NULL DEFAULT 'ACTIVE',
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT CK_carts_status CHECK (status IN ('ACTIVE','INACTIVE','MERGED','ABANDONED')),
        CONSTRAINT FK_carts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX IX_carts_user_status ON carts(user_id, status);`);

    await queryRunner.query(`
      CREATE TABLE cart_products (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        cart_id uniqueidentifier NOT NULL,
        product_id uniqueidentifier NOT NULL,
        quantity int NOT NULL,
        price_snapshot decimal(18,2) NOT NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT CK_cart_products_qty CHECK (quantity > 0),
        CONSTRAINT UQ_cart_products_cart_product UNIQUE (cart_id, product_id),
        CONSTRAINT FK_cart_products_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
        CONSTRAINT FK_cart_products_product FOREIGN KEY (product_id) REFERENCES products_commerce(id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE addresses (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        user_id uniqueidentifier NOT NULL,
        label nvarchar(64) NOT NULL,
        recipient_name nvarchar(256) NOT NULL,
        phone nvarchar(20) NOT NULL,
        province nvarchar(128) NOT NULL,
        district nvarchar(128) NOT NULL,
        ward nvarchar(128) NOT NULL,
        street nvarchar(512) NOT NULL,
        is_default bit NOT NULL CONSTRAINT DF_addresses_is_default DEFAULT 0,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX IX_addresses_user ON addresses(user_id);`);

    await queryRunner.query(`
      CREATE TABLE coupons (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        code nvarchar(64) NOT NULL,
        type nvarchar(32) NOT NULL,
        value decimal(18,2) NOT NULL,
        min_order_value decimal(18,2) NULL,
        max_discount_amount decimal(18,2) NULL,
        max_uses int NULL,
        used_count int NOT NULL CONSTRAINT DF_coupons_used_count DEFAULT 0,
        applies_to nvarchar(32) NOT NULL DEFAULT 'ALL',
        applies_to_ids_json nvarchar(max) NULL,
        status nvarchar(32) NOT NULL DEFAULT 'ACTIVE',
        active_at datetime2 NOT NULL,
        expires_at datetime2 NOT NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT UQ_coupons_code UNIQUE (code),
        CONSTRAINT CK_coupons_type CHECK (type IN ('PERCENTAGE','FIXED')),
        CONSTRAINT CK_coupons_applies CHECK (applies_to IN ('ALL','CATEGORY','PRODUCT')),
        CONSTRAINT CK_coupons_status CHECK (status IN ('ACTIVE','EXPIRED','DISABLED'))
      );
    `);

    await queryRunner.query(`
      CREATE TABLE orders (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        order_code nvarchar(32) NOT NULL,
        buyer_id uniqueidentifier NOT NULL,
        address_id uniqueidentifier NOT NULL,
        coupon_id uniqueidentifier NULL,
        status nvarchar(32) NOT NULL DEFAULT 'PENDING',
        sub_total decimal(18,2) NOT NULL,
        shipping_fee decimal(18,2) NOT NULL CONSTRAINT DF_orders_shipping_fee DEFAULT 0,
        discount_amount decimal(18,2) NOT NULL CONSTRAINT DF_orders_discount DEFAULT 0,
        total_amount decimal(18,2) NOT NULL,
        note nvarchar(1024) NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT UQ_orders_code UNIQUE (order_code),
        CONSTRAINT CK_orders_status CHECK (status IN ('PENDING','CONFIRMED','SHIPPING','DELIVERED','CANCELLED','REFUNDED')),
        CONSTRAINT FK_orders_buyer FOREIGN KEY (buyer_id) REFERENCES users(id),
        CONSTRAINT FK_orders_address FOREIGN KEY (address_id) REFERENCES addresses(id),
        CONSTRAINT FK_orders_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id)
      );
    `);
    await queryRunner.query(`CREATE INDEX IX_orders_buyer ON orders(buyer_id);`);
    await queryRunner.query(`CREATE INDEX IX_orders_status ON orders(status);`);

    await queryRunner.query(`
      CREATE TABLE order_products (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        order_id uniqueidentifier NOT NULL,
        product_id uniqueidentifier NOT NULL,
        seller_id uniqueidentifier NOT NULL,
        quantity int NOT NULL,
        price_snapshot decimal(18,2) NOT NULL,
        product_title_snapshot nvarchar(512) NOT NULL,
        status nvarchar(32) NOT NULL DEFAULT 'PROCESSING',
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT CK_order_products_qty CHECK (quantity > 0),
        CONSTRAINT CK_order_products_status CHECK (status IN ('PROCESSING','SHIPPED','DELIVERED','RETURNED')),
        CONSTRAINT FK_order_products_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        CONSTRAINT FK_order_products_product FOREIGN KEY (product_id) REFERENCES products_commerce(id),
        CONSTRAINT FK_order_products_seller FOREIGN KEY (seller_id) REFERENCES users(id)
      );
    `);
    await queryRunner.query(`CREATE INDEX IX_order_products_order ON order_products(order_id);`);

    await queryRunner.query(`
      CREATE TABLE coupon_usages (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        coupon_id uniqueidentifier NOT NULL,
        user_id uniqueidentifier NOT NULL,
        order_id uniqueidentifier NOT NULL,
        used_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_coupon_usages_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id),
        CONSTRAINT FK_coupon_usages_user FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT FK_coupon_usages_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE payments (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        order_id uniqueidentifier NOT NULL,
        method nvarchar(32) NOT NULL,
        status nvarchar(32) NOT NULL DEFAULT 'PENDING',
        amount decimal(18,2) NOT NULL,
        transaction_ref nvarchar(256) NULL,
        gateway_response nvarchar(max) NULL,
        paid_at datetime2 NULL,
        created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT UQ_payments_order UNIQUE (order_id),
        CONSTRAINT CK_payments_method CHECK (method IN ('COD','MOMO','VNPAY','BANKING','STRIPE')),
        CONSTRAINT CK_payments_status CHECK (status IN ('PENDING','PAID','FAILED','REFUNDED')),
        CONSTRAINT FK_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS payments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS coupon_usages;`);
    await queryRunner.query(`DROP TABLE IF EXISTS order_products;`);
    await queryRunner.query(`DROP TABLE IF EXISTS orders;`);
    await queryRunner.query(`DROP TABLE IF EXISTS coupons;`);
    await queryRunner.query(`DROP TABLE IF EXISTS addresses;`);
    await queryRunner.query(`DROP TABLE IF EXISTS cart_products;`);
    await queryRunner.query(`DROP TABLE IF EXISTS carts;`);
    await queryRunner.query(`DROP TABLE IF EXISTS wishlists;`);
  }
}
