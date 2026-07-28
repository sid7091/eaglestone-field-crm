// Org-chart domain: the graph the editor renders, plus the mutations it
// performs (move, re-parent, remove). Viewing is ADMIN + MANAGER; every
// mutation is ADMIN-only.
import { db, nowISO } from "./db.mjs";
import { TaskError } from "./tasks.mjs";
import { wouldCycle } from "./users.mjs";

const NODE_COLS =
  "id,email,name,role,department,phone,isActive,regionCode,reportsTo,chartX,chartY";

const OPEN = "status NOT IN ('COMPLETED','CANCELLED')";
const COORD_LIMIT = 100000;

export function canEditOrg(actor) {
  return actor.role === "ADMIN";
}

function requireEdit(actor) {
  if (!canEditOrg(actor))
    throw new TaskError("Only an admin can edit the org chart", 403);
}

function requireView(actor) {
  if (actor.role !== "ADMIN" && actor.role !== "MANAGER")
    throw new TaskError("Not allowed", 403);
}

function coord(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(-COORD_LIMIT, Math.min(COORD_LIMIT, n));
}

/**
 * The whole chart in one payload: flat nodes + edges, which is what a
 * free-form canvas wants (a nested tree can't express a dragged-apart
 * layout, and orphans have nowhere to live in one).
 *
 * MANAGERs get a read-only view scoped to their own region.
 */
export function orgGraph(actor, opts = {}) {
  requireView(actor);
  const includeInactive =
    opts.includeInactive === true || opts.includeInactive === "true";

  let rows = db
    .prepare(
      `SELECT ${NODE_COLS} FROM users
        ${includeInactive ? "" : "WHERE isActive=1"}
        ORDER BY name`
    )
    .all();
  if (actor.role === "MANAGER")
    rows = rows.filter((u) => u.regionCode === actor.regionCode);

  const openByUser = new Map(
    db
      .prepare(
        `SELECT assignedToId id, COUNT(*) c FROM tasks WHERE ${OPEN} GROUP BY assignedToId`
      )
      .all()
      .map((r) => [r.id, r.c])
  );

  const visible = new Set(rows.map((r) => r.id));
  const reportCount = new Map();
  for (const u of rows) {
    if (u.reportsTo && visible.has(u.reportsTo))
      reportCount.set(u.reportsTo, (reportCount.get(u.reportsTo) || 0) + 1);
  }

  const nodes = rows.map((u) => ({
    ...u,
    isActive: !!u.isActive,
    // A manager outside the visible slice is dropped, so the node reads as
    // a root here rather than pointing at someone the viewer can't see.
    reportsTo: u.reportsTo && visible.has(u.reportsTo) ? u.reportsTo : null,
    directReports: reportCount.get(u.id) || 0,
    openTasks: openByUser.get(u.id) || 0,
  }));

  const edges = nodes
    .filter((n) => n.reportsTo)
    .map((n) => ({ from: n.reportsTo, to: n.id }));

  return { nodes, edges, canEdit: canEditOrg(actor) };
}

/** Persist dragged positions. Bulk, because auto-layout moves everything. */
export function savePositions(actor, positions) {
  requireEdit(actor);
  if (!Array.isArray(positions) || !positions.length)
    throw new TaskError("positions must be a non-empty array");
  if (positions.length > 1000)
    throw new TaskError("Too many positions in one request");

  const stmt = db.prepare(
    "UPDATE users SET chartX=?, chartY=?, updatedAt=? WHERE id=?"
  );
  const ts = nowISO();
  let saved = 0;
  for (const p of positions) {
    const x = coord(p?.x);
    const y = coord(p?.y);
    if (!p?.id || x === null || y === null) continue;
    saved += stmt.run(x, y, ts, p.id).changes;
  }
  return { saved };
}

/**
 * Re-parent — this is what a drag-onto-another-node commits.
 * `managerId: null` detaches the node into a root.
 */
export function setManager(actor, userId, managerId) {
  requireEdit(actor);
  const user = db.prepare("SELECT id FROM users WHERE id=?").get(userId);
  if (!user) throw new TaskError("User not found", 404);

  if (managerId) {
    if (managerId === userId)
      throw new TaskError("A user cannot report to themselves");
    if (!db.prepare("SELECT id FROM users WHERE id=?").get(managerId))
      throw new TaskError("Manager not found", 404);
    if (wouldCycle(userId, managerId))
      throw new TaskError("That change would create a reporting cycle");
  }

  db.prepare("UPDATE users SET reportsTo=?, updatedAt=? WHERE id=?").run(
    managerId || null,
    nowISO(),
    userId
  );
  return db.prepare(`SELECT ${NODE_COLS} FROM users WHERE id=?`).get(userId);
}

/**
 * Remove someone from the chart.
 *
 * Deactivates rather than DELETEs: tasks, gamification rows and template
 * steps all reference users, so a hard delete would either fail the foreign
 * key or destroy task history. Direct reports are lifted to the removed
 * person's own manager so the chart never fractures into orphans.
 *
 * Refuses while the user still holds open tasks unless `force` is set —
 * the count comes back in `details` so the UI can ask.
 */
export function removeUser(actor, userId, opts = {}) {
  requireEdit(actor);
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(userId);
  if (!user) throw new TaskError("User not found", 404);
  if (userId === actor.id)
    throw new TaskError("You cannot remove yourself from the chart");

  if (user.role === "ADMIN" && user.isActive) {
    const admins = db
      .prepare("SELECT COUNT(*) c FROM users WHERE role='ADMIN' AND isActive=1")
      .get().c;
    if (admins <= 1)
      throw new TaskError("You cannot remove the last active admin");
  }

  const openTasks = db
    .prepare(`SELECT COUNT(*) c FROM tasks WHERE assignedToId=? AND ${OPEN}`)
    .get(userId).c;
  if (openTasks > 0 && !opts.force)
    throw new TaskError(
      `${user.name} still has ${openTasks} open task${openTasks === 1 ? "" : "s"}`,
      409,
      { openTasks, requiresForce: true }
    );

  const ts = nowISO();
  const reparented = db
    .prepare("UPDATE users SET reportsTo=?, updatedAt=? WHERE reportsTo=?")
    .run(user.reportsTo || null, ts, userId).changes;
  db.prepare(
    "UPDATE users SET isActive=0, reportsTo=NULL, updatedAt=? WHERE id=?"
  ).run(ts, userId);

  return { id: userId, name: user.name, reparented, openTasks };
}
