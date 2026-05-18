import { db, newId, nowISO } from "./db.mjs";
import { hashPassword } from "./auth.mjs";

const count = db.prepare("SELECT COUNT(*) c FROM users").get().c;
if (count > 0 && !process.env.FORCE_SEED) {
  console.log(`[seed] ${count} users already present — skipping.`);
  process.exit(0);
}

const ts = nowISO();
const mk = ({ email, name, role, department, regionCode = "KA", reportsTo = null }) => {
  const id = newId();
  db.prepare(
    `INSERT INTO users (id,email,password,name,role,department,phone,isActive,regionCode,reportsTo,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,1,?,?,?,?)`
  ).run(
    id,
    email,
    hashPassword("password123"),
    name,
    role,
    department,
    null,
    regionCode,
    reportsTo,
    ts,
    ts
  );
  return id;
};

const admin = mk({ email: "admin@eaglestone.in", name: "Aarav Admin", role: "ADMIN", department: "ADMIN" });
const manager = mk({ email: "manager@eaglestone.in", name: "Meera Manager", role: "MANAGER", department: "SALES", reportsTo: admin });
const supervisor = mk({ email: "supervisor@eaglestone.in", name: "Suresh Supervisor", role: "SUPERVISOR", department: "DISPATCH", reportsTo: manager });
const warehouse = mk({ email: "warehouse@eaglestone.in", name: "Wasim Warehouse", role: "OPERATOR", department: "WAREHOUSE", reportsTo: supervisor });
const accounts = mk({ email: "accounts@eaglestone.in", name: "Anita Accounts", role: "OPERATOR", department: "ACCOUNTS", reportsTo: supervisor });
const dispatch = mk({ email: "dispatch@eaglestone.in", name: "Dinesh Dispatch", role: "OPERATOR", department: "DISPATCH", reportsTo: supervisor });
mk({ email: "viewer@eaglestone.in", name: "Vivek Viewer", role: "VIEWER", department: "HR", reportsTo: manager });

// Sample template: a dispatch needs Warehouse + Accounts + Dispatch to coordinate.
const tplId = newId();
db.prepare(
  `INSERT INTO task_templates (id,name,description,defaultPriority,defaultDeadlineHours,createdById,isActive,createdAt,updatedAt)
   VALUES (?,?,?,?,?,?,1,?,?)`
).run(
  tplId,
  "Dispatch Order",
  "Coordinate a customer dispatch across Warehouse, Accounts and Dispatch.",
  "HIGH",
  48,
  admin,
  ts,
  ts
);
const step = (title, dept, offset, order) =>
  db
    .prepare(
      `INSERT INTO task_template_steps (id,templateId,title,description,assigneeRole,assigneeDepartment,assigneeUserId,priority,deadlineOffsetHours,orderIndex)
       VALUES (?,?,?,?,NULL,?,NULL,?,?,?)`
    )
    .run(newId(), tplId, title, null, dept, "HIGH", offset, order);
step("Prepare and pack slabs", "WAREHOUSE", -24, 0);
step("Clear payment / generate invoice", "ACCOUNTS", -12, 1);
step("Arrange transport and dispatch", "DISPATCH", 0, 2);

console.log("[seed] Seeded users (password: password123) and a Dispatch Order template.");
console.log("[seed] Logins: admin@ / manager@ / supervisor@ / warehouse@ / accounts@ / dispatch@ / viewer@ eaglestone.in");
