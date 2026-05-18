import { isSenior } from "./permissions.mjs";

/**
 * Given every task in one chain (same rootTaskId), return the subset `actor`
 * may see.
 *
 *  - Senior roles (ADMIN / MANAGER) see the entire chain. Region scoping for
 *    MANAGER is applied at the query layer before this is called.
 *  - Everyone else sees only:
 *      • tasks assigned to them
 *      • tasks they assigned (delegated / split)
 *      • the single task directly above one of their own (one level up)
 */
export function visibleTasks(actor, chain) {
  if (isSenior(actor.role)) return chain;

  const byId = new Map(chain.map((t) => [t.id, t]));
  const keep = new Set();

  for (const t of chain) {
    const mine = t.assignedToId === actor.id;
    const delegatedByMe = t.assignedById === actor.id;
    if (mine || delegatedByMe) {
      keep.add(t.id);
      if (mine && t.parentTaskId && byId.has(t.parentTaskId)) {
        keep.add(t.parentTaskId); // one level up
      }
    }
  }
  return chain.filter((t) => keep.has(t.id));
}

export function canViewTask(actor, chain, taskId) {
  return visibleTasks(actor, chain).some((t) => t.id === taskId);
}
