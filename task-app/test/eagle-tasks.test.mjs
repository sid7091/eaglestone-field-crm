// Eagle Tasks — core logic tests
// Uses Node's built-in node:test + in-memory SQLite. No npm deps.
process.env.TASK_DB_PATH = ":memory:";
process.env.TASK_APP_SECRET = "test-secret-do-not-use-in-prod";

import { test, before } from "node:test";
import assert from "node:assert/strict";

// Dynamic imports so the env vars above are in place first.
const { db, nowISO } = await import("../src/db.mjs");
const { hashPassword } = await import("../src/auth.mjs");
const permissions = await import("../src/permissions.mjs");
const { visibleTasks } = await import("../src/visibility.mjs");
const gamification = await import("../src/gamification.mjs");
const tasks = await import("../src/tasks.mjs");
const templates = await import("../src/templates.mjs");

// ── seed helpers ───────────────────────────────────────────────────
function mkUser(props) {
  const id = props.id || crypto.randomUUID();
  const ts = nowISO();
  db.prepare(
    `INSERT INTO users (id,email,password,name,role,department,phone,
       isActive,regionCode,reportsTo,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,NULL,1,?,?,?,?)`
  ).run(
    id,
    props.email,
    hashPassword("p"),
    props.name,
    props.role || "OPERATOR",
    props.department || "PRODUCTION",
    props.regionCode || "KA",
    props.reportsTo || null,
    ts,
    ts
  );
  return db.prepare("SELECT * FROM users WHERE id=?").get(id);
}

let admin, mgr, supr, op1, op2, op3, viewer, mhOp;

before(() => {
  admin = mkUser({ email: "a@", name: "Admin", role: "ADMIN", department: "ADMIN" });
  mgr = mkUser({ email: "m@", name: "Mgr", role: "MANAGER", department: "SALES", reportsTo: admin.id });
  supr = mkUser({ email: "s@", name: "Supr", role: "SUPERVISOR", department: "DISPATCH", reportsTo: mgr.id });
  op1 = mkUser({ email: "wh@", name: "Wh", role: "OPERATOR", department: "WAREHOUSE", reportsTo: supr.id });
  op2 = mkUser({ email: "ac@", name: "Ac", role: "OPERATOR", department: "ACCOUNTS", reportsTo: supr.id });
  op3 = mkUser({ email: "di@", name: "Di", role: "OPERATOR", department: "DISPATCH", reportsTo: supr.id });
  viewer = mkUser({ email: "v@", name: "Viewer", role: "VIEWER" });
  mhOp = mkUser({ email: "mh@", name: "MH-Op", role: "OPERATOR", regionCode: "MH" });
});

// ── permissions ────────────────────────────────────────────────────
test("permissions: ADMIN can assign to anyone active", () => {
  for (const u of [mgr, supr, op1, mhOp])
    assert.equal(permissions.canAssign(admin, u), true);
});

test("permissions: MANAGER is scoped to own region", () => {
  assert.equal(permissions.canAssign(mgr, supr), true);
  assert.equal(permissions.canAssign(mgr, op1), true);
  assert.equal(permissions.canAssign(mgr, mhOp), false);
});

test("permissions: SUPERVISOR can assign to strictly lower roles in same region", () => {
  assert.equal(permissions.canAssign(supr, op1), true);
  assert.equal(permissions.canAssign(supr, viewer), true);
  assert.equal(permissions.canAssign(supr, mgr), false);
  assert.equal(permissions.canAssign(supr, supr), false); // can't self-assign
});

test("permissions: OPERATOR can hand to peers/juniors in same region only", () => {
  assert.equal(permissions.canAssign(op1, op2), true);
  assert.equal(permissions.canAssign(op1, viewer), true);
  assert.equal(permissions.canAssign(op1, supr), false);
  assert.equal(permissions.canAssign(op1, mhOp), false);
});

test("permissions: VIEWER can never assign", () => {
  for (const u of [admin, mgr, op1])
    assert.equal(permissions.canAssign(viewer, u), false);
});

test("permissions: canOriginate and isSenior reflect role hierarchy", () => {
  assert.deepEqual(
    ["ADMIN", "MANAGER", "SUPERVISOR", "OPERATOR", "VIEWER"].map(permissions.canOriginate),
    [true, true, true, false, false]
  );
  assert.deepEqual(
    ["ADMIN", "MANAGER", "SUPERVISOR", "OPERATOR", "VIEWER"].map(permissions.isSenior),
    [true, true, false, false, false]
  );
});

