// Org-chart editor — graph shape, drag-to-reparent, positions, removal.
process.env.TASK_DB_PATH = ":memory:";
process.env.TASK_APP_SECRET = "test-secret-do-not-use-in-prod";

import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

const { db, nowISO } = await import("../src/db.mjs");
const { hashPassword } = await import("../src/auth.mjs");
const org = await import("../src/org.mjs");
const { updateUser, createUser } = await import("../src/users.mjs");

function mkUser(props) {
  const id = props.id || crypto.randomUUID();
  const ts = nowISO();
  db.prepare(
    `INSERT INTO users (id,email,password,name,role,department,phone,
       isActive,regionCode,reportsTo,chartX,chartY,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,NULL,?,?,?,?,?,?,?)`
  ).run(
    id,
    props.email,
    hashPassword("p"),
    props.name,
    props.role || "OPERATOR",
    props.department || "PRODUCTION",
    props.isActive === false ? 0 : 1,
    props.regionCode || "KA",
    props.reportsTo || null,
    props.chartX ?? null,
    props.chartY ?? null,
    ts,
    ts
  );
  return db.prepare("SELECT * FROM users WHERE id=?").get(id);
}

let admin, admin2, mgr, supr, op1, op2, mhOp, viewer;

function reseed() {
  db.exec("DELETE FROM tasks; DELETE FROM users;");
  // Admins sit in their own HQ region so the region-scoping cases below are
  // genuinely cross-region rather than accidentally all-KA.
  admin = mkUser({ email: "a@", name: "Admin", role: "ADMIN", department: "ADMIN", regionCode: "HQ" });
  admin2 = mkUser({ email: "a2@", name: "Admin Two", role: "ADMIN", department: "ADMIN", regionCode: "HQ" });
  mgr = mkUser({ email: "m@", name: "Mgr", role: "MANAGER", reportsTo: admin.id });
  supr = mkUser({ email: "s@", name: "Supr", role: "SUPERVISOR", reportsTo: mgr.id });
  op1 = mkUser({ email: "o1@", name: "Op One", reportsTo: supr.id });
  op2 = mkUser({ email: "o2@", name: "Op Two", reportsTo: supr.id });
  mhOp = mkUser({ email: "mh@", name: "MH Op", regionCode: "MH", reportsTo: admin.id });
  viewer = mkUser({ email: "v@", name: "Viewer", role: "VIEWER", reportsTo: supr.id });
}

before(reseed);
beforeEach(reseed);

// ── graph ──────────────────────────────────────────────────────────
test("graph: admin gets every node plus an edge per reporting line", () => {
  const g = org.orgGraph(admin);
  assert.equal(g.nodes.length, 8);
  assert.equal(g.canEdit, true);
  // everyone except the two admins reports to someone
  assert.equal(g.edges.length, 6);
  assert.ok(g.edges.some((e) => e.from === supr.id && e.to === op1.id));
});

test("graph: node carries the counts the info card shows", () => {
  const g = org.orgGraph(admin);
  const s = g.nodes.find((n) => n.id === supr.id);
  assert.equal(s.directReports, 3); // op1, op2, viewer
  assert.equal(s.openTasks, 0);
});

test("graph: openTasks reflects only unfinished work", () => {
  const ts = nowISO();
  const mkTask = (status) =>
    db
      .prepare(
        `INSERT INTO tasks (id,title,regionCode,assignedById,assignedToId,
           decomposition,status,priority,deadline,createdAt,updatedAt)
         VALUES (?,?,?,?,?,'NONE',?,'MEDIUM',?,?,?)`
      )
      .run(crypto.randomUUID(), "t", "KA", admin.id, op1.id, status, ts, ts, ts);
  mkTask("PENDING");
  mkTask("IN_PROGRESS");
  mkTask("COMPLETED");
  mkTask("CANCELLED");
  const n = org.orgGraph(admin).nodes.find((x) => x.id === op1.id);
  assert.equal(n.openTasks, 2);
});

test("graph: manager sees only their own region, read-only", () => {
  const g = org.orgGraph(mgr);
  assert.equal(g.canEdit, false);
  assert.ok(!g.nodes.some((n) => n.id === mhOp.id)); // MH is out of region
  assert.ok(g.nodes.some((n) => n.id === op1.id));
});

