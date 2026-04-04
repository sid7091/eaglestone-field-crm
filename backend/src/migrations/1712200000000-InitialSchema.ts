import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * InitialSchema — baseline migration that creates all tables from scratch.
 *
 * Uses raw SQL via queryRunner.query() so that PostGIS geography types,
 * partial unique indexes, JSONB columns, and native PG enums are expressed
 * exactly as needed rather than through the TypeORM schema builder.
 *
 * All CREATE TABLE / CREATE INDEX statements use IF NOT EXISTS for
 * idempotency; the down() method tears everything down in reverse
 * dependency order.
 */
export class InitialSchema1712200000000 implements MigrationInterface {
  public name = "InitialSchema1712200000000";

  // ─────────────────────────────────────────────────────────────────────────
  // UP
  // ─────────────────────────────────────────────────────────────────────────
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 0. Required extensions ────────────────────────────────────────────
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "postgis"`);

    // ── 1. Enum types ─────────────────────────────────────────────────────
    // TypeORM creates enum types named <table>_<column>_enum.  We follow
    // that convention so TypeORM's introspection stays consistent.

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "users_role_enum" AS ENUM (
          'ADMIN', 'REGIONAL_MANAGER', 'AREA_MANAGER', 'FIELD_REP', 'VIEWER'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "region_code_enum" AS ENUM (
          'AP','AR','AS','BR','CG','GA','GJ','HR','HP','JH',
          'KA','KL','MP','MH','MN','ML','MZ','NL','OD','PB',
          'RJ','SK','TN','TG','TR','UP','UK','WB','DL','JK'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "customers_customertype_enum" AS ENUM (
          'DEALER', 'ARCHITECT', 'BUILDER', 'CONTRACTOR',
          'DIRECT_CLIENT', 'QUARRY_OWNER'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "customers_tier_enum" AS ENUM (
          'PLATINUM', 'GOLD', 'SILVER', 'BRONZE'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "customers_leadstatus_enum" AS ENUM (
          'NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT',
          'NEGOTIATION', 'WON', 'LOST', 'DORMANT'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "visits_purpose_enum" AS ENUM (
          'SALES_PITCH', 'SAMPLE_DELIVERY', 'ORDER_FOLLOWUP',
          'COMPLAINT_RESOLUTION', 'PAYMENT_COLLECTION',
          'RELATIONSHIP_BUILDING', 'SITE_SURVEY'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "visits_status_enum" AS ENUM (
          'PLANNED', 'CHECKED_IN', 'IN_PROGRESS', 'CHECKED_OUT',
          'COMPLETED', 'CANCELLED', 'FLAGGED_FAKE'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "inventory_status_enum" AS ENUM (
          'IN_STOCK', 'RESERVED', 'IN_TRANSIT',
          'DELIVERED', 'RETURNED', 'DAMAGED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "sync_queue_entitytype_enum" AS ENUM (
          'CUSTOMER', 'VISIT', 'INVENTORY', 'USER', 'ORDER'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "sync_queue_direction_enum" AS ENUM (
          'OUTBOUND', 'INBOUND'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "sync_queue_status_enum" AS ENUM (
          'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'DEAD_LETTER'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ── 2. users ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"            UUID                  NOT NULL DEFAULT uuid_generate_v4(),
        "email"         VARCHAR(255)          NOT NULL,
        "passwordHash"  VARCHAR(255)          NOT NULL,
        "fullName"      VARCHAR(150)          NOT NULL,
        "phone"         VARCHAR(20)           NOT NULL,
        "role"          "users_role_enum"     NOT NULL DEFAULT 'FIELD_REP',
        "regionCode"    "region_code_enum"    NOT NULL,
        "district"      VARCHAR(100)              NULL,
        "territory"     VARCHAR(100)              NULL,
        "reportsTo"     UUID                      NULL,
        "isActive"      BOOLEAN               NOT NULL DEFAULT TRUE,
        "erpMetadata"   JSONB                     NULL DEFAULT '{}',
        "createdAt"     TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
        "updatedAt"     TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_users_id"    PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    // @Index(["regionCode", "role"])
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_regionCode_role"
        ON "users" ("regionCode", "role")
    `);

    // ── 3. customers ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customers" (
        "id"                   UUID                            NOT NULL DEFAULT uuid_generate_v4(),
        "businessName"         VARCHAR(255)                    NOT NULL,
        "contactPerson"        VARCHAR(255)                        NULL,
        "phone"                VARCHAR(20)                     NOT NULL,
        "altPhone"             VARCHAR(20)                         NULL,
        "email"                VARCHAR(255)                        NULL,
        "gstin"                VARCHAR(20)                         NULL,
        "pan"                  VARCHAR(20)                         NULL,
        "customerType"         "customers_customertype_enum"   NOT NULL,
        "tier"                 "customers_tier_enum"           NOT NULL DEFAULT 'BRONZE',
        "leadStatus"           "customers_leadstatus_enum"     NOT NULL DEFAULT 'NEW',
        "regionCode"           "region_code_enum"              NOT NULL,
        "district"             VARCHAR(100)                    NOT NULL,
        "city"                 VARCHAR(100)                        NULL,
        "address"              TEXT                            NOT NULL,
        "pincode"              VARCHAR(10)                         NULL,
        "location"             JSONB                               NULL,
        "geoPoint"             geography(Point, 4326)              NULL,
        "preferredMaterials"   TEXT[]                          NOT NULL DEFAULT '{}',
        "annualPotentialINR"   DECIMAL(15, 2)                  NOT NULL DEFAULT 0,
        "lifetimeValueINR"     DECIMAL(15, 2)                  NOT NULL DEFAULT 0,
        "notes"                TEXT                                NULL,
        "erpMetadata"          JSONB                               NULL DEFAULT '{}',
        "createdAt"            TIMESTAMPTZ                     NOT NULL DEFAULT NOW(),
        "updatedAt"            TIMESTAMPTZ                     NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_customers_id" PRIMARY KEY ("id")
      )
    `);

    // @Index(["regionCode", "leadStatus"])
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customers_regionCode_leadStatus"
        ON "customers" ("regionCode", "leadStatus")
    `);

    // @Index(["regionCode", "customerType"])
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customers_regionCode_customerType"
        ON "customers" ("regionCode", "customerType")
    `);

    // @Index(["gstin"], { unique: true, where: "gstin IS NOT NULL" })
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_customers_gstin_unique_notnull"
        ON "customers" ("gstin")
       WHERE "gstin" IS NOT NULL
    `);

    // ── 4. visits ─────────────────────────────────────────────────────────
    // visits depends on users (fieldRepId) and customers (customerId)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "visits" (
        "id"                   UUID                        NOT NULL DEFAULT uuid_generate_v4(),
        "regionCode"           "region_code_enum"          NOT NULL,
        "visitDate"            DATE                        NOT NULL,
        "purpose"              "visits_purpose_enum"       NOT NULL,
        "status"               "visits_status_enum"        NOT NULL DEFAULT 'PLANNED',
        "checkinTime"          TIMESTAMPTZ                     NULL,
        "checkoutTime"         TIMESTAMPTZ                     NULL,
        "durationMinutes"      INT                             NULL,
        "checkinLocation"      JSONB                           NULL,
        "checkoutLocation"     JSONB                           NULL,
        "geofenceValidation"   JSONB                           NULL,
        "summary"              TEXT                            NULL,
        "actionItems"          TEXT                            NULL,
        "nextSteps"            TEXT                            NULL,
        "followUpDate"         DATE                            NULL,
        "orderValueINR"        DECIMAL(15, 2)                  NULL,
        "photoUrls"            TEXT[]                      NOT NULL DEFAULT '{}',
        "createdOffline"       BOOLEAN                     NOT NULL DEFAULT FALSE,
        "offlineId"            UUID                            NULL,
        "syncedAt"             TIMESTAMPTZ                     NULL,
        "erpMetadata"          JSONB                           NULL DEFAULT '{}',
        "fieldRepId"           UUID                        NOT NULL,
        "customerId"           UUID                        NOT NULL,
        "createdAt"            TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
        "updatedAt"            TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_visits_id"          PRIMARY KEY ("id"),
        CONSTRAINT "UQ_visits_offlineId"   UNIQUE ("offlineId"),
        CONSTRAINT "FK_visits_fieldRepId"
          FOREIGN KEY ("fieldRepId") REFERENCES "users" ("id")
          ON DELETE RESTRICT,
        CONSTRAINT "FK_visits_customerId"
          FOREIGN KEY ("customerId") REFERENCES "customers" ("id")
          ON DELETE RESTRICT
      )
    `);

    // @Index(["regionCode", "visitDate"])
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_visits_regionCode_visitDate"
        ON "visits" ("regionCode", "visitDate")
    `);

    // @Index(["fieldRepId", "visitDate"])
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_visits_fieldRepId_visitDate"
        ON "visits" ("fieldRepId", "visitDate")
    `);

    // @Index(["customerId", "visitDate"])
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_visits_customerId_visitDate"
        ON "visits" ("customerId", "visitDate")
    `);

    // @Index(["status"])
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_visits_status"
        ON "visits" ("status")
    `);

    // ── 5. inventory ──────────────────────────────────────────────────────
    // inventory has an optional FK to customers (reservedForCustomerId)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory" (
        "id"                      UUID                        NOT NULL DEFAULT uuid_generate_v4(),
        "regionCode"              "region_code_enum"          NOT NULL,
        "sku"                     VARCHAR(50)                 NOT NULL,
        "materialType"            VARCHAR(100)                NOT NULL,
        "variety"                 VARCHAR(100)                NOT NULL,
        "color"                   VARCHAR(50)                 NOT NULL,
        "finishType"              VARCHAR(50)                 NOT NULL,
        "grade"                   VARCHAR(10)                 NOT NULL,
        "lengthCm"                DECIMAL(8, 2)               NOT NULL,
        "widthCm"                 DECIMAL(8, 2)               NOT NULL,
        "thicknessMm"             DECIMAL(6, 2)               NOT NULL,
        "quantityAvailable"       INT                         NOT NULL DEFAULT 1,
        "quantityReserved"        INT                         NOT NULL DEFAULT 0,
        "pricePerSqftINR"         DECIMAL(12, 2)              NOT NULL,
        "landedCostPerSqftINR"    DECIMAL(12, 2)                  NULL,
        "warehouseCode"           VARCHAR(50)                 NOT NULL,
        "rackLocation"            VARCHAR(100)                    NULL,
        "bundleNumber"            VARCHAR(50)                     NULL,
        "blockReference"          VARCHAR(100)                    NULL,
        "status"                  "inventory_status_enum"     NOT NULL DEFAULT 'IN_STOCK',
        "reservedForCustomerId"   UUID                            NULL,
        "reservedDate"            TIMESTAMPTZ                     NULL,
        "soldDate"                TIMESTAMPTZ                     NULL,
        "notes"                   TEXT                            NULL,
        "erpMetadata"             JSONB                           NULL DEFAULT '{}',
        "createdAt"               TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
        "updatedAt"               TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_inventory_id"  PRIMARY KEY ("id"),
        CONSTRAINT "UQ_inventory_sku" UNIQUE ("sku"),
        CONSTRAINT "FK_inventory_reservedForCustomerId"
          FOREIGN KEY ("reservedForCustomerId") REFERENCES "customers" ("id")
          ON DELETE SET NULL
      )
    `);

    // @Index(["regionCode", "status"])
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inventory_regionCode_status"
        ON "inventory" ("regionCode", "status")
    `);

    // @Index(["materialType", "variety"])
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inventory_materialType_variety"
        ON "inventory" ("materialType", "variety")
    `);

    // @Index(["warehouseCode"])
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inventory_warehouseCode"
        ON "inventory" ("warehouseCode")
    `);

    // ── 6. sync_queue ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sync_queue" (
        "id"               UUID                            NOT NULL DEFAULT uuid_generate_v4(),
        "entityType"       "sync_queue_entitytype_enum"   NOT NULL,
        "entityId"         UUID                            NOT NULL,
        "direction"        "sync_queue_direction_enum"    NOT NULL DEFAULT 'OUTBOUND',
        "regionCode"       "region_code_enum"             NOT NULL,
        "payload"          JSONB                          NOT NULL,
        "targetSystem"     VARCHAR(50)                    NOT NULL DEFAULT 'odoo',
        "status"           "sync_queue_status_enum"       NOT NULL DEFAULT 'PENDING',
        "retryCount"       INT                            NOT NULL DEFAULT 0,
        "maxRetries"       INT                            NOT NULL DEFAULT 5,
        "scheduledAt"      TIMESTAMPTZ                   NOT NULL DEFAULT NOW(),
        "processedAt"      TIMESTAMPTZ                       NULL,
        "lastError"        TEXT                              NULL,
        "responsePayload"  JSONB                             NULL,
        "idempotencyKey"   VARCHAR(255)                   NOT NULL,
        "createdAt"        TIMESTAMPTZ                   NOT NULL DEFAULT NOW(),
        "updatedAt"        TIMESTAMPTZ                   NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_sync_queue_id"              PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sync_queue_idempotencyKey"  UNIQUE ("idempotencyKey")
      )
    `);

    // @Index(["status", "scheduledAt"])
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sync_queue_status_scheduledAt"
        ON "sync_queue" ("status", "scheduledAt")
    `);

    // @Index(["entityType", "entityId"])
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sync_queue_entityType_entityId"
        ON "sync_queue" ("entityType", "entityId")
    `);

    // @Index(["regionCode", "status"])
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sync_queue_regionCode_status"
        ON "sync_queue" ("regionCode", "status")
    `);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DOWN — reverse dependency order
  // ─────────────────────────────────────────────────────────────────────────
  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── Indexes (dropped implicitly with their tables, but be explicit) ──
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sync_queue_regionCode_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sync_queue_entityType_entityId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sync_queue_status_scheduledAt"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sync_queue"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inventory_warehouseCode"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inventory_materialType_variety"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inventory_regionCode_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_visits_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_visits_customerId_visitDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_visits_fieldRepId_visitDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_visits_regionCode_visitDate"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "visits"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customers_gstin_unique_notnull"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customers_regionCode_customerType"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customers_regionCode_leadStatus"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customers"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_regionCode_role"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    // ── Enum types ────────────────────────────────────────────────────────
    await queryRunner.query(`DROP TYPE IF EXISTS "sync_queue_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sync_queue_direction_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sync_queue_entitytype_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "inventory_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "visits_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "visits_purpose_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "customers_leadstatus_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "customers_tier_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "customers_customertype_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "region_code_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
  }
}
