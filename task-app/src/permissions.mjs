export const ROLES = ["VIEWER", "OPERATOR", "SUPERVISOR", "MANAGER", "ADMIN"];
export const DEPARTMENTS = [
  "PRODUCTION",
  "SALES",
  "PURCHASE",
  "ACCOUNTS",
  "HR",
  "ADMIN",
  "WAREHOUSE",
  "DISPATCH",
];

export function roleRank(role) {
  const i = ROLES.indexOf(role);
  return i < 0 ? -1 : i;
}

/** Roles that can see an entire task chain regardless of position. */
export function isSenior(role) {
  return role === "ADMIN" || role === "MANAGER";
}

/** Roles allowed to originate a brand-new top-level task. */
export function canOriginate(role) {
  return role === "ADMIN" || role === "MANAGER" || role === "SUPERVISOR";
}

/**
 * Can `actor` assign work to `target`?
 *  - ADMIN      → anyone active
 *  - MANAGER    → anyone active in the same region
 *  - SUPERVISOR → active users in same region with a strictly lower role rank
 *  - OPERATOR   → same region, role rank <= own (peers/juniors) — only ever
 *                 reached via forward/split of a task already theirs
 *  - VIEWER     → never
 */
export function canAssign(actor, target) {
  if (!target || !target.isActive) return false;
  if (actor.id === target.id) return false;
  switch (actor.role) {
    case "ADMIN":
      return true;
    case "MANAGER":
      return target.regionCode === actor.regionCode;
    case "SUPERVISOR":
      return (
        target.regionCode === actor.regionCode &&
        roleRank(target.role) < roleRank("SUPERVISOR")
      );
    case "OPERATOR":
      return (
        target.regionCode === actor.regionCode &&
        roleRank(target.role) <= roleRank("OPERATOR")
      );
    default:
      return false;
  }
}

/** Region scoping for list/read queries. ADMIN sees all regions. */
export function regionScope(actor) {
  return actor.role === "ADMIN" ? null : actor.regionCode;
}