test("graph: a manager outside the visible slice is reported as a root", () => {
  // mgr (region KA) can't see admin, so their own node must not dangle
  const self = org.orgGraph(mgr).nodes.find((n) => n.id === mgr.id);
  assert.equal(self.reportsTo, null);
  assert.ok(!org.orgGraph(mgr).edges.some((e) => e.to === mgr.id));
});

test("graph: inactive users are hidden unless asked for", () => {
  org.removeUser(admin, op2.id);
  assert.ok(!org.orgGraph(admin).nodes.some((n) => n.id === op2.id));
  const withInactive = org.orgGraph(admin, { includeInactive: true });
  assert.ok(withInactive.nodes.some((n) => n.id === op2.id));
});

test("graph: operators and viewers cannot read the chart at all", () => {
  for (const u of [op1, viewer])
    assert.throws(() => org.orgGraph(u), (e) => e.status === 403);
});

// ── positions ──────────────────────────────────────────────────────
test("positions: bulk save persists coordinates", () => {
  const r = org.savePositions(admin, [
    { id: op1.id, x: 120, y: 340 },
    { id: op2.id, x: -50.5, y: 12.25 },
  ]);
  assert.equal(r.saved, 2);
  const n = org.orgGraph(admin).nodes.find((x) => x.id === op1.id);
  assert.equal(n.chartX, 120);
  assert.equal(n.chartY, 340);
});

test("positions: garbage entries are skipped, not fatal", () => {
  const r = org.savePositions(admin, [
    { id: op1.id, x: 10, y: 10 },
    { id: op2.id, x: "abc", y: 5 },
    { x: 1, y: 1 },
    null,
  ]);
  assert.equal(r.saved, 1);
});

test("positions: coordinates are clamped to a sane range", () => {
  org.savePositions(admin, [{ id: op1.id, x: 1e9, y: -1e9 }]);
  const n = org.orgGraph(admin).nodes.find((x) => x.id === op1.id);
  assert.equal(n.chartX, 100000);
  assert.equal(n.chartY, -100000);
});

test("positions: non-admins cannot move anyone", () => {
  assert.throws(
    () => org.savePositions(mgr, [{ id: op1.id, x: 1, y: 1 }]),
    (e) => e.status === 403
  );
});

// ── re-parenting (the drag-onto-a-node gesture) ────────────────────
test("reparent: moves a node under a new manager", () => {
  org.setManager(admin, op1.id, mgr.id);
  const g = org.orgGraph(admin);
  assert.equal(g.nodes.find((n) => n.id === op1.id).reportsTo, mgr.id);
  assert.ok(g.edges.some((e) => e.from === mgr.id && e.to === op1.id));
});

test("reparent: null detaches a node into a root", () => {
  org.setManager(admin, op1.id, null);
  assert.equal(
    org.orgGraph(admin).nodes.find((n) => n.id === op1.id).reportsTo,
    null
  );
});

test("reparent: a cycle is refused", () => {
  // supr reports to mgr; making mgr report to supr closes the loop
  assert.throws(() => org.setManager(admin, mgr.id, supr.id), /cycle/i);
  // and the deeper case: admin under its own grandchild
  assert.throws(() => org.setManager(admin, admin.id, op1.id), /cycle/i);
});

test("reparent: self-management is refused", () => {
  assert.throws(() => org.setManager(admin, op1.id, op1.id), /themselves/i);
});

test("reparent: unknown ids 404", () => {
  assert.throws(
    () => org.setManager(admin, op1.id, "nope"),
    (e) => e.status === 404
  );
  assert.throws(
    () => org.setManager(admin, "nope", mgr.id),
    (e) => e.status === 404
  );
});

test("reparent: non-admins cannot restructure", () => {
  assert.throws(
    () => org.setManager(mgr, op1.id, mgr.id),
    (e) => e.status === 403
  );
});

