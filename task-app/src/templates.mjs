import { db, newId, nowISO, tx } from "./db.mjs";
import { TaskError } from "./tasks.mjs";

const getUser = (id) => db.prepare("SELECT * FROM users WHERE id = ?").get(id);

export function listTemplates({ includeInactive = false } = {}) {
  const rows = includeInactive
    ? db.prepare("SELECT * FROM task_templates ORDER BY name").all()
    : db
        .prepare("SELECT * FROM task_templates WHERE isActive=1 ORDER BY name")
        .all();
  return rows.map((t) => ({ ...t, steps: stepsFor(t.id) }));
}

const stepsFor = (templateId) =>
  db
    .prepare(
      "SELECT * FROM task_template_steps WHERE templateId=? ORDER BY orderIndex ASC"
    )
    .all(templateId);

export function getTemplate(id) {
  const t = db.prepare("SELECT * FROM task_templates WHERE id=?").get(id);
  if (!t) return null;
  return { ...t, steps: stepsFor(id) };
}

function writeSteps(templateId, steps) {
  db.prepare("DELETE FROM task_template_steps WHERE templateId=?").run(
    templateId
  );
  steps.forEach((s, i) => {
    db.prepare(
      `INSERT INTO task_template_steps
         (id,templateId,title,description,assigneeRole,assigneeDepartment,
          assigneeUserId,priority,deadlineOffsetHours,orderIndex)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).run(
      newId(),
      templateId,
      s.title,
      s.description ?? null,
      s.assigneeRole ?? null,
      s.assigneeDepartment ?? null,
      s.assigneeUserId ?? null,
      s.priority || "MEDIUM",
      Number.isFinite(s.deadlineOffsetHours) ? s.deadlineOffsetHours : 0,
      i
    );
  });
}

export function createTemplate(actor, body) {
  if (actor.role !== "ADMIN")
    throw new TaskError("Only an admin can create templates", 403);
  if (!body.name) throw new TaskError("Template name is required");
  if (!Array.isArray(body.steps) || body.steps.length < 1)
    throw new TaskError("A template needs at least one step");

  const exists = db
    .prepare("SELECT id FROM task_templates WHERE name=?")
    .get(body.name);
  if (exists) throw new TaskError("A template with that name already exists", 409);

  const id = newId();
  const ts = nowISO();
  return tx(() => {
    db.prepare(
      `INSERT INTO task_templates
         (id,name,description,defaultPriority,defaultDeadlineHours,
          createdById,isActive,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,1,?,?)`
    ).run(
      id,
      body.name,
      body.description ?? null,
      body.defaultPriority || "MEDIUM",
      Number.isFinite(body.defaultDeadlineHours) ? body.defaultDeadlineHours : 48,
      actor.id,
      ts,
      ts
    );
    writeSteps(id, body.steps);
    return getTemplate(id);
  });
}

export function updateTemplate(actor, id, body) {
  if (actor.role !== "ADMIN")
    throw new TaskError("Only an admin can edit templates", 403);
  const t = db.prepare("SELECT * FROM task_templates WHERE id=?").get(id);
  if (!t) throw new TaskError("Template not found", 404);
  return tx(() => {
    db.prepare(
      `UPDATE task_templates SET
         name=?, description=?, defaultPriority=?, defaultDeadlineHours=?,
         isActive=?, updatedAt=? WHERE id=?`
    ).run(
      body.name ?? t.name,
      body.description ?? t.description,
      body.defaultPriority ?? t.defaultPriority,
      Number.isFinite(body.defaultDeadlineHours)
        ? body.defaultDeadlineHours
        : t.defaultDeadlineHours,
      body.isActive === false ? 0 : 1,
      nowISO(),
      id
    );
    if (Array.isArray(body.steps)) writeSteps(id, body.steps);
    return getTemplate(id);
  });
}

export function deleteTemplate(actor, id) {
  if (actor.role !== "ADMIN")
    throw new TaskError("Only an admin can delete templates", 403);
  db.prepare("UPDATE task_templates SET isActive=0, updatedAt=? WHERE id=?").run(
    nowISO(),
    id
  );
  return { ok: true };
}

/** Resolve one step's assignee for a region. Returns user row or null. */
function resolveStep(step, regionCode) {
  if (step.assigneeUserId) {
    const u = getUser(step.assigneeUserId);
    return u && u.isActive ? u : null;
  }
  if (step.assigneeDepartment) {
    return (
      db
        .prepare(
          `SELECT * FROM users
           WHERE isActive=1 AND department=? AND regionCode=?
           ORDER BY CASE role
             WHEN 'ADMIN' THEN 0 WHEN 'MANAGER' THEN 1 WHEN 'SUPERVISOR' THEN 2
             WHEN 'OPERATOR' THEN 3 ELSE 4 END, createdAt ASC
           LIMIT 1`
        )
        .get(step.assigneeDepartment, regionCode) || null
    );
  }
  if (step.assigneeRole) {
    return (
      db
        .prepare(
          `SELECT * FROM users
           WHERE isActive=1 AND role=? AND regionCode=?
           ORDER BY createdAt ASC LIMIT 1`
        )
        .get(step.assigneeRole, regionCode) || null
    );
  }
  return null;
}

export function previewResolution(templateId, regionCode) {
  const tpl = getTemplate(templateId);
  if (!tpl) throw new TaskError("Template not found", 404);
  return tpl.steps.map((s) => {
    const u = resolveStep(s, regionCode);
    return {
      stepId: s.id,
      title: s.title,
      criteria: s.assigneeUserId
        ? "pinned user"
        : s.assigneeDepartment
          ? `department=${s.assigneeDepartment}`
          : s.assigneeRole
            ? `role=${s.assigneeRole}`
            : "unspecified",
      resolvedUser: u ? { id: u.id, name: u.name, role: u.role, department: u.department } : null,
      reason: u ? null : "No active matching user in this region",
    };
  });
}

export function instantiate(actor, templateId, body) {
  if (!["ADMIN", "MANAGER", "SUPERVISOR"].includes(actor.role))
    throw new TaskError("Your role cannot instantiate templates", 403);
  const tpl = getTemplate(templateId);
  if (!tpl || !tpl.isActive)
    throw new TaskError("Template not found or inactive", 404);

  const regionCode =
    actor.role === "ADMIN" ? body.regionCode || actor.regionCode : actor.regionCode;

  const resolutions = tpl.steps.map((s) => ({
    step: s,
    user: resolveStep(s, regionCode),
  }));
  const unresolved = resolutions
    .filter((r) => !r.user)
    .map((r) => ({ stepId: r.step.id, title: r.step.title }));
  if (unresolved.length)
    throw new TaskError("Some steps could not be assigned", 422, {
      unresolved,
    });

  return tx(() => {
    const ts = nowISO();
    const rootId = newId();
    const rootDeadline = new Date(
      Date.now() +
        (Number.isFinite(body.deadlineHours)
          ? body.deadlineHours
          : tpl.defaultDeadlineHours) *
          3_600_000
    ).toISOString();

    db.prepare(
      `INSERT INTO tasks
         (id,title,description,regionCode,assignedById,assignedToId,
          parentTaskId,rootTaskId,decomposition,status,priority,deadline,
          completedAt,completedOnTime,templateId,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,NULL,NULL,'SUBTASKS','BLOCKED_BY_SUBTASKS',?,?,NULL,NULL,?,?,?)`
    ).run(
      rootId,
      tpl.name,
      tpl.description ?? null,
      regionCode,
      actor.id,
      actor.id, // instantiator coordinates the parent
      tpl.defaultPriority,
      rootDeadline,
      tpl.id,
      ts,
      ts
    );

    const children = [];
    for (const { step, user } of resolutions) {
      const cid = newId();
      const childDeadline = new Date(
        new Date(rootDeadline).getTime() +
          step.deadlineOffsetHours * 3_600_000
      ).toISOString();
      db.prepare(
        `INSERT INTO tasks
           (id,title,description,regionCode,assignedById,assignedToId,
            parentTaskId,rootTaskId,decomposition,status,priority,deadline,
            completedAt,completedOnTime,templateId,createdAt,updatedAt)
         VALUES (?,?,?,?,?,?,?,?,'NONE','PENDING',?,?,NULL,NULL,?,?,?)`
      ).run(
        cid,
        step.title,
        step.description ?? null,
        regionCode,
        actor.id,
        user.id,
        rootId,
        rootId,
        step.priority,
        childDeadline,
        tpl.id,
        ts,
        ts
      );
      children.push(cid);
    }
    return { rootTaskId: rootId, subtaskCount: children.length };
  });
}
