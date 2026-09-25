import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEuroLiveCore1758700000000 implements MigrationInterface {
  name = 'CreateEuroLiveCore1758700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" varchar`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isOfficial" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "officialId" varchar`);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "users" ADD CONSTRAINT "UQ_users_officialId" UNIQUE ("officialId");
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE "resellers" ADD COLUMN IF NOT EXISTS "isOfficial" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "resellers" ADD COLUMN IF NOT EXISTS "officialId" varchar`);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "resellers" ADD CONSTRAINT "UQ_resellers_officialId" UNIQUE ("officialId");
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE "reseller_permissions" ADD COLUMN IF NOT EXISTS "canViewSosAlerts" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "reseller_permissions" ADD COLUMN IF NOT EXISTS "canViewComplaintEvidence" boolean NOT NULL DEFAULT false`);

    await queryRunner.query(`ALTER TABLE "admin_action_logs" ADD COLUMN IF NOT EXISTS "reason" varchar`);
    await queryRunner.query(`ALTER TABLE "admin_action_logs" ADD COLUMN IF NOT EXISTS "caseNumber" varchar`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_admin_action_logs_caseNumber" ON "admin_action_logs" ("caseNumber")`);
    await queryRunner.query(`ALTER TABLE "admin_action_logs" DROP COLUMN IF EXISTS "deletedAt"`);

    await queryRunner.query(`
      CREATE TABLE "agencies" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "email" varchar NOT NULL,
        "username" varchar NOT NULL,
        "passwordHash" varchar NOT NULL,
        "displayName" varchar NOT NULL,
        "country" varchar(2) NOT NULL,
        "status" varchar NOT NULL DEFAULT 'active',
        "sharePercent" numeric(5,2) NOT NULL DEFAULT 0,
        "frozen" boolean NOT NULL DEFAULT false,
        CONSTRAINT "UQ_agencies_email" UNIQUE ("email"),
        CONSTRAINT "UQ_agencies_username" UNIQUE ("username")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "host_profiles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "userId" uuid NOT NULL,
        "agencyId" uuid,
        "country" varchar(2) NOT NULL,
        "status" varchar NOT NULL DEFAULT 'active',
        "salaryPinHash" varchar,
        "protectionLockedUntil" TIMESTAMPTZ,
        "protectionReason" varchar,
        "protectionCaseNumber" varchar,
        CONSTRAINT "UQ_host_profiles_userId" UNIQUE ("userId"),
        CONSTRAINT "FK_host_profiles_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_host_profiles_agency" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "countries" (
        "code" varchar(2) PRIMARY KEY,
        "name" varchar NOT NULL,
        "currency" varchar(8) NOT NULL,
        "payoutHoldDays" int NOT NULL DEFAULT 3,
        "isActive" boolean NOT NULL DEFAULT true
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "salary_target_rules" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "countryCode" varchar(2) NOT NULL,
        "name" varchar NOT NULL,
        "requiredHours" numeric(10,2) NOT NULL DEFAULT 0,
        "requiredDays" int NOT NULL DEFAULT 0,
        "requiredBeans" bigint NOT NULL DEFAULT 0,
        "salaryAmount" bigint NOT NULL DEFAULT 0,
        "bonusAmount" bigint NOT NULL DEFAULT 0,
        "agencySharePercent" numeric(5,2) NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "salary_periods" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "label" varchar NOT NULL,
        "startsOn" date NOT NULL,
        "endsOn" date NOT NULL,
        "closed" boolean NOT NULL DEFAULT false
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "salary_lines" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "periodId" uuid NOT NULL,
        "hostProfileId" uuid NOT NULL,
        "ruleId" uuid,
        "liveHours" numeric(10,2) NOT NULL DEFAULT 0,
        "liveDays" int NOT NULL DEFAULT 0,
        "beans" bigint NOT NULL DEFAULT 0,
        "targetMet" boolean NOT NULL DEFAULT false,
        "earned" bigint NOT NULL DEFAULT 0,
        "bonus" bigint NOT NULL DEFAULT 0,
        "deductions" bigint NOT NULL DEFAULT 0,
        "agencyShare" bigint NOT NULL DEFAULT 0,
        "status" varchar NOT NULL DEFAULT 'draft',
        "deductionReason" varchar,
        "deductionCaseNumber" varchar,
        CONSTRAINT "UQ_salary_lines_period_host" UNIQUE ("periodId", "hostProfileId"),
        CONSTRAINT "FK_salary_lines_period" FOREIGN KEY ("periodId") REFERENCES "salary_periods"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_salary_lines_host" FOREIGN KEY ("hostProfileId") REFERENCES "host_profiles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_salary_lines_rule" FOREIGN KEY ("ruleId") REFERENCES "salary_target_rules"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "payout_batches" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "periodId" uuid NOT NULL,
        "status" varchar NOT NULL DEFAULT 'calculated',
        "holdDays" int NOT NULL DEFAULT 3,
        "holdUntil" TIMESTAMPTZ,
        "holdApprovedAt" TIMESTAMPTZ,
        "holdApprovedById" uuid,
        "releasedAt" TIMESTAMPTZ,
        "releasedById" uuid,
        "hostTotal" bigint NOT NULL DEFAULT 0,
        "agencyTotal" bigint NOT NULL DEFAULT 0,
        "note" varchar
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "payout_batch_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "batchId" uuid NOT NULL,
        "partyType" varchar NOT NULL,
        "partyId" uuid NOT NULL,
        "salaryLineId" uuid,
        "amount" bigint NOT NULL DEFAULT 0,
        "systemValue" bigint NOT NULL DEFAULT 0,
        "localCurrencyValue" numeric(14,2) NOT NULL DEFAULT 0,
        "localCurrency" varchar,
        "corrections" jsonb NOT NULL DEFAULT '[]',
        CONSTRAINT "FK_payout_batch_items_batch" FOREIGN KEY ("batchId") REFERENCES "payout_batches"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "complaints" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "caseNumber" varchar NOT NULL,
        "type" varchar NOT NULL,
        "status" varchar NOT NULL DEFAULT 'received',
        "severity" varchar NOT NULL DEFAULT 'medium',
        "reporterId" uuid NOT NULL,
        "reporterType" varchar NOT NULL,
        "targetId" uuid NOT NULL,
        "targetType" varchar NOT NULL,
        "summary" text NOT NULL,
        "protectionLock" boolean NOT NULL DEFAULT false,
        "salaryDeductFlag" boolean NOT NULL DEFAULT false,
        "reviewedById" uuid,
        "reviewedAt" TIMESTAMPTZ,
        CONSTRAINT "UQ_complaints_caseNumber" UNIQUE ("caseNumber")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "complaint_evidence" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "complaintId" uuid NOT NULL,
        "type" varchar NOT NULL,
        "url" varchar NOT NULL,
        CONSTRAINT "FK_complaint_evidence_complaint" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "complaint_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "complaintId" uuid NOT NULL,
        "action" varchar NOT NULL,
        "actorId" uuid NOT NULL,
        "actorType" varchar NOT NULL,
        "note" text,
        CONSTRAINT "FK_complaint_events_complaint" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sos_alerts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "caseNumber" varchar NOT NULL,
        "hostUserId" uuid NOT NULL,
        "roomId" uuid,
        "message" text,
        "status" varchar NOT NULL DEFAULT 'open',
        "assignedResellerId" uuid,
        "escalateAfterMinutes" int NOT NULL DEFAULT 5,
        "escalateAt" TIMESTAMPTZ NOT NULL,
        "acknowledgedAt" TIMESTAMPTZ,
        "acknowledgedById" uuid,
        "acknowledgedByType" varchar,
        "resolvedAt" TIMESTAMPTZ,
        "outcome" varchar,
        "trail" jsonb NOT NULL DEFAULT '[]',
        CONSTRAINT "UQ_sos_alerts_caseNumber" UNIQUE ("caseNumber")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rooms" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "hostProfileId" uuid NOT NULL,
        "title" varchar NOT NULL,
        "status" varchar NOT NULL DEFAULT 'open',
        "backgroundAssetId" uuid,
        CONSTRAINT "FK_rooms_host" FOREIGN KEY ("hostProfileId") REFERENCES "host_profiles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_rooms_background" FOREIGN KEY ("backgroundAssetId") REFERENCES "catalog_items"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "room_staff" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "roomId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "canMute" boolean NOT NULL DEFAULT true,
        CONSTRAINT "UQ_room_staff_room_user" UNIQUE ("roomId", "userId"),
        CONSTRAINT "FK_room_staff_room" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_room_staff_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "room_moderation_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "roomId" uuid NOT NULL,
        "action" varchar NOT NULL,
        "actorUserId" uuid NOT NULL,
        "targetUserId" uuid NOT NULL,
        "reason" varchar,
        CONSTRAINT "FK_room_moderation_events_room" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "room_blacklists" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "roomId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "createdByUserId" uuid NOT NULL,
        "reason" varchar,
        CONSTRAINT "UQ_room_blacklists_room_user" UNIQUE ("roomId", "userId"),
        CONSTRAINT "FK_room_blacklists_room" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_room_blacklists_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_devices" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "userId" uuid NOT NULL,
        "deviceId" varchar NOT NULL,
        "deviceName" varchar,
        "lastSeenAt" TIMESTAMPTZ NOT NULL,
        "isNew" boolean NOT NULL DEFAULT false,
        CONSTRAINT "UQ_user_devices_user_device" UNIQUE ("userId", "deviceId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "userId" uuid NOT NULL,
        "deviceId" varchar,
        "refreshTokenId" uuid,
        "lastSeenAt" TIMESTAMPTZ NOT NULL,
        "revokedAt" TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_sessions_userId" ON "user_sessions" ("userId")`);

    await queryRunner.query(`
      CREATE TABLE "account_freezes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "ownerType" varchar NOT NULL,
        "ownerId" uuid NOT NULL,
        "freezeType" varchar NOT NULL,
        "status" varchar NOT NULL DEFAULT 'pending_review',
        "reason" text NOT NULL,
        "createdById" uuid,
        "createdByType" varchar,
        "reviewedById" uuid,
        "reviewedAt" TIMESTAMPTZ,
        "reviewNote" varchar
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_account_freezes_owner" ON "account_freezes" ("ownerType", "ownerId")`);

    await queryRunner.query(`
      CREATE TABLE "fraud_cases" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "caseNumber" varchar NOT NULL,
        "freezeId" uuid,
        "ownerType" varchar NOT NULL,
        "ownerId" uuid NOT NULL,
        "signal" varchar NOT NULL,
        "status" varchar NOT NULL DEFAULT 'open',
        "ledgerRefs" jsonb,
        "note" text,
        CONSTRAINT "UQ_fraud_cases_caseNumber" UNIQUE ("caseNumber")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "backup_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "enabled" boolean NOT NULL DEFAULT true,
        "intervalHours" int NOT NULL DEFAULT 24,
        "lastRunAt" TIMESTAMPTZ,
        "disabledReason" varchar
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "backup_runs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        "status" varchar NOT NULL DEFAULT 'running',
        "manual" boolean NOT NULL DEFAULT false,
        "path" varchar,
        "snapshot" jsonb,
        "error" text,
        "triggeredById" uuid
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "backup_runs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "backup_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fraud_cases"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "account_freezes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_devices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "room_blacklists"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "room_moderation_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "room_staff"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rooms"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sos_alerts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "complaint_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "complaint_evidence"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "complaints"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payout_batch_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payout_batches"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "salary_lines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "salary_periods"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "salary_target_rules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "countries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "host_profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agencies"`);
    await queryRunner.query(`ALTER TABLE "admin_action_logs" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "admin_action_logs" DROP COLUMN IF EXISTS "caseNumber"`);
    await queryRunner.query(`ALTER TABLE "admin_action_logs" DROP COLUMN IF EXISTS "reason"`);
    await queryRunner.query(`ALTER TABLE "reseller_permissions" DROP COLUMN IF EXISTS "canViewComplaintEvidence"`);
    await queryRunner.query(`ALTER TABLE "reseller_permissions" DROP COLUMN IF EXISTS "canViewSosAlerts"`);
    await queryRunner.query(`ALTER TABLE "resellers" DROP COLUMN IF EXISTS "officialId"`);
    await queryRunner.query(`ALTER TABLE "resellers" DROP COLUMN IF EXISTS "isOfficial"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "officialId"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "isOfficial"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordHash"`);
  }
}
