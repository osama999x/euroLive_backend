import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePortalFoundation1757860000000 implements MigrationInterface {
  name = 'CreatePortalFoundation1757860000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "staff_users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "email" varchar NOT NULL,
        "username" varchar NOT NULL,
        "passwordHash" varchar NOT NULL,
        "totpSecret" varchar,
        "totpEnabled" boolean NOT NULL DEFAULT false,
        "status" varchar NOT NULL DEFAULT 'active',
        CONSTRAINT "UQ_staff_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_staff_users_username" UNIQUE ("username")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "slug" varchar NOT NULL,
        "name" varchar NOT NULL,
        "description" varchar,
        CONSTRAINT "UQ_roles_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "slug" varchar NOT NULL,
        "name" varchar NOT NULL,
        CONSTRAINT "UQ_permissions_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "staff_user_roles" (
        "staffUserId" uuid NOT NULL,
        "roleId" uuid NOT NULL,
        CONSTRAINT "PK_staff_user_roles" PRIMARY KEY ("staffUserId", "roleId"),
        CONSTRAINT "FK_staff_user_roles_staff" FOREIGN KEY ("staffUserId") REFERENCES "staff_users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_staff_user_roles_role" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "roleId" uuid NOT NULL,
        "permissionId" uuid NOT NULL,
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("roleId", "permissionId"),
        CONSTRAINT "FK_role_permissions_role" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "resellers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "email" varchar NOT NULL,
        "username" varchar NOT NULL,
        "passwordHash" varchar NOT NULL,
        "displayName" varchar NOT NULL,
        "creditLimit" bigint NOT NULL DEFAULT 0,
        "commissionRate" numeric(5,2) NOT NULL DEFAULT 0,
        "status" varchar NOT NULL DEFAULT 'active',
        CONSTRAINT "UQ_resellers_email" UNIQUE ("email"),
        CONSTRAINT "UQ_resellers_username" UNIQUE ("username")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "reseller_permissions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "resellerId" uuid NOT NULL,
        "canRecharge" boolean NOT NULL DEFAULT false,
        "canAssignFrame" boolean NOT NULL DEFAULT false,
        "canAssignEntry" boolean NOT NULL DEFAULT false,
        "canAssignBadge" boolean NOT NULL DEFAULT false,
        "canRemove" boolean NOT NULL DEFAULT false,
        "canSetExpiry" boolean NOT NULL DEFAULT false,
        "dailyRechargeLimit" integer,
        "dailyFrameLimit" integer,
        "dailyEntryLimit" integer,
        "dailyBadgeLimit" integer,
        CONSTRAINT "UQ_reseller_permissions_resellerId" UNIQUE ("resellerId"),
        CONSTRAINT "FK_reseller_permissions_reseller" FOREIGN KEY ("resellerId") REFERENCES "resellers"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "publicId" varchar NOT NULL,
        "username" varchar NOT NULL,
        "email" varchar,
        "phone" varchar,
        "displayName" varchar NOT NULL,
        "country" varchar,
        "gender" varchar,
        "bio" varchar,
        "avatarUrl" varchar,
        "status" varchar NOT NULL DEFAULT 'active',
        "deviceIds" jsonb NOT NULL DEFAULT '[]',
        CONSTRAINT "UQ_users_publicId" UNIQUE ("publicId"),
        CONSTRAINT "UQ_users_username" UNIQUE ("username"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_users_publicId" ON "users" ("publicId")`);

    await queryRunner.query(`
      CREATE TABLE "wallets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "ownerType" varchar NOT NULL,
        "ownerId" uuid NOT NULL,
        "coinBalance" bigint NOT NULL DEFAULT 0,
        "diamondBalance" bigint NOT NULL DEFAULT 0,
        CONSTRAINT "UQ_wallets_owner" UNIQUE ("ownerType", "ownerId")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_wallets_ownerType" ON "wallets" ("ownerType")`);

    await queryRunner.query(`
      CREATE TABLE "ledger_entries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "walletId" uuid NOT NULL,
        "type" varchar NOT NULL,
        "currency" varchar NOT NULL,
        "direction" varchar NOT NULL,
        "amount" bigint NOT NULL,
        "balanceAfter" bigint NOT NULL,
        "refType" varchar,
        "refId" varchar,
        "idempotencyKey" varchar,
        "performedByType" varchar NOT NULL,
        "performedById" uuid,
        "note" varchar,
        "metadata" jsonb
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_ledger_entries_walletId" ON "ledger_entries" ("walletId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_ledger_entries_idempotencyKey" ON "ledger_entries" ("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "catalog_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "type" varchar NOT NULL,
        "name" varchar NOT NULL,
        "description" varchar,
        "assetUrl" varchar,
        "price" bigint NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "resellerAccess" boolean NOT NULL DEFAULT false,
        "eligibility" varchar NOT NULL DEFAULT 'all',
        "defaultExpiryDays" integer
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_catalog_items_type" ON "catalog_items" ("type")`);

    await queryRunner.query(`
      CREATE TABLE "user_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "userId" uuid NOT NULL,
        "catalogItemId" uuid NOT NULL,
        "itemType" varchar NOT NULL,
        "expiresAt" TIMESTAMPTZ,
        "status" varchar NOT NULL DEFAULT 'active',
        "source" varchar NOT NULL,
        "assignedByType" varchar NOT NULL,
        "assignedById" uuid,
        "durationLabel" varchar,
        CONSTRAINT "FK_user_items_catalog" FOREIGN KEY ("catalogItemId") REFERENCES "catalog_items"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_user_items_userId" ON "user_items" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_items_status" ON "user_items" ("status")`);

    await queryRunner.query(`
      CREATE TABLE "admin_action_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "actorType" varchar NOT NULL,
        "actorId" uuid NOT NULL,
        "action" varchar NOT NULL,
        "targetType" varchar,
        "targetId" varchar,
        "before" jsonb,
        "after" jsonb,
        "ip" varchar,
        "userAgent" varchar
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_admin_action_logs_actorId" ON "admin_action_logs" ("actorId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_admin_action_logs_action" ON "admin_action_logs" ("action")`,
    );

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "accountType" varchar NOT NULL,
        "accountId" uuid NOT NULL,
        "tokenHash" varchar NOT NULL,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        "revokedAt" TIMESTAMPTZ,
        CONSTRAINT "UQ_refresh_tokens_tokenHash" UNIQUE ("tokenHash")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_accountId" ON "refresh_tokens" ("accountId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_action_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "catalog_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ledger_entries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reseller_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "resellers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_user_roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_users"`);
  }
}