// ── visibility ─────────────────────────────────────────────────────
const chain = () => [
  { id: "r", assignedToId: admin.id, assignedById: admin.id, parentTaskId: null },
  { id: "m", assignedToId: mgr.id, assignedById: admin.id, parentTaskId: "r" },
  { id: "s", assignedToId: supr.id, assignedById: mgr.id, parentTaskId: "m" },
  { id: "wh", assignedToId: op1.id, assignedById: supr.id, parentTaskId: "s" }, // op1
  { id: "ac", assignedToId: op2.id, assignedById: supr.id, parentTaskId: "s" }, // sibling
  { id: "di", assignedToId: op3.id, assignedById: supr.id, parentTaskId: "s" }, // sibling
];

test("visibility: senior roles see the entire chain", () => {
  assert.equal(visibleTasks({ id: admin.id, role: "ADMIN" }, chain()).length, 6);
  assert.equal(visibleTasks({ id: mgr.id, role: "MANAGER" }, chain()).length, 6);
});

test("visibility: junior sees own task + direct parent only (siblings hidden)", () => {
  const ids = visibleTasks({ id: op1.id, role: "OPERATOR" }, chain()).map((t) => t.id).sort();
  assert.deepEqual(ids, ["s", "wh"]); // own + one level up
  assert.ok(!ids.includes("ac")); // sibling Accounts hidden
  assert.ok(!ids.includes("di")); // sibling Dispatch hidden
  assert.ok(!ids.includes("r")); // great-grandparent hidden
});

test("visibility: a delegator sees what they handed out", () => {
  const ids = visibleTasks({ id: supr.id, role: "SUPERVISOR" }, chain()).map((t) => t.id).sort();
  // supr has node 's' and delegated 'wh','ac','di'; one level up is 'm'.
  assert.deepEqual(ids, ["ac", "di", "m", "s", "wh"]);
});

// ── tasks domain ───────────────────────────────────────────────────
const future = (h = 2) => new Date(Date.now() + h * 3_600_000).toISOString();
const past = (h = 1) => new Date(Date.now() - h * 3_600_000).toISOString();

test("tasks: create, forward, leaf completes → chain bubbles up", () => {
  const t1 = tasks.createTask(admin, {
    title: "Plan Q3",
    assignedToId: mgr.id,
    deadline: future(2),
    priority: "HIGH",
  });
  assert.equal(t1.status, "PENDING");
  assert.equal(t1.decomposition, "NONE");

  const { parent, child } = tasks.forwardTask(mgr, t1.id, { assignedToId: supr.id });
  assert.equal(parent.status, "FORWARDED");
  assert.equal(parent.decomposition, "FORWARDED");
  assert.equal(child.parentTaskId, t1.id);
  assert.equal(child.assignedToId, supr.id);

  // Wrong actor can't complete
  assert.throws(() => tasks.completeTask(admin, child.id), /assignee/i);

  tasks.completeTask(supr, child.id);
  assert.equal(tasks.getTask(t1.id).status, "COMPLETED"); // bubbled up
  assert.equal(tasks.getTask(child.id).status, "COMPLETED");
});

test("tasks: split into subtasks → parent BLOCKED_BY_SUBTASKS → auto-completes", () => {
  const t = tasks.createTask(admin, {
    title: "Dispatch order",
    assignedToId: supr.id,
    deadline: future(2),
    priority: "HIGH",
  });
  const { parent, children } = tasks.splitTask(supr, t.id, {
    subtasks: [
      { title: "Pack", assignedToId: op1.id, deadline: future(2) },
      { title: "Invoice", assignedToId: op2.id, deadline: future(2) },
      { title: "Ship", assignedToId: op3.id, deadline: future(2) },
    ],
  });
  assert.equal(parent.status, "BLOCKED_BY_SUBTASKS");
  assert.equal(parent.decomposition, "SUBTASKS");
  assert.equal(children.length, 3);

  // Parent can't be completed directly
  assert.throws(() => tasks.completeTask(supr, parent.id), /children/);

  tasks.completeTask(op1, children[0].id);
  tasks.completeTask(op2, children[1].id);
  assert.equal(tasks.getTask(parent.id).status, "BLOCKED_BY_SUBTASKS"); // still waiting on op3
  tasks.completeTask(op3, children[2].id);
  assert.equal(tasks.getTask(parent.id).status, "COMPLETED");
});

test("tasks: VIEWER and OPERATOR cannot originate top-level tasks", () => {
  assert.throws(
    () => tasks.createTask(viewer, { title: "x", assignedToId: op1.id, deadline: future(1) }),
    /role/i
  );
  assert.throws(
    () => tasks.createTask(op1, { title: "x", assignedToId: op2.id, deadline: future(1) }),
    /role/i
  );
});

test("tasks: forwarding to an out-of-region target is rejected", () => {
  const t = tasks.createTask(admin, {
    title: "x", assignedToId: mgr.id, deadline: future(2),
  });
  assert.throws(
    () => tasks.forwardTask(mgr, t.id, { assignedToId: mhOp.id }),
    /may not forward/i
  );
});

