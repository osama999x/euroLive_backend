import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResellerOfficialUser1760100000000 implements MigrationInterface {
  name = 'ResellerOfficialUser1760100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "resellers" ADD COLUMN IF NOT EXISTS "officialUserId" uuid`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_resellers_officialUserId'
        ) THEN
          ALTER TABLE "resellers"
            ADD CONSTRAINT "UQ_resellers_officialUserId" UNIQUE ("officialUserId");
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_resellers_official_user'
        ) THEN
          ALTER TABLE "resellers"
            ADD CONSTRAINT "FK_resellers_official_user"
            FOREIGN KEY ("officialUserId") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "resellers" DROP CONSTRAINT IF EXISTS "FK_resellers_official_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resellers" DROP CONSTRAINT IF EXISTS "UQ_resellers_officialUserId"`,
    );
    await queryRunner.query(`ALTER TABLE "resellers" DROP COLUMN IF EXISTS "officialUserId"`);
  }
}
