import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Roles and statuses are reference data that auth needs to register anyone; without them a
 * fresh database answers every sign-up with 500. Existing rows (from seed:roles-statuses) are kept.
 */
const ROLES = [
  ['GUEST', 'Guest'],
  ['MEMBER', 'Member'],
  ['ADMIN', 'Admin'],
];

const STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'PENDING_VERIFICATION',
  'SUSPENDED',
  'DELETED',
  'BANNED',
  'PREMIUM',
  'VERIFIED',
];

export class SeedRolesStatuses1763300000000 implements MigrationInterface {
  name = 'SeedRolesStatuses1763300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [code, name] of ROLES) {
      await queryRunner.query(
        `IF NOT EXISTS (SELECT 1 FROM roles WHERE code = @0) INSERT INTO roles (code, name) VALUES (@0, @1)`,
        [code, name],
      );
    }
    for (const code of STATUSES) {
      await queryRunner.query(
        `IF NOT EXISTS (SELECT 1 FROM status_catalog WHERE code = @0) INSERT INTO status_catalog (code, display_name) VALUES (@0, @0)`,
        [code],
      );
    }
  }

  public async down(): Promise<void> {
    // Users reference these rows; removing them would break existing accounts.
  }
}
