import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserCheckins1760000013000 implements MigrationInterface {
  name = 'UserCheckins1760000013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE user_checkins (
        id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
        user_id uniqueidentifier NOT NULL,
        location_id uniqueidentifier NOT NULL,
        latitude decimal(10,8) NOT NULL,
        longitude decimal(11,8) NOT NULL,
        privacy_level nvarchar(16) NOT NULL DEFAULT 'PUBLIC',
        checkin_time datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_user_checkins_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE NO ACTION,
        CONSTRAINT FK_user_checkins_locations FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
        CONSTRAINT CK_user_checkins_privacy CHECK (privacy_level IN ('PUBLIC','FRIENDS','PRIVATE'))
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IX_user_checkins_user_location ON user_checkins (user_id, location_id, checkin_time DESC);
      CREATE INDEX IX_user_checkins_location ON user_checkins (location_id, checkin_time DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_checkins;`);
  }
}
