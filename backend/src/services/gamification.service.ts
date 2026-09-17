import { EntityManager } from "typeorm";
import { UserGamification } from "../entities/UserGamification";
import { Task } from "../entities/Task";
import { TaskPriority } from "../types/enums";

const BASE_POINTS = 10;

const PRIORITY_MULTIPLIER: Record<TaskPriority, number> = {
  [TaskPriority.URGENT]: 2,
  [TaskPriority.HIGH]: 1.5,
  [TaskPriority.MEDIUM]: 1,
  [TaskPriority.LOW]: 0.5,
};

const BADGE_RULES: { code: string; test: (g: UserGamification) => boolean }[] = [
  { code: "STREAK_5", test: (g) => g.currentStreak >= 5 },
  { code: "STREAK_10", test: (g) => g.currentStreak >= 10 },
  { code: "STREAK_25", test: (g) => g.currentStreak >= 25 },
  { code: "STREAK_50", test: (g) => g.currentStreak >= 50 },
  { code: "POINTS_100", test: (g) => g.totalPoints >= 100 },
  { code: "POINTS_500", test: (g) => g.totalPoints >= 500 },
  { code: "POINTS_1000", test: (g) => g.totalPoints >= 1000 },
];

function computePoints(task: Task, completedAt: Date): number {
  const onTime = completedAt.getTime() <= task.deadline.getTime();
  if (!onTime) return 0;

  let points = BASE_POINTS;
  const hoursEarly =
    (task.deadline.getTime() - completedAt.getTime()) / 3_600_000;
  if (hoursEarly > 72) points += 10;
  else if (hoursEarly > 24) points += 5;

  return Math.round(points * PRIORITY_MULTIPLIER[task.priority]);
}

async function getOrCreate(
  manager: EntityManager,
  userId: string,
): Promise<UserGamification> {
  const repo = manager.getRepository(UserGamification);
  let row = await repo.findOne({ where: { userId } });
  if (!row) {
    row = repo.create({ userId });
    await repo.save(row);
  }
  return row;
}

/**
 * Award streak/points/badges for a single task the user personally completed.
 * Must run inside the same transaction as the task completion.
 * Never called for parent auto-completion (avoids double-counting).
 */
export async function recordCompletion(
  manager: EntityManager,
  userId: string,
  task: Task,
  completedAt: Date,
): Promise<UserGamification> {
  const g = await getOrCreate(manager, userId);
  const onTime = completedAt.getTime() <= task.deadline.getTime();

  if (onTime) {
    g.currentStreak += 1;
    g.bestStreak = Math.max(g.bestStreak, g.currentStreak);
    g.tasksCompletedOnTime += 1;
    g.totalPoints += computePoints(task, completedAt);
  } else {
    g.currentStreak = 0;
    g.tasksCompletedLate += 1;
  }

  g.lastCompletionAt = completedAt;

  const earned = new Set(g.badges);
  for (const rule of BADGE_RULES) {
    if (rule.test(g)) earned.add(rule.code);
  }
  g.badges = Array.from(earned);

  return manager.getRepository(UserGamification).save(g);
}