// ── removal ────────────────────────────────────────────────────────
test("remove: deactivates and lifts direct reports to the removed manager", () => {
  const r = org.removeUser(admin, supr.id);
  assert.equal(r.reparented, 3); // op1, op2, viewer
  const g = org.orgGraph(admin);
  assert.ok(!g.nodes.some((n) => n.id === supr.id)); // hidden (inactive)
  // the reports now hang off supr's old manager, not off nothing
  assert.equal(g.nodes.find((n) => n.id === op1.id).reportsTo, mgr.id);
  assert.equal(g.nodes.find((n) => n.id === viewer.id).reportsTo, mgr.id);
});

test("remove: a root's reports become roots themselves", () => {
  org.setManager(admin, supr.id, null); // make supr a root
  org.removeUser(admin, supr.id);
  assert.equal(
    org.orgGraph(admin).nodes.find((n) => n.id === op1.id).reportsTo,
    null
  );
});

test("remove: history is preserved — the row survives, deactivated", () => {
  org.removeUser(admin, op1.id);
  const row = db.prepare("SELECT isActive FROM users WHERE id=?").get(op1.id);
  assert.ok(row, "user row must not be hard-deleted");
  assert.equal(row.isActive, 0);
});

test("remove: refuses while open tasks remain, unless forced", () => {
  const ts = nowISO();
  db.prepare(
    `INSERT INTO tasks (id,title,regionCode,assignedById,assignedToId,
       decomposition,status,priority,deadline,createdAt,updatedAt)
     VALUES (?,?,?,?,?,'NONE','PENDING','MEDIUM',?,?,?)`
  ).run(crypto.randomUUID(), "t", "KA", admin.id, op1.id, ts, ts, ts);

  assert.throws(
    () => org.removeUser(admin, op1.id),
    (e) => e.status === 409 && e.details.openTasks === 1 && e.details.requiresForce
  );
  const r = org.removeUser(admin, op1.id, { force: true });
  assert.equal(r.openTasks, 1);
});

test("remove: you cannot remove yourself", () => {
  assert.throws(() => org.removeUser(admin, admin.id), /yourself/i);
});

test("remove: the last active admin is protected", () => {
  org.removeUser(admin, admin2.id); // now admin is the only one left
  assert.throws(() => org.removeUser(admin2, admin.id), /last active admin/i);
});

test("remove: non-admins cannot remove anyone", () => {
  assert.throws(
    () => org.removeUser(mgr, op1.id),
    (e) => e.status === 403
  );
});

// ── editing through the info card ──────────────────────────────────
test("edit: name, email and phone are editable", () => {
  const u = updateUser(admin, op1.id, {
    name: "Renamed",
    email: "renamed@eaglestone.in",
    phone: "+91 99999 11111",
  });
  assert.equal(u.name, "Renamed");
  assert.equal(u.email, "renamed@eaglestone.in");
  assert.equal(u.phone, "+91 99999 11111");
});

test("edit: duplicate email is refused, unchanged email is fine", () => {
  assert.throws(
    () => updateUser(admin, op1.id, { email: "o2@" }),
    (e) => e.status === 409
  );
  assert.equal(updateUser(admin, op1.id, { email: "o1@" }).email, "o1@");
});

test("edit: blank name or email is refused", () => {
  assert.throws(() => updateUser(admin, op1.id, { name: "  " }), /name/i);
  assert.throws(() => updateUser(admin, op1.id, { email: "" }), /email/i);
});

test("create: a new hire can be placed at a chart position under a manager", () => {
  const u = createUser(admin, {
    name: "New Hire",
    email: "new@eaglestone.in",
    password: "password123",
    role: "OPERATOR",
    department: "WAREHOUSE",
    regionCode: "KA",
    reportsTo: supr.id,
    chartX: 42,
    chartY: 84,
  });
  assert.equal(u.reportsTo, supr.id);
  assert.equal(u.chartX, 42);
  assert.equal(u.chartY, 84);
  assert.ok(
    org.orgGraph(admin).edges.some((e) => e.from === supr.id && e.to === u.id)
  );
});

test("create: an unknown manager is refused", () => {
  assert.throws(
    () =>
      createUser(admin, {
        name: "X",
        email: "x@eaglestone.in",
        password: "password123",
        reportsTo: "nope",
      }),
    (e) => e.status === 404
  );
});
