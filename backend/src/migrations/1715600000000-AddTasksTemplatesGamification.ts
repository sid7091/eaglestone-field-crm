import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * AddTasksTemplatesGamification — internal task-assignment feature.
 *
 * Adds: users.department column, tasks, task_templates,
 * task_template_steps, user_gamification. Raw SQL for native PG enums
 * and IF NOT EXISTS idempotency, matching InitialSchema's conventions.
 */
export class AddTasksTemplatesGamification1715600000000
  implements MigrationInterface
{
  public name = "AddTasksTemplatesGamification1715600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Enum types ────────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "department_enum" AS ENUM (
          'SALES','WAREHOUSE','ACCOUNTS','DISPATCH','OPERATIONS','FIELD','ADMIN'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "tasks_status_enum" AS ENUM (
          'PENDING','IN_PROGRESS','FORWARDED','BLOCKED_BY_SUBTASKS',
          'COMPLETED','CANCELLED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "tasks_priority_enum" AS ENUM (
          'LOW','MEDIUM','HIGH','URGENT'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "tasks_decomposition_enum" AS ENUM (
          'NONE','FORWARDED','SUBTASKS'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ── users.department ──────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "department" "department_enum" NULL
    `);

    // ── tasks ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tasks" (
        "id"               UUID                          NOT NULL DEFAULT uuid_generate_v4(),
        "title"            VARCHAR(200)                  NOT NULL,
        "description"      TEXT                              NULL,
        "regionCode"       "region_code_enum"            NOT NULL,
        "assignedById"     UUID                          NOT NULL,
        "assignedToId"     UUID                          NOT NULL,
        "parentTaskId"     UUID                              NULL,
        "rootTaskId"       UUID                              NULL,
        "decomposition"    "tasks_decomposition_enum"    NOT NULL DEFAULT 'NONE',
        "status"           "tasks_status_enum"           NOT NULL DEFAULT 'PENDING',
        "priority"         "tasks_priority_enum"         NOT NULL DEFAULT 'MEDIUM',
        "deadline"         TIMESTAMPTZ                   NOT NULL,
        "completedAt"      TIMESTAMPTZ                       NULL,
        "completedOnTime"  BOOLEAN                          NULL,
        "templateId"       UUID                              NULL,
        "createdAt"        TIMESTAMPTZ                   NOT NULL DEFAULT NOW(),
        "updatedAt"        TIMESTAMPTZ                   NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_tasks_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tasks_assignedById"
          FOREIGN KEY ("assignedById") REFERENCES "users" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_tasks_assignedToId"
          FOREIGN KEY ("assignedToId") REFERENCES "users" ("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tasks_regionCode_status"
        ON "tasks" ("regionCode", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tasks_assignedToId_status"
        ON "tasks" ("assignedToId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tasks_rootTaskId"
        ON "tasks" ("rootTaskId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tasks_parentTaskId"
        ON "tasks" ("parentTaskId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tasks_deadline"
        ON "tasks" ("deadline")
    `);

    // ── task_templates ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "task_templates" (
        "id"                    UUID                    NOT NULL DEFAULT uuid_generate_v4(),
        "name"                  VARCHAR(150)            NOT NULL,
        "description"           TEXT                        NULL,
        "defaultPriority"       "tasks_priority_enum"   NOT NULL DEFAULT 'MEDIUM',
        "defaultDeadlineHours"  INT                     NOT NULL DEFAULT 72,
        "createdById"           UUID                    NOT NULL,
        "isActive"              BOOLEAN                 NOT NULL DEFAULT TRUE,
        "createdAt"             TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
        "updatedAt"             TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_task_templates_id"   PRIMARY KEY ("id"),
        CONSTRAINT "UQ_task_templates_name" UNIQUE ("name"),
        CONSTRAINT "FK_task_templates_createdById"
          FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT
      )
    `);

    // ── task_template_steps ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "task_template_steps" (
        "id"                   UUID                    NOT NULL DEFAULT uuid_generate_v4(),
        "templateId"           UUID                    NOT NULL,
        "title"                VARCHAR(200)            NOT NULL,
        "description"          TEXT                        NULL,
        "assigneeRole"         "users_role_enum"           NULL,
        "assigneeDepartment"   "department_enum"           NULL,
        "assigneeUserId"       UUID                        NULL,
        "priority"             "tasks_priority_enum"   NOT NULL DEFAULT 'MEDIUM',
        "deadlineOffsetHours"  INT                     NOT NULL DEFAULT 0,
        "orderIndex"           INT                     NOT NULL DEFAULT 0,
        CONSTRAINT "PK_task_template_steps_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_task_template_steps_templateId"
          FOREIGN KEY ("templateId") REFERENCES "task_templates" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_task_template_steps_assigneeUserId"
          FOREIGN KEY ("assigneeUserId") REFERENCES "users" ("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_task_template_steps_templateId"
        ON "task_template_steps" ("templateId")
    `);

    // ── user_gamification ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_gamification" (
        "userId"                UUID          NOT NULL,
        "currentStreak"         INT           NOT NULL DEFAULT 0,
        "bestStreak"            INT           NOT NULL DEFAULT 0,
        "totalPoints"           INT           NOT NULL DEFAULT 0,
        "tasksCompletedOnTime"  INT           NOT NULL DEFAULT 0,
        "tasksCompletedLate"    INT           NOT NULL DEFAULT 0,
        "badges"                TEXT[]        NOT NULL DEFAULT '{}',
        "lastCompletionAt"      TIMESTAMPTZ       NULL,
        "updatedAt"             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_user_gamification_userId" PRIMARY KEY ("userId"),
        CONSTRAINT "FK_user_gamification_userId"
          FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_gamification"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_task_template_steps_templateId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "task_template_steps"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_templates"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tasks_deadline"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tasks_parentTaskId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tasks_rootTaskId"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_tasks_assignedToId_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_tasks_regionCode_status"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "tasks"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "department"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "tasks_decomposition_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tasks_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tasks_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "department_enum"`);
  }
}
