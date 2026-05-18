# Eagle Tasks — standalone internal task-assignment app

A fully self-contained task-assignment app for Eaglestone. It lives entirely in
this `task-app/` folder and **does not touch the parent Eaglestone CRM**:

- **Zero npm dependencies** — Node.js built-ins only (`node:sqlite`,
  `node:http`, `node:crypto`).
- **Own database** — a single SQLite file at `task-app/data/tasks.db`
  (git-ignored). It never reads or writes the CRM's Prisma DB.
- **Own server/port** — runs on `:4100`, independent of the Next.js app.
- Nothing outside `task-app/` is modified, so it cannot affect the CRM or any
  other app in the repo.

## Requirements

Node.js **≥ 22.5** (uses the built-in `node:sqlite` module).

## Run

```bash
cd task-app
npm run seed     # one-time: create demo users + a Dispatch Order template
npm start        # serves http://localhost:4100
```

Demo logins (password `password123`): `admin@`, `manager@`, `supervisor@`,
`warehouse@`, `accounts@`, `dispatch@`, `viewer@` `eaglestone.in`.

## Features

- **Hierarchy** — admin manages each user's role, department, region and
  `reportsTo`; reporting-tree view, cycle-guarded.
- **Delegation chain** — a task owner can *forward* a task; parent + child stay
  linked and the chain auto-completes upward.
- **Parallel subtasks** — *split* a task into N department subtasks (e.g.
  Warehouse + Accounts + Dispatch). Parent is `BLOCKED_BY_SUBTASKS` and
  auto-completes only when every child finishes.
- **Templates** — admins define reusable templates whose steps auto-resolve an
  assignee by pinned user → department+region → role+region. Preview before
  instantiation; unresolved steps return `422`.
- **Visibility** — `ADMIN`/`MANAGER` see the whole chain; junior roles see only
  their own task, what they delegated, and one level up.
- **Gamification** — on-time completions build a streak (resets when late) and
  award priority-weighted points + milestone badges; leaderboard + personal
  stats.

## Roles

`ADMIN > MANAGER > SUPERVISOR > OPERATOR > VIEWER`. Only ADMIN/MANAGER/SUPERVISOR
can originate top-level tasks; OPERATOR can only forward/split tasks already
assigned to them; VIEWER is read-only.

## Layout

```
task-app/
  server.mjs          HTTP server + routing
  src/db.mjs           SQLite schema/bootstrap (node:sqlite)
  src/auth.mjs         scrypt password hashing + signed session cookie
  src/permissions.mjs  role hierarchy, canAssign
  src/visibility.mjs   one-level-up vs full-chain rule
  src/gamification.mjs points / streaks / badges / leaderboard
  src/tasks.mjs        task domain (create/forward/split/complete/cancel)
  src/templates.mjs    template CRUD + resolution + instantiate
  src/users.mjs        directory, org tree, admin updates
  src/seed.mjs         demo data
  public/              vanilla-JS single-page UI
  data/tasks.db        runtime SQLite file (git-ignored)
```
