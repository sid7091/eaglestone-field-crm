import { db, nowISO } from "./db.mjs";
import { hashPassword } from "./auth.mjs";
import { canAssign, ROLES, DEPARTMENTS } from "./permissions.mjs";
import { TaskError } from "./tasks.mjs";

const PUBLIC =
  "id,email,name,role,department,phone,isActive,regionCode,reportsTo,chartX,chartY,createdAt,updatedAt";

export function listUsers(actor, filters = {}) {
  let rows = db
    .prepare(`SELECT ${PUBLIC} FROM users WHERE isActive=1 ORDER BY name`)
    .all();

  if (filters.q) {
    const q = filters.q.toLowerCase();
    rows = rows.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }
  if (filters.role) rows = rows.filter((u) => u.role === filters.role);
  if (filters.department)
    rows = rows.filter((u) => u.department === filters.department);
  if (filters.regionCode)
    rows = rows.filter((u) => u.regionCode === filters.regionCode);

  // assignableOnly=true → only users `actor` may assign to
  if (filters.assignableOnly === "true") {
    rows = rows.filter((u) => canAssign(actor, u));
  } else if (actor.role !== "ADMIN" && filters.all !== "true") {
    rows = rows.filter((u) => u.regionCode === actor.regionCode);
  }
  return rows;
}

export function orgTree(actor) {
  let rows = db.prepare(`SELECT ${PUBLIC} FROM users`).all();
  if (actor.role === "MANAGER")
    rows = rows.filter((u) => u.regionCode === actor.regionCode);
  else if (actor.role !== "ADMIN")
    throw new TaskError("Not allowed", 403);

  const byId = new Map(rows.map((u) => [u.id, { ...u, reports: [] }]));
  const roots = [];
  for (const u of byId.values()) {
    if (u.reportsTo && byId.has(u.reportsTo)) {
      byId.get(u.reportsTo).reports.push(u);
    } else {
      roots.push(u);
    }
  }
  return roots;
}

export function wouldCycle(userId, newManagerId) {
  let cur = newManagerId;
  let guard = 0;
  while (cur) {
    if (cur === userId) return true;
    const m = db.prepare("SELECT reportsTo FROM users WHERE id=?").get(cur);
    cur = m?.reportsTo || null;
    if (++guard > 100) return true;
  }
  return false;
}

export function updateUser(actor, userId, patch) {
  if (actor.role !== "ADMIN")
    throw new TaskError("Only an admin can manage users", 403);
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(userId);
  if (!user) throw new TaskError("User not found", 404);

  if (patch.role && !ROLES.includes(patch.role))
    throw new TaskError("Invalid role");
  if (patch.department && !DEPARTMENTS.includes(patch.department))
    throw new TaskError("Invalid department");
  if (patch.reportsTo) {
    if (patch.reportsTo === userId)
      throw new TaskError("A user cannot report to themselves");
    if (!db.prepare("SELECT id FROM users WHERE id=?").get(patch.reportsTo))
      throw new TaskError("Manager not found", 404);
    if (wouldCycle(userId, patch.reportsTo))
      throw new TaskError("That change would create a reporting cycle");
  }
  if (patch.name !== undefined && !String(patch.name).trim())
    throw new TaskError("Name cannot be empty");
  if (patch.email !== undefined) {
    const email = String(patch.email).trim();
    if (!email) throw new TaskError("Email cannot be empty");
    const clash = db.prepare("SELECT id FROM users WHERE email=?").get(email);
    if (clash && clash.id !== userId)
      throw new TaskError("Email already in use", 409);
  }

  db.prepare(
    `UPDATE users SET name=?, email=?, phone=?, role=?, department=?,
       regionCode=?, reportsTo=?, isActive=?, updatedAt=? WHERE id=?`
  ).run(
    patch.name !== undefined ? String(patch.name).trim() : user.name,
    patch.email !== undefined ? String(patch.email).trim() : user.email,
    patch.phone === undefined ? user.phone : patch.phone || null,
    patch.role ?? user.role,
    patch.department ?? user.department,
    patch.regionCode ?? user.regionCode,
    patch.reportsTo === undefined ? user.reportsTo : patch.reportsTo || null,
    patch.isActive === undefined ? user.isActive : patch.isActive ? 1 : 0,
    nowISO(),
    userId
  );
  return db.prepare(`SELECT ${PUBLIC} FROM users WHERE id=?`).get(userId);
}

export function createUser(actor, body) {
  if (actor.role !== "ADMIN")
    throw new TaskError("Only an admin can create users", 403);
  const {
    email,
    name,
    password,
    role,
    department,
    regionCode,
    reportsTo,
    phone,
    chartX,
    chartY,
  } = body;
  if (!email || !name || !password)
    throw new TaskError("email, name and password are required");
  if (db.prepare("SELECT id FROM users WHERE email=?").get(email))
    throw new TaskError("Email already in use", 409);
  if (reportsTo && !db.prepare("SELECT id FROM users WHERE id=?").get(reportsTo))
    throw new TaskError("Manager not found", 404);

  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
  const id = crypto.randomUUID();
  const ts = nowISO();
  db.prepare(
    `INSERT INTO users
       (id,email,password,name,role,department,phone,isActive,regionCode,reportsTo,chartX,chartY,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,1,?,?,?,?,?,?)`
  ).run(
    id,
    email,
    hashPassword(password),
    name,
    ROLES.includes(role) ? role : "OPERATOR",
    DEPARTMENTS.includes(department) ? department : "PRODUCTION",
    phone ?? null,
    regionCode || "RJ",
    reportsTo || null,
    num(chartX),
    num(chartY),
    ts,
    ts
  );
  return db.prepare(`SELECT ${PUBLIC} FROM users WHERE id=?`).get(id);
}
