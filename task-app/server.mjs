import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";

import { verifyPassword, signSession, currentUser } from "./src/auth.mjs";
import { db } from "./src/db.mjs";
import {
  createTask,
  forwardTask,
  splitTask,
  updateTask,
  completeTask,
  cancelTask,
  getTask,
  getChain,
  hydrate,
  listTasks,
  TaskError,
} from "./src/tasks.mjs";
import { visibleTasks, canViewTask } from "./src/visibility.mjs";
import { getStats, leaderboard } from "./src/gamification.mjs";
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewResolution,
  instantiate,
} from "./src/templates.mjs";
import { listUsers, orgTree, updateUser, createUser } from "./src/users.mjs";
import { orgGraph, savePositions, setManager, removeUser } from "./src/org.mjs";
import { ROLES, DEPARTMENTS } from "./src/permissions.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "public");
const PORT = process.env.PORT || 4100;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

function send(res, status, body, headers = {}) {
  const payload =
    typeof body === "string" ? body : JSON.stringify(body ?? null);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  res.end(payload);
}

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie;
  if (!raw) return out;
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > -1)
      out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 1e6) req.destroy();
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
  });
}

async function serveStatic(req, res, pathname) {
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  if (rel.includes("..")) return send(res, 403, { error: "Forbidden" });
  try {
    const file = join(PUBLIC_DIR, rel);
    const content = await readFile(file);
    res.writeHead(200, {
      "Content-Type": MIME[extname(file)] || "application/octet-stream",
    });
    res.end(content);
  } catch {
    // SPA fallback
    try {
      const content = await readFile(join(PUBLIC_DIR, "index.html"));
      res.writeHead(200, { "Content-Type": MIME[".html"] });
      res.end(content);
    } catch {
      send(res, 404, { error: "Not found" });
    }
  }
}

