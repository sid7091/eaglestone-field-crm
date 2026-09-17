import { Task } from "../entities/Task";
import { UserRole } from "../types/enums";

interface Actor {
  sub: string;
  role: UserRole;
}

const SENIOR_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.REGIONAL_MANAGER];

export function isSenior(role: UserRole): boolean {
  return SENIOR_ROLES.includes(role);
}

/**
 * Given every task in a chain (same rootTaskId), return the subset the actor
 * may see.
 *
 *  - Senior roles (ADMIN / REGIONAL_MANAGER) see the entire chain. Region
 *    scoping for REGIONAL_MANAGER is enforced separately at the query layer.
 *  - Everyone else sees only:
 *      • tasks assigned to them
 *      • tasks they assigned (delegated / split)
 *      • the single task directly above one of their own tasks (one level up)
 */
export function visibleTasks(actor: Actor, chain: Task[]): Task[] {
  if (isSenior(actor.role)) return chain;

  const byId = new Map(chain.map((t) => [t.id, t]));
  const visible = new Map<string, Task>();

  for (const t of chain) {
    const mine = t.assignedToId === actor.sub;
    const delegatedByMe = t.assignedById === actor.sub;
    if (mine || delegatedByMe) {
      visible.set(t.id, t);
      // one level up: the parent of a task assigned to me
      if (mine && t.parentTaskId) {
        const parent = byId.get(t.parentTaskId);
        if (parent) visible.set(parent.id, parent);
      }
    }
  }

  return chain.filter((t) => visible.has(t.id));
}

export function canViewTask(actor: Actor, chain: Task[], taskId: string): boolean {
  return visibleTasks(actor, chain).some((t) => t.id === taskId);
}
