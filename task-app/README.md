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

- **Org chart editor** — a drag-and-drop canvas of the org (`Org` tab). Cards
  are placed freely like a brainstorming board and their positions persist.
  Tap (phone) or hover (PC) a card for a floating info panel with **Add
  report / Edit / Manager / Remove**. Dropping a card onto another re-parents
  that person, with an *Undo*; a card's own reports are never offered as a
  drop target, so a reporting loop can't be made. **Tidy** re-runs the
  auto-layout. `ADMIN` edits, `MANAGER` gets a read-only view of their region.
- **Hierarchy** — admin manages each user's role, department, region and
  `reportsTo`; cycle-guarded. A `List` view remains for bulk edits.
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

### Removing someone

Removal deactivates rather than hard-deletes — tasks, gamification rows and
template steps all reference users, so deleting the row would destroy task
history. Their direct reports are lifted to the removed person's own manager so
the chart never fractures. Removal is refused while they still hold open tasks
unless confirmed, and you can remove neither yourself nor the last active admin.

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
  src/org.mjs          org-chart graph, positions, re-parent, remove
  src/seed.mjs         demo data
  public/app.js        vanilla-JS single-page UI
  public/orgchart.js   drag-and-drop org chart editor
  data/tasks.db        runtime SQLite file (git-ignored)
```