test("tasks: subtask deadline cannot exceed parent's deadline", () => {
  const t = tasks.createTask(admin, {
    title: "Tight", assignedToId: supr.id, deadline: future(1),
  });
  assert.throws(
    () =>
      tasks.splitTask(supr, t.id, {
        subtasks: [
          { title: "a", assignedToId: op1.id, deadline: future(48) }, // way past parent
          { title: "b", assignedToId: op2.id, deadline: future(1) },
        ],
      }),
    /deadline/i
  );
});

// ── gamification ───────────────────────────────────────────────────
test("gamification: on-time completion awards points and bumps streak", () => {
  db.prepare("DELETE FROM user_gamification").run();
  const r = gamification.recordCompletion(op1.id, { id: "g1", deadline: future(2), priority: "MEDIUM" }, new Date().toISOString());
  assert.equal(r.onTime, true);
  assert.ok(r.pointsAwarded >= 10);
  assert.equal(r.currentStreak, 1);
});

test("gamification: late completion zeroes points and resets streak", () => {
  // op1 already has a 1-streak from previous test
  const r = gamification.recordCompletion(op1.id, { id: "g2", deadline: past(1), priority: "HIGH" }, new Date().toISOString());
  assert.equal(r.onTime, false);
  assert.equal(r.pointsAwarded, 0);
  assert.equal(r.currentStreak, 0);
});

test("gamification: 5-streak awards STREAK_5 badge", () => {
  db.prepare("DELETE FROM user_gamification").run();
  for (let i = 0; i < 5; i++)
    gamification.recordCompletion(
      op1.id,
      { id: "s" + i, deadline: future(2), priority: "HIGH" },
      new Date().toISOString()
    );
  const stats = gamification.getStats(op1.id);
  const badges = JSON.parse(stats.badges);
  assert.ok(badges.includes("STREAK_5"));
  assert.equal(stats.currentStreak, 5);
});

test("gamification: leaderboard ranks by total points desc", () => {
  // op1 has points from the previous test; give op2 a single LOW-priority hit
  gamification.recordCompletion(op2.id, { id: "lo", deadline: future(2), priority: "LOW" }, new Date().toISOString());
  const lb = gamification.leaderboard({ limit: 10 });
  const top = lb.map((r) => r.userId);
  assert.ok(top.indexOf(op1.id) < top.indexOf(op2.id)); // op1 should rank above op2
});

// ── templates ──────────────────────────────────────────────────────
test("templates: created template resolves assignees by department + region", () => {
  const tpl = templates.createTemplate(admin, {
    name: "Test Dispatch",
    description: "test",
    defaultPriority: "HIGH",
    defaultDeadlineHours: 24,
    steps: [
      { title: "Pack",    assigneeDepartment: "WAREHOUSE", priority: "HIGH", deadlineOffsetHours: -1 },
      { title: "Invoice", assigneeDepartment: "ACCOUNTS",  priority: "HIGH", deadlineOffsetHours: 0 },
      { title: "Ship",    assigneeDepartment: "DISPATCH",  priority: "HIGH", deadlineOffsetHours: 0 },
    ],
  });
  const preview = templates.previewResolution(tpl.id, "KA");
  assert.equal(preview[0].resolvedUser.id, op1.id);
  assert.equal(preview[1].resolvedUser.id, op2.id);
  // DISPATCH dept: supr is SUPERVISOR (rank above OPERATOR) so prefer-by-role picks supr.
  assert.ok(preview[2].resolvedUser);
});

test("templates: instantiate creates root + subtasks, root is BLOCKED_BY_SUBTASKS", () => {
  const tpl = db.prepare("SELECT id FROM task_templates WHERE name='Test Dispatch'").get();
  const r = templates.instantiate(admin, tpl.id, { regionCode: "KA" });
  assert.equal(r.subtaskCount, 3);
  const root = tasks.getTask(r.rootTaskId);
  assert.equal(root.decomposition, "SUBTASKS");
  assert.equal(root.status, "BLOCKED_BY_SUBTASKS");
  const children = db.prepare("SELECT * FROM tasks WHERE parentTaskId=?").all(root.id);
  assert.equal(children.length, 3);
});

test("templates: instantiate in a region without matching users returns 422", () => {
  const tpl = db.prepare("SELECT id FROM task_templates WHERE name='Test Dispatch'").get();
  assert.throws(
    () => templates.instantiate(admin, tpl.id, { regionCode: "ZZ" }),
    (err) => err.status === 422 && Array.isArray(err.details?.unresolved) && err.details.unresolved.length === 3
  );
});

test("templates: only ADMIN can create or edit", () => {
  assert.throws(
    () =>
      templates.createTemplate(mgr, {
        name: "Nope",
        steps: [{ title: "x" }],
      }),
    /admin/i
  );
});
