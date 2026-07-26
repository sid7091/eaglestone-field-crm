import { User } from "../entities/User";
import { UserRole } from "../types/enums";

const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.ADMIN]: 5,
  [UserRole.REGIONAL_MANAGER]: 4,
  [UserRole.AREA_MANAGER]: 3,
  [UserRole.FIELD_REP]: 2,
  [UserRole.VIEWER]: 1,
};

/**
 * Can `actor` assign a task to `target`?
 *
 *  - ADMIN            → any active user
 *  - REGIONAL_MANAGER → any active user in their region
 *  - AREA_MANAGER     → any active user in their region with a lower role
 *  - FIELD_REP        → same region, role <= own (lets a rep split a subtask
 *                       to a same-region peer in another department)
 *  - VIEWER           → never
 *
 * Origination (creating a brand-new top-level task) is additionally gated at
 * the route layer to ADMIN / REGIONAL_MANAGER / AREA_MANAGER.
 */
export function canAssign(actor: User, target: User): boolean {
  if (!target.isActive) return false;
  if (actor.id === target.id) return false;

  switch (actor.role) {
    case UserRole.ADMIN:
      return true;

    case UserRole.REGIONAL_MANAGER:
      return target.regionCode === actor.regionCode;

    case UserRole.AREA_MANAGER:
      return (
        target.regionCode === actor.regionCode &&
        ROLE_RANK[target.role] < ROLE_RANK[actor.role]
      );

    case UserRole.FIELD_REP:
      return (
        target.regionCode === actor.regionCode &&
        ROLE_RANK[target.role] <= ROLE_RANK[actor.role]
      );

    case UserRole.VIEWER:
    default:
      return false;
  }
}

/** Roles permitted to create brand-new top-level tasks. */
export const ORIGINATOR_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.REGIONAL_MANAGER,
  UserRole.AREA_MANAGER,
];

export function canOriginate(actor: { role: UserRole }): boolean {
  return ORIGINATOR_ROLES.includes(actor.role);
}
