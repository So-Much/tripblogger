import { MigrationInterface, QueryRunner } from "typeorm";

export class GeoInit1793219072190 implements MigrationInterface {
    name = 'GeoInit1793219072190'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Baseline: databases created earlier by `synchronize` already have this schema.
        if (await queryRunner.hasTable('places')) return;
        await queryRunner.query(`CREATE TABLE "places" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_1afab86e226b4c3bc9a74465c12" DEFAULT NEWSEQUENTIALID(), "osm_type" nvarchar(8), "osm_id" bigint, "name" nvarchar(255) NOT NULL, "normalized_name" nvarchar(255) NOT NULL, "aliases" nvarchar(max), "category" nvarchar(64) NOT NULL, "subcategory" nvarchar(64), "lat" decimal(10,8) NOT NULL, "lng" decimal(11,8) NOT NULL, "address" nvarchar(max), "phone" nvarchar(50), "website" nvarchar(500), "opening_hours_raw" nvarchar(max), "wikidata_id" nvarchar(32), "image_url" nvarchar(1000), "description_vi" nvarchar(max), "description_en" nvarchar(max), "source" nvarchar(16) NOT NULL CONSTRAINT "DF_c1b6a9bdf0554a1defdb4c683db" DEFAULT 'osm', "status" nvarchar(16) NOT NULL CONSTRAINT "DF_12f1a4677b7c9f55c38652f94e9" DEFAULT 'active', "rating_avg" decimal(3,2) NOT NULL CONSTRAINT "DF_cbe4292734eb8af880c9d6cd42d" DEFAULT 0, "review_count" int NOT NULL CONSTRAINT "DF_00d8445d2df004213907541a856" DEFAULT 0, "popularity" decimal(8,4) NOT NULL CONSTRAINT "DF_5ab590c8eb6cd4f7933858c28aa" DEFAULT 0, "version" int NOT NULL CONSTRAINT "DF_2bc5982bd27365df9b6a0d2aa77" DEFAULT 1, "created_by_user_id" uniqueidentifier, "created_at" datetime2 NOT NULL CONSTRAINT "DF_d7044aed30c5dde6427ef3f52db" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_b65f581459a81ba548d5b91c948" DEFAULT getdate(), CONSTRAINT "PK_1afab86e226b4c3bc9a74465c12" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_acf9a3a68c5e48e50456287d21" ON "places" ("osm_type", "osm_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_4ca826fde2dce098197191bcfe" ON "places" ("normalized_name") `);
        await queryRunner.query(`CREATE INDEX "IDX_58167bb2c3ecd843ac2cb47e2b" ON "places" ("status", "category") `);
        await queryRunner.query(`CREATE TABLE "place_contributions" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_b1c4bffb0214bb1f9cf860df5cd" DEFAULT NEWSEQUENTIALID(), "place_id" uniqueidentifier, "user_id" uniqueidentifier NOT NULL, "kind" nvarchar(16) NOT NULL, "payload_json" nvarchar(max) NOT NULL, "status" nvarchar(16) NOT NULL CONSTRAINT "DF_c854890c738eff4169961248c19" DEFAULT 'pending', "reviewer_note" nvarchar(500), "created_at" datetime2 NOT NULL CONSTRAINT "DF_4b7f8bf03591b5d22813e078c53" DEFAULT getdate(), CONSTRAINT "PK_b1c4bffb0214bb1f9cf860df5cd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "place_outbox" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_9aab64deaf3fe5bdbe2c81663f4" DEFAULT NEWSEQUENTIALID(), "event_type" nvarchar(64) NOT NULL, "payload_json" nvarchar(max) NOT NULL, "created_at" datetime2 NOT NULL CONSTRAINT "DF_7a3259db7a79cd515475055d665" DEFAULT getdate(), "published_at" datetime2, "attempts" int NOT NULL CONSTRAINT "DF_a8925f9cae598801e3d9293252f" DEFAULT 0, "last_error" nvarchar(500), CONSTRAINT "PK_9aab64deaf3fe5bdbe2c81663f4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f601b237380e9d482b9f776abe" ON "place_outbox" ("published_at") `);
        await queryRunner.query(`CREATE TABLE "place_reviews" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_21653e81a5fc4b599a2509a107d" DEFAULT NEWSEQUENTIALID(), "place_id" uniqueidentifier NOT NULL, "user_id" uniqueidentifier NOT NULL, "rating" int NOT NULL, "body" nvarchar(max), "tags_json" nvarchar(max), "created_at" datetime2 NOT NULL CONSTRAINT "DF_59b1238b54c044ddbcd2258a104" DEFAULT getdate(), CONSTRAINT "PK_21653e81a5fc4b599a2509a107d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_364a85a202d83d915eb8c5347e" ON "place_reviews" ("place_id") `);
        await queryRunner.query(`CREATE TABLE "saved_places" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_2fe824e346daa89e58c9b09b0a3" DEFAULT NEWSEQUENTIALID(), "user_id" uniqueidentifier NOT NULL, "place_id" uniqueidentifier NOT NULL, "collection_name" nvarchar(100) NOT NULL CONSTRAINT "DF_6805e3d4dc90d9b8846a83b539c" DEFAULT 'Mặc định', "note" nvarchar(max), "created_at" datetime2 NOT NULL CONSTRAINT "DF_f7af90c420c88ca3fc15e152574" DEFAULT getdate(), CONSTRAINT "PK_2fe824e346daa89e58c9b09b0a3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "checkins" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_99c62633386398b154840f0708c" DEFAULT NEWSEQUENTIALID(), "user_id" uniqueidentifier NOT NULL, "place_id" uniqueidentifier NOT NULL, "lat" decimal(10,8), "lng" decimal(11,8), "privacy_level" nvarchar(16) NOT NULL CONSTRAINT "DF_7b0a02f0e7de7eef24eaf40e2bf" DEFAULT 'PUBLIC', "created_at" datetime2 NOT NULL CONSTRAINT "DF_a457f885c15a2541c6be4436139" DEFAULT getdate(), CONSTRAINT "PK_99c62633386398b154840f0708c" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "checkins"`);
        await queryRunner.query(`DROP TABLE "saved_places"`);
        await queryRunner.query(`DROP INDEX "IDX_364a85a202d83d915eb8c5347e" ON "place_reviews"`);
        await queryRunner.query(`DROP TABLE "place_reviews"`);
        await queryRunner.query(`DROP INDEX "IDX_f601b237380e9d482b9f776abe" ON "place_outbox"`);
        await queryRunner.query(`DROP TABLE "place_outbox"`);
        await queryRunner.query(`DROP TABLE "place_contributions"`);
        await queryRunner.query(`DROP INDEX "IDX_58167bb2c3ecd843ac2cb47e2b" ON "places"`);
        await queryRunner.query(`DROP INDEX "IDX_4ca826fde2dce098197191bcfe" ON "places"`);
        await queryRunner.query(`DROP INDEX "IDX_acf9a3a68c5e48e50456287d21" ON "places"`);
        await queryRunner.query(`DROP TABLE "places"`);
    }

}
