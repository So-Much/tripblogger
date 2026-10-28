import { MigrationInterface, QueryRunner } from "typeorm";

export class TripInit1793219091754 implements MigrationInterface {
    name = 'TripInit1793219091754'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Baseline: databases created earlier by `synchronize` already have this schema.
        if (await queryRunner.hasTable('trips')) return;
        await queryRunner.query(`CREATE TABLE "trips" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_f71c231dee9c05a9522f9e840f5" DEFAULT NEWSEQUENTIALID(), "user_id" uniqueidentifier NOT NULL, "title" nvarchar(255) NOT NULL, "destination_label" nvarchar(255) NOT NULL, "destination_lat" decimal(10,8) NOT NULL, "destination_lng" decimal(11,8) NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "default_travel_mode" nvarchar(16) NOT NULL CONSTRAINT "DF_bc52d27e2576ebb37d2888df86e" DEFAULT 'motorbike', "default_buffer_minutes" int NOT NULL CONSTRAINT "DF_55991e919c328092989eac0399c" DEFAULT 15, "default_day_start_time" nvarchar(8) NOT NULL CONSTRAINT "DF_c72f9dcc9181e6c49ef0c8cd7a5" DEFAULT '08:00', "timezone" nvarchar(8) NOT NULL CONSTRAINT "DF_5d10a9cbfbcf3199bb6dfe0b4f0" DEFAULT '+07:00', "status" nvarchar(16) NOT NULL CONSTRAINT "DF_1e9de13bac402d95dad6f116e0e" DEFAULT 'draft', "version" int NOT NULL CONSTRAINT "DF_0e34d74f8f1a91380212d4d082c" DEFAULT 1, "budget_amount" decimal(15,2), "budget_currency" nvarchar(8), "created_at" datetime2 NOT NULL CONSTRAINT "DF_413483638b27ddac763af435482" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_71179a2e4314e4236c2cbca0733" DEFAULT getdate(), CONSTRAINT "PK_f71c231dee9c05a9522f9e840f5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_71179a2e4314e4236c2cbca073" ON "trips" ("updated_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_79f0d0e93556db6c3c28f497c4" ON "trips" ("user_id", "status") `);
        await queryRunner.query(`CREATE TABLE "trip_days" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_050b16d50cf830df078e0ad0efb" DEFAULT NEWSEQUENTIALID(), "trip_id" uniqueidentifier NOT NULL, "date" date NOT NULL, "day_index" int NOT NULL, "start_time" nvarchar(8), CONSTRAINT "PK_050b16d50cf830df078e0ad0efb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_45782e783a4f545fbf2a2fa181" ON "trip_days" ("trip_id") `);
        await queryRunner.query(`CREATE TABLE "trip_stops" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_876633f878970267cb0dc525984" DEFAULT NEWSEQUENTIALID(), "trip_id" uniqueidentifier NOT NULL, "trip_day_id" uniqueidentifier, "position" int NOT NULL, "name" nvarchar(255) NOT NULL, "address" nvarchar(max), "lat" decimal(10,8) NOT NULL, "lng" decimal(11,8) NOT NULL, "category" nvarchar(64), "external_place_id" nvarchar(255), "opening_hours_raw" nvarchar(max), "place_id" uniqueidentifier, "place_version" int, "duration_minutes" int NOT NULL, "buffer_after_minutes" int, "travel_mode_override" nvarchar(16), "anchor_time" nvarchar(8), "priority" nvarchar(16) NOT NULL CONSTRAINT "DF_83e0a9b330f04d2cde1429dfae3" DEFAULT 'nice', "status" nvarchar(16) NOT NULL CONSTRAINT "DF_6fa7aa1ddf48e03e303e5700901" DEFAULT 'todo', "travel_from_prev_seconds" int, "travel_from_prev_distance_m" int, "travel_mode_used" nvarchar(16), "travel_computed_at" datetime2, "note" nvarchar(max), "estimated_cost_amount" decimal(15,2), "estimated_cost_currency" nvarchar(8), "cost_items_json" nvarchar(max), "created_at" datetime2 NOT NULL CONSTRAINT "DF_42ed2335697c66777194691232f" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_010d19a19b173ff24b3b89f1404" DEFAULT getdate(), CONSTRAINT "PK_876633f878970267cb0dc525984" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_eddca40b2e2f480cf387cb1084" ON "trip_stops" ("trip_day_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_5cb5ec6432abdf6f1e1c3a0970" ON "trip_stops" ("trip_id") `);
        await queryRunner.query(`CREATE TABLE "trip_stop_tags" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_ef4db615fc4f64789e8a4834bd1" DEFAULT NEWSEQUENTIALID(), "trip_stop_id" uniqueidentifier NOT NULL, "tag" nvarchar(64) NOT NULL, "is_system" bit NOT NULL CONSTRAINT "DF_b23e8e064ea696d8e5613f3941d" DEFAULT 0, CONSTRAINT "PK_ef4db615fc4f64789e8a4834bd1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_travel_budgets" ("user_id" uniqueidentifier NOT NULL, "amount" decimal(15,2), "currency" nvarchar(8), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_99ac2cbe5393f0ee3866db4c8c9" DEFAULT getdate(), CONSTRAINT "PK_4c25aa77fb4c57056599b679961" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`ALTER TABLE "trip_days" ADD CONSTRAINT "FK_45782e783a4f545fbf2a2fa181c" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trip_stops" ADD CONSTRAINT "FK_5cb5ec6432abdf6f1e1c3a0970c" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trip_stops" ADD CONSTRAINT "FK_eddca40b2e2f480cf387cb1084d" FOREIGN KEY ("trip_day_id") REFERENCES "trip_days"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trip_stop_tags" ADD CONSTRAINT "FK_ecc9f6a59769dea651dbf2cb1d4" FOREIGN KEY ("trip_stop_id") REFERENCES "trip_stops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trip_stop_tags" DROP CONSTRAINT "FK_ecc9f6a59769dea651dbf2cb1d4"`);
        await queryRunner.query(`ALTER TABLE "trip_stops" DROP CONSTRAINT "FK_eddca40b2e2f480cf387cb1084d"`);
        await queryRunner.query(`ALTER TABLE "trip_stops" DROP CONSTRAINT "FK_5cb5ec6432abdf6f1e1c3a0970c"`);
        await queryRunner.query(`ALTER TABLE "trip_days" DROP CONSTRAINT "FK_45782e783a4f545fbf2a2fa181c"`);
        await queryRunner.query(`DROP TABLE "user_travel_budgets"`);
        await queryRunner.query(`DROP TABLE "trip_stop_tags"`);
        await queryRunner.query(`DROP INDEX "IDX_5cb5ec6432abdf6f1e1c3a0970" ON "trip_stops"`);
        await queryRunner.query(`DROP INDEX "IDX_eddca40b2e2f480cf387cb1084" ON "trip_stops"`);
        await queryRunner.query(`DROP TABLE "trip_stops"`);
        await queryRunner.query(`DROP INDEX "IDX_45782e783a4f545fbf2a2fa181" ON "trip_days"`);
        await queryRunner.query(`DROP TABLE "trip_days"`);
        await queryRunner.query(`DROP INDEX "IDX_79f0d0e93556db6c3c28f497c4" ON "trips"`);
        await queryRunner.query(`DROP INDEX "IDX_71179a2e4314e4236c2cbca073" ON "trips"`);
        await queryRunner.query(`DROP TABLE "trips"`);
    }

}