function handleError(res, err) {
  if (err instanceof TaskError)
    return send(res, err.status, {
      error: err.message,
      details: err.details,
    });
  console.error(err);
  return send(res, 500, { error: "Internal server error" });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const q = Object.fromEntries(url.searchParams);

  // ── Static / SPA ────────────────────────────────────────────────
  if (!path.startsWith("/api/")) return serveStatic(req, res, path);

  try {
    // ── Public auth endpoints ─────────────────────────────────────
    if (path === "/api/login" && req.method === "POST") {
      const { email, password } = await readBody(req);
      const user = db.prepare("SELECT * FROM users WHERE email=?").get(email);
      if (!user || !user.isActive || !verifyPassword(password, user.password))
        return send(res, 401, { error: "Invalid credentials" });
      const token = signSession({ userId: user.id });
      return send(
        res,
        200,
        { id: user.id, name: user.name, role: user.role, department: user.department, regionCode: user.regionCode },
        {
          "Set-Cookie": `tasksid=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`,
        }
      );
    }
    if (path === "/api/logout" && req.method === "POST") {
      return send(res, 200, { ok: true }, {
        "Set-Cookie": "tasksid=; HttpOnly; Path=/; Max-Age=0",
      });
    }
    if (path === "/api/meta" && req.method === "GET") {
      return send(res, 200, { roles: ROLES, departments: DEPARTMENTS });
    }

    // ── Auth gate ─────────────────────────────────────────────────
    const actor = currentUser(parseCookies(req).tasksid);
    if (!actor) return send(res, 401, { error: "Unauthorized" });

    if (path === "/api/me" && req.method === "GET")
      return send(res, 200, {
        id: actor.id,
        name: actor.name,
        role: actor.role,
        department: actor.department,
        regionCode: actor.regionCode,
      });

    // ── Tasks: specific routes before /:id ────────────────────────
    if (path === "/api/tasks/leaderboard" && req.method === "GET")
      return send(res, 200, leaderboard({
        regionCode: q.regionCode,
        department: q.department,
        limit: q.limit ? Number(q.limit) : 20,
      }));

    if (path === "/api/tasks/me/stats" && req.method === "GET") {
      const stats = getStats(actor.id);
      const open = db
        .prepare(
          "SELECT COUNT(*) c FROM tasks WHERE assignedToId=? AND status NOT IN ('COMPLETED','CANCELLED')"
        )
        .get(actor.id).c;
      const overdue = db
        .prepare(
          "SELECT COUNT(*) c FROM tasks WHERE assignedToId=? AND status NOT IN ('COMPLETED','CANCELLED') AND deadline < ?"
        )
        .get(actor.id, new Date().toISOString()).c;
      return send(res, 200, {
        ...stats,
        badges: JSON.parse(stats.badges || "[]"),
        openTasks: open,
        overdueTasks: overdue,
      });
    }

    if (path === "/api/tasks" && req.method === "GET")
      return send(res, 200, listTasks(actor, q));

    if (path === "/api/tasks" && req.method === "POST")
      return send(res, 201, hydrate(createTask(actor, await readBody(req))));

    const taskMatch = path.match(/^\/api\/tasks\/([^/]+)(\/[a-z]+)?$/);
    if (taskMatch) {
      const id = taskMatch[1];
      const action = taskMatch[2];

      if (!action && req.method === "GET") {
        const task = getTask(id);
        if (!task) return send(res, 404, { error: "Task not found" });
        const chain = getChain(task.rootTaskId || task.id);
        if (!canViewTask(actor, chain, id))
          return send(res, 404, { error: "Task not found" });
        return send(res, 200, {
          task: hydrate(task),
          chain: visibleTasks(actor, chain).map(hydrate),
        });
      }
      if (!action && req.method === "PATCH")
        return send(res, 200, hydrate(updateTask(actor, id, await readBody(req))));

      if (action === "/chain" && req.method === "GET") {
        const task = getTask(id);
        if (!task) return send(res, 404, { error: "Task not found" });
        const chain = getChain(task.rootTaskId || task.id);
        if (!canViewTask(actor, chain, id))
          return send(res, 404, { error: "Task not found" });
        return send(res, 200, visibleTasks(actor, chain).map(hydrate));
      }
      if (action === "/forward" && req.method === "POST")
        return send(res, 201, await readBody(req).then((b) => forwardTask(actor, id, b)));
      if (action === "/split" && req.method === "POST")
        return send(res, 201, await readBody(req).then((b) => splitTask(actor, id, b)));
      if (action === "/complete" && req.method === "POST")
        return send(res, 200, completeTask(actor, id));
      if (action === "/cancel" && req.method === "POST")
        return send(res, 200, cancelTask(actor, id));
    }

    // ── Templates ─────────────────────────────────────────────────
    if (path === "/api/templates" && req.method === "GET")
      return send(res, 200, listTemplates({ includeInactive: actor.role === "ADMIN" && q.all === "true" }));
    if (path === "/api/templates" && req.method === "POST")
      return send(res, 201, createTemplate(actor, await readBody(req)));

    const tplMatch = path.match(/^\/api\/templates\/([^/]+)(\/[a-z]+)?$/);
    if (tplMatch) {
      const id = tplMatch[1];
      const action = tplMatch[2];
      if (!action && req.method === "GET") {
        const t = getTemplate(id);
        return t ? send(res, 200, t) : send(res, 404, { error: "Not found" });
      }
      if (!action && req.method === "PUT")
        return send(res, 200, updateTemplate(actor, id, await readBody(req)));
      if (!action && req.method === "DELETE")
        return send(res, 200, deleteTemplate(actor, id));
      if (action === "/preview" && req.method === "POST") {
        const b = await readBody(req);
        return send(
          res,
          200,
          previewResolution(id, b.regionCode || actor.regionCode)
        );
      }
      if (action === "/instantiate" && req.method === "POST")
        return send(res, 201, instantiate(actor, id, await readBody(req)));
    }

    // ── Users / hierarchy ─────────────────────────────────────────
    if (path === "/api/users" && req.method === "GET")
      return send(res, 200, listUsers(actor, q));
    if (path === "/api/users" && req.method === "POST")
      return send(res, 201, createUser(actor, await readBody(req)));
    if (path === "/api/users/tree" && req.method === "GET")
      return send(res, 200, orgTree(actor));

    // ── Org chart ─────────────────────────────────────────────────
    if (path === "/api/org/graph" && req.method === "GET")
      return send(res, 200, orgGraph(actor, { includeInactive: q.includeInactive }));
    if (path === "/api/org/positions" && req.method === "POST") {
      const b = await readBody(req);
      return send(res, 200, savePositions(actor, b.positions));
    }

    const userMatch = path.match(/^\/api\/users\/([^/]+)$/);
    if (userMatch && req.method === "PATCH")
      return send(
        res,
        200,
        updateUser(actor, userMatch[1], await readBody(req))
      );
    if (userMatch && req.method === "DELETE")
      return send(res, 200, removeUser(actor, userMatch[1], { force: q.force === "true" }));

    const managerMatch = path.match(/^\/api\/users\/([^/]+)\/manager$/);
    if (managerMatch && req.method === "PUT") {
      const b = await readBody(req);
      return send(res, 200, setManager(actor, managerMatch[1], b.managerId ?? null));
    }

    return send(res, 404, { error: "Unknown endpoint" });
  } catch (err) {
    return handleError(res, err);
  }
});

server.listen(PORT, () => {
  console.log(`[eagle-tasks] standalone task app on http://localhost:${PORT}`);
});
