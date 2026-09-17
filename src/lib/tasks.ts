/**
 * Shared server-side helpers for the internal task-assignment feature.
 * Used by the Next.js API routes under /api/tasks, /api/task-templates, /api/users.
 */

export type Role = "ADMIN" | "MANAGER" | "SUPERVISOR" | "OPERATOR" | "VIEWER";

export const ROLE_RANK: Record<string, number> = {
  ADMIN: 5,
  MANAGER: 4,
  SUPERVISOR: 3,
  OPERATOR: 2,
  VIEWER: 1,
};

export const SENIOR_ROLES = ["ADMIN", "MANAGER"];
export const ORIGINATOR_ROLES = ["ADMIN", "MANAGER", "SUPERVISOR"];

export const MAX_TASK_DEPTH = 6;

export interface ActorLike {
  id: string;
  role: string;
  regionCode: string;
}

export interface TargetLike {
  id: string;
  role: string;
  regionCode: string;
  isActive: boolean;
}

/** Can `actor` assign a task to `target`? */
export function canAssign(actor: ActorLike, target: TargetLike): boolean {
  if (!target.isActive) return false;
  if (actor.id === target.id) return false;

  switch (actor.role) {
    case "ADMIN":
      return true;
    case "MANAGER":
      return target.regionCode === actor.regionCode;
    case "SUPERVISOR":
      return (
        target.regionCode === actor.regionCode &&
        (ROLE_RANK[target.role] ?? 0) < ROLE_RANK.SUPERVISOR
      );
    case "OPERATOR":
      return (
        target.regionCode === actor.regionCode &&
        (ROLE_RANK[target.role] ?? 0) <= ROLE_RANK.OPERATOR
      );
    default:
      return false;
  }
}

export function canOriginate(role: string): boolean {
  return ORIGINATOR_ROLES.includes(role);
}

export function isSenior(role: string): boolean {
  return SENIOR_ROLES.includes(role);
}

// ─── Visibility ──────────────────────────────────────────────────────────────

export interface ChainTask {
  id: string;
  assignedToId: string;
  assignedById: string;
  parentTaskId: string | null;
}

/**
 * Filter a full task chain to what `actor` may see.
 *  - Senior roles see the entire chain.
 *  - Everyone else: their own tasks, tasks they assigned, and the single
 *    task one level directly above one of their own tasks.
 */
export function visibleTaskIds<T extends ChainTask>(
  actor: { id: string; role: string },
  chain: T[],
): Set<string> {
  if (isSenior(actor.role)) return new Set(chain.map((t) => t.id));

  const byId = new Map(chain.map((t) => [t.id, t]));
  const visible = new Set<string>();

  for (const t of chain) {
    const mine = t.assignedToId === actor.id;
    const delegatedByMe = t.assignedById === actor.id;
    if (mine || delegatedByMe) {
      visible.add(t.id);
      if (mine && t.parentTaskId && byId.has(t.parentTaskId)) {
        visible.add(t.parentTaskId);
      }
    }
  }
  return visible;
}

// ─── Gamification scoring ────────────────────────────────────────────────────

const BASE_POINTS = 10;
const PRIORITY_MULTIPLIER: Record<string, number> = {
  URGENT: 2,
  HIGH: 1.5,
  MEDIUM: 1,
  LOW: 0.5,
};

export function computePoints(
  priority: string,
  deadline: Date,
  completedAt: Date,
): number {
  if (completedAt.getTime() > deadline.getTime()) return 0;
  let points = BASE_POINTS;
  const hoursEarly =
    (deadline.getTime() - completedAt.getTime()) / 3_600_000;
  if (hoursEarly > 72) points += 10;
  else if (hoursEarly > 24) points += 5;
  return Math.round(points * (PRIORITY_MULTIPLIER[priority] ?? 1));
}

const BADGE_RULES: { code: string; test: (s: GamificationState) => boolean }[] =
  [
    { code: "STREAK_5", test: (s) => s.currentStreak >= 5 },
    { code: "STREAK_10", test: (s) => s.currentStreak >= 10 },
    { code: "STREAK_25", test: (s) => s.currentStreak >= 25 },
    { code: "STREAK_50", test: (s) => s.currentStreak >= 50 },
    { code: "POINTS_100", test: (s) => s.totalPoints >= 100 },
    { code: "POINTS_500", test: (s) => s.totalPoints >= 500 },
    { code: "POINTS_1000", test: (s) => s.totalPoints >= 1000 },
  ];

export interface GamificationState {
  currentStreak: number;
  totalPoints: number;
}

export function earnedBadges(
  existing: string[],
  state: GamificationState,
): string[] {
  const set = new Set(existing);
  for (const rule of BADGE_RULES) if (rule.test(state)) set.add(rule.code);
  return Array.from(set);
}

export function isOverdue(status: string, deadline: Date | string): boolean {
  const open = [
    "PENDING",
    "IN_PROGRESS",
    "FORWARDED",
    "BLOCKED_BY_SUBTASKS",
  ];
  return (
    open.includes(status) && new Date(deadline).getTime() < Date.now()
  );
}
