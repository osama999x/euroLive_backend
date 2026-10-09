import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserBans1760000000000 implements MigrationInterface {
  name = 'CreateUserBans1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_bans" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "userId" uuid,
        "deviceId" varchar,
        "type" varchar NOT NULL,
        "reason" text,
        "startsAt" TIMESTAMPTZ NOT NULL,
        "expiresAt" TIMESTAMPTZ,
        "revokedAt" TIMESTAMPTZ,
        "createdById" uuid
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_bans_userId" ON "user_bans" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_bans_deviceId" ON "user_bans" ("deviceId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_bans"`);
  }
}
