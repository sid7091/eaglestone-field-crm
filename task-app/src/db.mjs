import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.TASK_DB_PATH || join(DATA_DIR, "tasks.db");

export const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'OPERATOR',
  department  TEXT NOT NULL DEFAULT 'PRODUCTION',
  phone       TEXT,
  isActive    INTEGER NOT NULL DEFAULT 1,
  regionCode  TEXT NOT NULL DEFAULT 'RJ',
  reportsTo   TEXT REFERENCES users(id),
  createdAt   TEXT NOT NULL,
  updatedAt   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  description     TEXT,
  regionCode      TEXT NOT NULL,
  assignedById    TEXT NOT NULL REFERENCES users(id),
  assignedToId    TEXT NOT NULL REFERENCES users(id),
  parentTaskId    TEXT REFERENCES tasks(id),
  rootTaskId      TEXT,
  decomposition   TEXT NOT NULL DEFAULT 'NONE',
  status          TEXT NOT NULL DEFAULT 'PENDING',
  priority        TEXT NOT NULL DEFAULT 'MEDIUM',
  deadline        TEXT NOT NULL,
  completedAt     TEXT,
  completedOnTime INTEGER,
  templateId      TEXT,
  createdAt       TEXT NOT NULL,
  updatedAt       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_region_status ON tasks(regionCode, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignedToId, status);
CREATE INDEX IF NOT EXISTS idx_tasks_root ON tasks(rootTaskId);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parentTaskId);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);

CREATE TABLE IF NOT EXISTS task_templates (
  id                   TEXT PRIMARY KEY,
  name                 TEXT UNIQUE NOT NULL,
  description          TEXT,
  defaultPriority      TEXT NOT NULL DEFAULT 'MEDIUM',
  defaultDeadlineHours INTEGER NOT NULL DEFAULT 48,
  createdById          TEXT NOT NULL REFERENCES users(id),
  isActive             INTEGER NOT NULL DEFAULT 1,
  createdAt            TEXT NOT NULL,
  updatedAt            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_template_steps (
  id                  TEXT PRIMARY KEY,
  templateId          TEXT NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  assigneeRole        TEXT,
  assigneeDepartment  TEXT,
  assigneeUserId      TEXT REFERENCES users(id),
  priority            TEXT NOT NULL DEFAULT 'MEDIUM',
  deadlineOffsetHours INTEGER NOT NULL DEFAULT 0,
  orderIndex          INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_steps_template ON task_template_steps(templateId);

CREATE TABLE IF NOT EXISTS user_gamification (
  userId               TEXT PRIMARY KEY REFERENCES users(id),
  currentStreak        INTEGER NOT NULL DEFAULT 0,
  bestStreak           INTEGER NOT NULL DEFAULT 0,
  totalPoints          INTEGER NOT NULL DEFAULT 0,
  tasksCompletedOnTime INTEGER NOT NULL DEFAULT 0,
  tasksCompletedLate   INTEGER NOT NULL DEFAULT 0,
  badges               TEXT NOT NULL DEFAULT '[]',
  lastCompletionAt     TEXT,
  updatedAt            TEXT NOT NULL
);
`);

export function nowISO() {
  return new Date().toISOString();
}

export function newId() {
  return crypto.randomUUID();
}

/** Run fn inside a transaction; rolls back on throw. */
export function tx(fn) {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
