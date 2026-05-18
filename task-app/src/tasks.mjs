import { db, newId, nowISO, tx } from "./db.mjs";
import { canAssign, canOriginate, regionScope } from "./permissions.mjs";
import { visibleTasks } from "./visibility.mjs";
import { recordCompletion } from "./gamification.mjs";

const MAX_DEPTH = 6;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export class TaskError extends Error {
  constructor(message, status = 400, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const getUser = (id) => db.prepare("SELECT * FROM users WHERE id = ?").get(id);
export const getTask = (id) =>
  db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);

function depthOf(task) {
  let depth = 0;
  let cur = task;
  while (cur && cur.parentTaskId) {
    depth += 1;
    cur = getTask(cur.parentTaskId);
    if (depth > 64) break; // cycle guard
  }
  return depth;
}

function assertDeadlineWithinParent(deadlineISO, parent) {
  if (!parent) return;
  if (new Date(deadlineISO).getTime() > new Date(parent.deadline).getTime()) {
    throw new TaskError(
      "Subtask/forward deadline cannot be later than the parent task deadline"
    );
  }
}

export function createTask(actor, body) {
  if (!canOriginate(actor.role))
    throw new TaskError("Your role cannot create top-level tasks", 403);

  const { title, description, assignedToId, deadline, priority, regionCode } =
    body;
  if (!title || !assignedToId || !deadline)
    throw new TaskError("title, assignedToId and deadline are required");
  if (priority && !PRIORITIES.includes(priority))
    throw new TaskError("Invalid priority");

  const target = getUser(assignedToId);
  if (!target) throw new TaskError("Assignee not found", 404);
  if (!canAssign(actor, target))
    throw new TaskError("You may not assign tasks to this user", 403);

  const region =
    actor.role === "ADMIN" ? regionCode || target.regionCode : actor.regionCode;
  const ts = nowISO();
  const id = newId();
  db.prepare(
    `INSERT INTO tasks
       (id,title,description,regionCode,assignedById,assignedToId,
        parentTaskId,rootTaskId,decomposition,status,priority,deadline,
        completedAt,completedOnTime,templateId,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,NULL,NULL,'NONE','PENDING',?,?,NULL,NULL,NULL,?,?)`
  ).run(
    id,
    title,
    description ?? null,
    region,
    actor.id,
    assignedToId,
    priority || "MEDIUM",
    new Date(deadline).toISOString(),
    ts,
    ts
  );
  return getTask(id);
}

function assertLeafOwner(actor, task) {
  if (task.assignedToId !== actor.id)
    throw new TaskError("Only the current assignee can do this", 403);
  if (task.decomposition !== "NONE")
    throw new TaskError(
      "This task was already forwarded or split and cannot be changed",
      409
    );
  if (task.status === "COMPLETED" || task.status === "CANCELLED")
    throw new TaskError("Task is already closed", 409);
}

export function forwardTask(actor, taskId, body) {
  return tx(() => {
    const task = getTask(taskId);
    if (!task) throw new TaskError("Task not found", 404);
    assertLeafOwner(actor, task);
    if (depthOf(task) + 1 > MAX_DEPTH)
      throw new TaskError("Maximum delegation depth reached", 409);

    const target = getUser(body.assignedToId);
    if (!target) throw new TaskError("Assignee not found", 404);
    if (!canAssign(actor, target))
      throw new TaskError("You may not forward to this user", 403);

    const deadline = body.deadline
      ? new Date(body.deadline).toISOString()
      : task.deadline;
    assertDeadlineWithinParent(deadline, task);

    const ts = nowISO();
    const childId = newId();
    db.prepare(
      `INSERT INTO tasks
         (id,title,description,regionCode,assignedById,assignedToId,
          parentTaskId,rootTaskId,decomposition,status,priority,deadline,
          completedAt,completedOnTime,templateId,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,?,?,'NONE','PENDING',?,?,NULL,NULL,?,?,?)`
    ).run(
      childId,
      task.title,
      body.note ? `${task.description ?? ""}\n\n[forwarded] ${body.note}`.trim() : task.description,
      task.regionCode,
      actor.id,
      target.id,
      task.id,
      task.rootTaskId || task.id,
      task.priority,
      deadline,
      task.templateId,
      ts,
      ts
    );
    db.prepare(
      "UPDATE tasks SET decomposition='FORWARDED', status='FORWARDED', updatedAt=? WHERE id=?"
    ).run(ts, task.id);
    return { parent: getTask(task.id), child: getTask(childId) };
  });
}

export function splitTask(actor, taskId, body) {
  return tx(() => {
    const task = getTask(taskId);
    if (!task) throw new TaskError("Task not found", 404);
    assertLeafOwner(actor, task);
    if (depthOf(task) + 1 > MAX_DEPTH)
      throw new TaskError("Maximum delegation depth reached", 409);

    const subtasks = Array.isArray(body.subtasks) ? body.subtasks : [];
    if (subtasks.length < 2)
      throw new TaskError("Provide at least two subtasks to split into");

    const prepared = subtasks.map((st) => {
      if (!st.title || !st.assignedToId || !st.deadline)
        throw new TaskError(
          "Each subtask needs title, assignedToId and deadline"
        );
      const target = getUser(st.assignedToId);
      if (!target) throw new TaskError(`Assignee ${st.assignedToId} not found`, 404);
      if (!canAssign(actor, target))
        throw new TaskError(
          `You may not assign a subtask to ${target.name}`,
          403
        );
      const deadline = new Date(st.deadline).toISOString();
      assertDeadlineWithinParent(deadline, task);
      return { st, target, deadline };
    });

    const ts = nowISO();
    const root = task.rootTaskId || task.id;
    const created = [];
    for (const { st, target, deadline } of prepared) {
      const cid = newId();
      db.prepare(
        `INSERT INTO tasks
           (id,title,description,regionCode,assignedById,assignedToId,
            parentTaskId,rootTaskId,decomposition,status,priority,deadline,
            completedAt,completedOnTime,templateId,createdAt,updatedAt)
         VALUES (?,?,?,?,?,?,?,?,'NONE','PENDING',?,?,NULL,NULL,?,?,?)`
      ).run(
        cid,
        st.title,
        st.description ?? null,
        task.regionCode,
        actor.id,
        target.id,
        task.id,
        root,
        st.priority && PRIORITIES.includes(st.priority) ? st.priority : task.priority,
        deadline,
        task.templateId,
        ts,
        ts
      );
      created.push(getTask(cid));
    }
    db.prepare(
      "UPDATE tasks SET decomposition='SUBTASKS', status='BLOCKED_BY_SUBTASKS', updatedAt=? WHERE id=?"
    ).run(ts, task.id);
    return { parent: getTask(task.id), children: created };
  });
}

export function updateTask(actor, taskId, patch) {
  const task = getTask(taskId);
  if (!task) throw new TaskError("Task not found", 404);
  const isAdmin = actor.role === "ADMIN";
  const isOwner = task.assignedToId === actor.id;
  if (!isAdmin && !isOwner)
    throw new TaskError("Not allowed to edit this task", 403);
  if (task.status === "COMPLETED" || task.status === "CANCELLED")
    throw new TaskError("Task is closed", 409);

  const sets = [];
  const vals = [];
  if (patch.status === "IN_PROGRESS") {
    if (task.status !== "PENDING")
      throw new TaskError("Only a pending task can be started", 409);
    sets.push("status=?");
    vals.push("IN_PROGRESS");
  }
  if (patch.priority && PRIORITIES.includes(patch.priority)) {
    sets.push("priority=?");
    vals.push(patch.priority);
  }
  if (patch.description !== undefined) {
    sets.push("description=?");
    vals.push(patch.description);
  }
  if (patch.deadline !== undefined) {
    if (!isAdmin)
      throw new TaskError("Only an admin can change a deadline", 403);
    sets.push("deadline=?");
    vals.push(new Date(patch.deadline).toISOString());
  }
  if (!sets.length) return task;
  sets.push("updatedAt=?");
  vals.push(nowISO(), taskId);
  db.prepare(`UPDATE tasks SET ${sets.join(", ")} WHERE id=?`).run(...vals);
  return getTask(taskId);
}

function activeChildren(parentId) {
  return db
    .prepare(
      "SELECT * FROM tasks WHERE parentTaskId=? AND status NOT IN ('COMPLETED','CANCELLED')"
    )
    .all(parentId);
}

function bubbleUp(task, ts) {
  let parent = task.parentTaskId ? getTask(task.parentTaskId) : null;
  while (parent) {
    if (parent.status === "COMPLETED" || parent.status === "CANCELLED") break;
    if (parent.decomposition === "FORWARDED") {
      const onTime =
        new Date(ts).getTime() <= new Date(parent.deadline).getTime();
      db.prepare(
        "UPDATE tasks SET status='COMPLETED', completedAt=?, completedOnTime=?, updatedAt=? WHERE id=?"
      ).run(ts, onTime ? 1 : 0, ts, parent.id);
    } else if (parent.decomposition === "SUBTASKS") {
      if (activeChildren(parent.id).length > 0) break; // still waiting
      const onTime =
        new Date(ts).getTime() <= new Date(parent.deadline).getTime();
      db.prepare(
        "UPDATE tasks SET status='COMPLETED', completedAt=?, completedOnTime=?, updatedAt=? WHERE id=?"
      ).run(ts, onTime ? 1 : 0, ts, parent.id);
    } else {
      break;
    }
    parent = parent.parentTaskId ? getTask(parent.parentTaskId) : null;
  }
}

export function completeTask(actor, taskId) {
  return tx(() => {
    const task = getTask(taskId);
    if (!task) throw new TaskError("Task not found", 404);
    if (task.assignedToId !== actor.id)
      throw new TaskError("Only the current assignee can complete this", 403);
    if (task.status === "COMPLETED" || task.status === "CANCELLED")
      throw new TaskError("Task is already closed", 409);
    if (task.decomposition === "SUBTASKS" || task.decomposition === "FORWARDED")
      throw new TaskError(
        "This task has active children and completes automatically when they finish",
        409
      );

    const ts = nowISO();
    const onTime = Date.now() <= new Date(task.deadline).getTime();
    db.prepare(
      "UPDATE tasks SET status='COMPLETED', completedAt=?, completedOnTime=?, updatedAt=? WHERE id=?"
    ).run(ts, onTime ? 1 : 0, ts, task.id);

    const reward = recordCompletion(actor.id, task, ts);
    bubbleUp(task, ts);
    return { task: getTask(task.id), reward };
  });
}

function descendants(taskId) {
  const out = [];
  const stack = [taskId];
  while (stack.length) {
    const pid = stack.pop();
    const kids = db
      .prepare("SELECT id FROM tasks WHERE parentTaskId=?")
      .all(pid);
    for (const k of kids) {
      out.push(k.id);
      stack.push(k.id);
    }
  }
  return out;
}

export function cancelTask(actor, taskId) {
  return tx(() => {
    const task = getTask(taskId);
    if (!task) throw new TaskError("Task not found", 404);
    const root = getTask(task.rootTaskId || task.id) || task;
    const isAdmin = actor.role === "ADMIN";
    const isRootOwner = root.assignedById === actor.id;
    if (!isAdmin && !isRootOwner)
      throw new TaskError("Only an admin or the originator can cancel", 403);

    const ids = [taskId, ...descendants(taskId)];
    const ts = nowISO();
    const stmt = db.prepare(
      "UPDATE tasks SET status='CANCELLED', updatedAt=? WHERE id=? AND status NOT IN ('COMPLETED','CANCELLED')"
    );
    for (const id of ids) stmt.run(ts, id);
    return { cancelled: ids.length };
  });
}

export function getChain(rootId) {
  return db
    .prepare(
      "SELECT * FROM tasks WHERE id=? OR rootTaskId=? ORDER BY createdAt ASC"
    )
    .all(rootId, rootId);
}

/** Hydrate a task with assignedBy/assignedTo names for API responses. */
export function hydrate(task) {
  if (!task) return task;
  const by = getUser(task.assignedById);
  const to = getUser(task.assignedToId);
  const overdue =
    !["COMPLETED", "CANCELLED"].includes(task.status) &&
    new Date(task.deadline).getTime() < Date.now();
  return {
    ...task,
    overdue,
    assignedByName: by?.name ?? null,
    assignedToName: to?.name ?? null,
    assignedToRole: to?.role ?? null,
    assignedToDepartment: to?.department ?? null,
  };
}

export function listTasks(actor, filters) {
  const region = regionScope(actor);
  const params = [];
  let sql = "SELECT * FROM tasks WHERE 1=1";
  if (region) {
    sql += " AND regionCode=?";
    params.push(region);
  }
  if (filters.status) {
    sql += " AND status=?";
    params.push(filters.status);
  }
  if (filters.priority) {
    sql += " AND priority=?";
    params.push(filters.priority);
  }
  if (filters.mine === "true") {
    sql += " AND assignedToId=?";
    params.push(actor.id);
  }
  if (filters.assignedToId) {
    sql += " AND assignedToId=?";
    params.push(filters.assignedToId);
  }
  if (filters.search) {
    sql += " AND (title LIKE ? OR description LIKE ?)";
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  sql += " ORDER BY createdAt DESC LIMIT 500";
  const rows = db.prepare(sql).all(...params);

  // Visibility: group by chain root, filter per chain, then flatten.
  const byRoot = new Map();
  for (const t of rows) {
    const root = t.rootTaskId || t.id;
    if (!byRoot.has(root)) byRoot.set(root, []);
    byRoot.get(root).push(t);
  }
  const visible = [];
  for (const [root, partial] of byRoot) {
    const fullChain = getChain(root);
    const allowed = new Set(visibleTasks(actor, fullChain).map((t) => t.id));
    for (const t of partial) if (allowed.has(t.id)) visible.push(t);
  }
  return visible.map(hydrate);
}
