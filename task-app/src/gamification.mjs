import { db, nowISO } from "./db.mjs";

const BASE_POINTS = 10;
const PRIORITY_MULTIPLIER = { LOW: 0.5, MEDIUM: 1, HIGH: 1.5, URGENT: 2 };

function ensureRow(userId) {
  const existing = db
    .prepare("SELECT * FROM user_gamification WHERE userId = ?")
    .get(userId);
  if (existing) return existing;
  db.prepare(
    `INSERT INTO user_gamification (userId, updatedAt) VALUES (?, ?)`
  ).run(userId, nowISO());
  return db
    .prepare("SELECT * FROM user_gamification WHERE userId = ?")
    .get(userId);
}

function computePoints(task, completedAt) {
  const deadline = new Date(task.deadline).getTime();
  const done = new Date(completedAt).getTime();
  if (done > deadline) return 0; // late → no points
  const leadMs = deadline - done;
  const hours = leadMs / 3_600_000;
  let early = 0;
  if (hours > 72) early = 10;
  else if (hours > 24) early = 5;
  const mult = PRIORITY_MULTIPLIER[task.priority] ?? 1;
  return Math.round((BASE_POINTS + early) * mult);
}

function nextBadges(row) {
  const earned = new Set(JSON.parse(row.badges || "[]"));
  const add = (code) => earned.add(code);
  for (const n of [5, 10, 25, 50])
    if (row.currentStreak >= n) add(`STREAK_${n}`);
  for (const n of [100, 500, 1000])
    if (row.totalPoints >= n) add(`POINTS_${n}`);
  if (row.tasksCompletedOnTime >= 10) add("EARLY_BIRD_10");
  return JSON.stringify([...earned]);
}

/**
 * Award gamification for a real (leaf/subtask) completion. Never called for a
 * parent that auto-completes because its children finished — that would
 * double-count.
 */
export function recordCompletion(userId, task, completedAt) {
  const row = ensureRow(userId);
  const onTime = new Date(completedAt).getTime() <= new Date(task.deadline).getTime();
  const points = computePoints(task, completedAt);

  const currentStreak = onTime ? row.currentStreak + 1 : 0;
  const bestStreak = Math.max(row.bestStreak, currentStreak);
  const totalPoints = row.totalPoints + points;
  const onTimeCount = row.tasksCompletedOnTime + (onTime ? 1 : 0);
  const lateCount = row.tasksCompletedLate + (onTime ? 0 : 1);

  const updated = {
    ...row,
    currentStreak,
    bestStreak,
    totalPoints,
    tasksCompletedOnTime: onTimeCount,
    tasksCompletedLate: lateCount,
  };
  const badges = nextBadges(updated);

  db.prepare(
    `UPDATE user_gamification SET
       currentStreak = ?, bestStreak = ?, totalPoints = ?,
       tasksCompletedOnTime = ?, tasksCompletedLate = ?,
       badges = ?, lastCompletionAt = ?, updatedAt = ?
     WHERE userId = ?`
  ).run(
    currentStreak,
    bestStreak,
    totalPoints,
    onTimeCount,
    lateCount,
    badges,
    completedAt,
    nowISO(),
    userId
  );

  return { pointsAwarded: points, onTime, currentStreak, bestStreak };
}

export function getStats(userId) {
  return (
    db.prepare("SELECT * FROM user_gamification WHERE userId = ?").get(userId) || {
      userId,
      currentStreak: 0,
      bestStreak: 0,
      totalPoints: 0,
      tasksCompletedOnTime: 0,
      tasksCompletedLate: 0,
      badges: "[]",
      lastCompletionAt: null,
    }
  );
}

export function leaderboard({ regionCode, department, limit = 20 }) {
  const params = [];
  let sql = `
    SELECT g.*, u.name, u.role, u.department, u.regionCode
    FROM user_gamification g
    JOIN users u ON u.id = g.userId
    WHERE u.isActive = 1`;
  if (regionCode) {
    sql += " AND u.regionCode = ?";
    params.push(regionCode);
  }
  if (department) {
    sql += " AND u.department = ?";
    params.push(department);
  }
  sql += " ORDER BY g.totalPoints DESC, g.currentStreak DESC, g.bestStreak DESC LIMIT ?";
  params.push(limit);
  return db
    .prepare(sql)
    .all(...params)
    .map((r) => ({ ...r, badges: JSON.parse(r.badges || "[]") }));
}
