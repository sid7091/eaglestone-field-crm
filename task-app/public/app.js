// Eagle Tasks — Material Design 3 mobile-first SPA (vanilla, no build step)
const app = document.getElementById("app");
const modalRoot = document.getElementById("modal-root");
const snackRoot = document.getElementById("snackbar");

let ME = null;
let META = { roles: [], departments: [] };
let shellReady = false;

// ── helpers ────────────────────────────────────────────────────────
async function api(path, method = "GET", body) {
  const res = await fetch("/api" + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  const data = txt ? JSON.parse(txt) : null;
  if (!res.ok) {
    const e = new Error(data?.error || "Request failed");
    e.status = res.status;
    e.details = data?.details;
    throw e;
  }
  return data;
}
const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const icon = (n) => `<span class="material-symbols-outlined">${n}</span>`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const isOverdue = (t) =>
  t.overdue && !["COMPLETED", "CANCELLED"].includes(t.status);
const statusKey = (t) => (isOverdue(t) ? "overdue" : t.status);
const statusLabel = (t) => (isOverdue(t) ? "Overdue" : t.status.replace(/_/g, " "));
const chip = (t) => `<span class="chip s-${statusKey(t)}">${esc(statusLabel(t))}</span>`;
const canOriginate = () => ["ADMIN", "MANAGER", "SUPERVISOR"].includes(ME.role);
const isSenior = () => ["ADMIN", "MANAGER"].includes(ME.role);

function snack(msg, isErr) {
  snackRoot.innerHTML = `<div class="snack ${isErr ? "err" : ""}">${esc(msg)}</div>`;
  setTimeout(() => (snackRoot.innerHTML = ""), 3200);
}
function dialog(html) {
  modalRoot.innerHTML = `<div class="scrim"><div class="dialog"><div class="grabber"></div>${html}</div></div>`;
  modalRoot.querySelector(".scrim").addEventListener("click", (e) => {
    if (e.target.classList.contains("scrim")) closeDialog();
  });
}
const closeDialog = () => (modalRoot.innerHTML = "");
const $ = (sel) => document.querySelector(sel);

// ── boot / auth ────────────────────────────────────────────────────
async function boot() {
  try {
    META = await api("/meta");
    ME = await api("/me");
    if (!location.hash) location.hash = "#/tasks";
    route();
  } catch {
    renderLogin();
  }
}

function renderLogin() {
  shellReady = false;
  app.innerHTML = `
    <div class="login-screen"><div class="login-card">
      <div class="logo">EAGLE&nbsp;TASKS</div>
      <p class="tag">Internal task assignment</p>
      <form id="lf">
        <div class="field"><label>Email</label><input name="email" value="admin@eaglestone.in" autocomplete="username" /></div>
        <div class="field"><label>Password</label><input name="password" type="password" value="password123" autocomplete="current-password" /></div>
        <button class="btn block lg" type="submit">Sign in</button>
        <div class="err-tile" id="le" style="display:none"></div>
      </form>
      <p class="muted" style="margin-top:14px;text-align:center">Demo · password123 · admin@ · manager@ · supervisor@ · warehouse@ · accounts@ · dispatch@ · viewer@ eaglestone.in</p>
    </div></div>`;
  $("#lf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      ME = await api("/login", "POST", { email: f.get("email"), password: f.get("password") });
      META = await api("/meta");
      location.hash = "#/tasks";
      route();
    } catch (err) {
      const el = $("#le");
      el.style.display = "block";
      el.textContent = err.message;
    }
  });
}
async function logout() {
  await api("/logout", "POST");
  ME = null;
  location.hash = "";
  renderLogin();
}

// ── app shell (app bar + content + bottom nav + FAB) ───────────────
function navItems() {
  const items = [{ key: "tasks", label: "Tasks", icon: "checklist" }];
  items.push({ key: "leaderboard", label: "Board", icon: "emoji_events" });
  if (canOriginate()) items.push({ key: "templates", label: "Templates", icon: "dashboard_customize" });
  if (ME.role === "ADMIN") items.push({ key: "org", label: "Org", icon: "groups" });
  items.push({ key: "me", label: "Me", icon: "person" });
  return items;
}
function buildShell() {
  app.innerHTML = `
    <header class="app-bar">
      <button class="icon-btn leading" id="backBtn" style="display:none">${icon("arrow_back")}</button>
      <h1 id="barTitle">Tasks</h1>
      <div class="actions"><button class="icon-btn" id="logoutBtn" title="Logout">${icon("logout")}</button></div>
    </header>
    <main class="content" id="content"></main>
    <button class="fab" id="fab" style="display:none">${icon("add")}<span id="fabLabel">New</span></button>
    <nav class="bottom-nav" id="bnav"></nav>`;
  $("#logoutBtn").addEventListener("click", logout);
  $("#bnav").innerHTML = navItems()
    .map(
      (n) => `<button data-nav="${n.key}"><span class="ind">${icon(n.icon)}</span>${n.label}</button>`
    )
    .join("");
  $("#bnav")
    .querySelectorAll("[data-nav]")
    .forEach((b) => b.addEventListener("click", () => (location.hash = "#/" + b.dataset.nav)));
  shellReady = true;
}
function setActiveNav(key) {
  $("#bnav")
    ?.querySelectorAll("[data-nav]")
    .forEach((b) => b.classList.toggle("active", b.dataset.nav === key));
}
// view(title, html, {nav, back, fab:{label,onClick}})
function view(title, html, opts = {}) {
  if (!shellReady) buildShell();
  $("#barTitle").textContent = title;
  $("#content").innerHTML = html;
  $("#content").scrollTop = 0;
  window.scrollTo(0, 0);
  setActiveNav(opts.nav || null);
  const back = $("#backBtn");
  back.style.display = opts.back ? "flex" : "none";
  back.onclick = opts.back || null;
  const fab = $("#fab");
  if (opts.fab) {
    fab.style.display = "inline-flex";
    $("#fabLabel").textContent = opts.fab.label;
    fab.onclick = opts.fab.onClick;
  } else {
    fab.style.display = "none";
  }
}
const loading = (title, opts) => view(title, `<div class="spin">${icon("hourglass_empty")}<p>Loading…</p></div>`, opts);

// ── router ─────────────────────────────────────────────────────────
function route() {
  if (!ME) return renderLogin();
  const h = location.hash.replace(/^#\//, "") || "tasks";
  const [page, arg] = h.split("/");
  ({
    tasks: viewTasks,
    task: () => viewTask(arg),
    leaderboard: viewLeaderboard,
    templates: viewTemplates,
    org: viewOrg,
    me: viewMe,
  }[page] || viewTasks)();
}
window.addEventListener("hashchange", route);

// ── Tasks list ─────────────────────────────────────────────────────
let taskTab = "mine";
let statusFilter = "";

async function viewTasks() {
  loading("Tasks", { nav: "tasks", fab: canOriginate() ? { label: "New", onClick: createTaskModal } : null });
  const qp = new URLSearchParams();
  if (taskTab === "mine") qp.set("mine", "true");
  if (taskTab === "created") qp.set("assignedById", ME.id);
  if (statusFilter) qp.set("status", statusFilter);
  let tasks = await api("/tasks?" + qp.toString());
  if (taskTab === "created") tasks = tasks.filter((t) => t.assignedById === ME.id);

  const statuses = ["", "PENDING", "IN_PROGRESS", "FORWARDED", "BLOCKED_BY_SUBTASKS", "COMPLETED"];
  const fchips = statuses
    .map(
      (s) =>
        `<button class="fchip ${statusFilter === s ? "sel" : ""}" data-st="${s}">${
          statusFilter === s && s ? icon("check") : ""
        }${s ? esc(s.replace(/_/g, " ")) : "All"}</button>`
    )
    .join("");

  const rows = tasks.length
    ? tasks
        .map(
          (t) => `<div class="list-item" data-id="${t.id}">
            <div class="lead p-${esc(t.priority)}">${icon(
            t.decomposition === "SUBTASKS" ? "account_tree" : t.decomposition === "FORWARDED" ? "fast_forward" : "assignment"
          )}</div>
            <div class="body">
              <div class="ttl">${esc(t.title)}</div>
              <div class="sub">${esc(t.assignedToName || "")} · due ${fmtDate(t.deadline)}</div>
            </div>
            <div class="trail">${chip(t)}<span class="chev">${icon("chevron_right")}</span></div>
          </div>`
        )
        .join("")
    : `<div class="empty">${icon("inbox")}<p>No tasks here yet.</p></div>`;

  view(
    "Tasks",
    `<div class="segmented">
       <button data-tab="mine" class="${taskTab === "mine" ? "active" : ""}">Assigned to me</button>
       <button data-tab="created" class="${taskTab === "created" ? "active" : ""}">Created by me</button>
       <button data-tab="all" class="${taskTab === "all" ? "active" : ""}">All</button>
     </div>
     ${canOriginate() ? `<button class="btn tonal block" id="fromTpl" style="margin-bottom:12px">${icon("dashboard_customize")} Start from a template</button>` : ""}
     <div class="filter-row">${fchips}</div>
     <div class="card pad0">${rows}</div>`,
    { nav: "tasks", fab: canOriginate() ? { label: "New", onClick: createTaskModal } : null }
  );

  document.querySelectorAll("[data-tab]").forEach((b) =>
    b.addEventListener("click", () => {
      taskTab = b.dataset.tab;
      viewTasks();
    })
  );
  document.querySelectorAll("[data-st]").forEach((b) =>
    b.addEventListener("click", () => {
      statusFilter = b.dataset.st;
      viewTasks();
    })
  );
  document.querySelectorAll(".list-item[data-id]").forEach((r) =>
    r.addEventListener("click", () => (location.hash = "#/task/" + r.dataset.id))
  );
  $("#fromTpl")?.addEventListener("click", () => instantiateModal());
}

async function assignableOptions(selectedId) {
  const users = await api("/users?assignableOnly=true");
  if (!users.length) return "";
  return users
    .map(
      (u) =>
        `<option value="${u.id}" ${u.id === selectedId ? "selected" : ""}>${esc(u.name)} — ${esc(u.role)} · ${esc(u.department)}</option>`
    )
    .join("");
}

async function createTaskModal() {
  const opts = await assignableOptions();
  if (!opts) return snack("You have no one you can assign to.", true);
  dialog(`<h2>New task</h2>
    <p class="dialog-sub">Create a task and assign it to one person.</p>
    <form id="ct">
      <div class="field"><label>Title</label><input name="title" required /></div>
      <div class="field"><label>Description</label><textarea name="description" rows="3"></textarea></div>
      <div class="field"><label>Assign to</label><select name="assignedToId" required>${opts}</select></div>
      <div class="grid2">
        <div class="field"><label>Deadline</label><input name="deadline" type="datetime-local" required /></div>
        <div class="field"><label>Priority</label><select name="priority">
          ${["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => `<option ${p === "MEDIUM" ? "selected" : ""}>${p}</option>`).join("")}
        </select></div>
      </div>
      <div class="err-tile" id="ce" style="display:none"></div>
      <div class="dialog-actions">
        <button type="button" class="btn text" id="cx">Cancel</button>
        <button class="btn" type="submit">Create task</button>
      </div>
    </form>`);
  $("#cx").addEventListener("click", closeDialog);
  $("#ct").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api("/tasks", "POST", {
        title: f.get("title"),
        description: f.get("description"),
        assignedToId: f.get("assignedToId"),
        deadline: new Date(f.get("deadline")).toISOString(),
        priority: f.get("priority"),
      });
      closeDialog();
      snack("Task created");
      viewTasks();
    } catch (err) {
      const el = $("#ce");
      el.style.display = "block";
      el.textContent = err.message;
    }
  });
}

// ── Task detail ────────────────────────────────────────────────────
async function viewTask(id) {
  loading("Task", { back: () => (location.hash = "#/tasks") });
  let data;
  try {
    data = await api("/tasks/" + id);
  } catch (err) {
    return view("Task", `<div class="err-tile">${esc(err.message)}</div>`, { back: () => (location.hash = "#/tasks") });
  }
  const t = data.task;
  const mine = t.assignedToId === ME.id;
  const leaf = t.decomposition === "NONE";
  const open = !["COMPLETED", "CANCELLED"].includes(t.status);
  const rootId = t.rootTaskId || t.id;

  // Action area — the part users were getting stuck on.
  let actionsHtml = "";
  if (mine && open && leaf) {
    const startBtn =
      t.status === "PENDING"
        ? `<button class="btn tonal block lg" id="start">${icon("play_arrow")} Start working on this</button>`
        : "";
    actionsHtml = `
      <div class="section-title">What would you like to do?</div>
      ${startBtn}
      <button class="btn block lg" id="done" style="margin-top:8px">${icon("check_circle")} Mark complete</button>
      <button class="btn outlined block lg" id="fwd" style="margin-top:8px">${icon("fast_forward")} Assign onward to one person</button>
      <button class="btn outlined block lg" id="split" style="margin-top:8px">${icon("account_tree")} Split across a team</button>
      <p class="muted" style="margin-top:8px">“Assign onward” hands the whole task to someone else. “Split” divides it into parallel tasks — you’re done when they all finish.</p>`;
  } else if (mine && open && !leaf) {
    actionsHtml = `<div class="help">${icon("hourglass_top")}<div>You've ${
      t.decomposition === "SUBTASKS" ? "split this into subtasks" : "assigned this onward"
    }. It will complete automatically once the people below you finish.</div></div>`;
  } else if (!mine && open) {
    actionsHtml = `<div class="help">${icon("info")}<div>This task is currently with <b>${esc(
      t.assignedToName
    )}</b>. Only they can act on it right now.</div></div>`;
  }
  const cancelBtn =
    (ME.role === "ADMIN" || t.assignedById === ME.id) && open
      ? `<button class="btn danger-text block" id="cancel" style="margin-top:10px">${icon("cancel")} Cancel this task & its subtasks</button>`
      : "";

  const chainHtml = data.chain
    .map((c) => {
      const depth = c.id === rootId ? 0 : c.parentTaskId === rootId ? 1 : 2;
      const mineNode = c.assignedToId === ME.id;
      return `<li class="depth${depth} ${mineNode ? "me" : ""}">
        <div class="row between" style="gap:8px">
          <div style="min-width:0">
            <div class="node-title">${esc(c.title)} ${mineNode ? '<span class="muted">(you)</span>' : ""}</div>
            <div class="node-sub">${esc(c.assignedToName || "")} · ${esc(c.assignedToDepartment || "")} · due ${fmtDate(c.deadline)}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">${chip(c)}${
        c.id !== t.id ? `<button class="icon-btn" data-open="${c.id}">${icon("open_in_new")}</button>` : ""
      }</div>
        </div></li>`;
    })
    .join("");

  view(
    t.title,
    `<div class="card">
       <div class="row" style="gap:8px;margin-bottom:8px">${chip(t)}<span class="chip">${icon("flag")} ${esc(t.priority)}</span>${
      t.templateId ? `<span class="chip">${icon("dashboard_customize")} template</span>` : ""
    }</div>
       <p style="font-size:15px">${esc(t.description || "No description.")}</p>
       <div class="muted" style="margin-top:10px">${icon("schedule")} Due ${fmtDate(t.deadline)}</div>
       <div class="muted" style="margin-top:4px">${icon("person")} ${esc(t.assignedByName)} → ${esc(t.assignedToName)}</div>
     </div>
     <div class="card">${actionsHtml || '<p class="muted">No actions available.</p>'}${cancelBtn}
       <div class="err-tile" id="te" style="display:none"></div>
     </div>
     <div class="section-title">Chain</div>
     <div class="card">
       <ul class="timeline">${chainHtml}</ul>
       ${isSenior() ? "" : `<p class="muted" style="margin-top:6px">You see your task, what you delegated, and one level up. Managers see the full chain.</p>`}
     </div>`,
    { back: () => (location.hash = "#/tasks") }
  );

  document.querySelectorAll("[data-open]").forEach((b) =>
    b.addEventListener("click", () => (location.hash = "#/task/" + b.dataset.open))
  );
  const act = async (fn, msg) => {
    try {
      await fn();
      if (msg) snack(msg);
      viewTask(id);
    } catch (err) {
      const el = $("#te");
      el.style.display = "block";
      el.textContent = err.message + (err.details ? " " + JSON.stringify(err.details) : "");
    }
  };
  $("#start")?.addEventListener("click", () => act(() => api("/tasks/" + id, "PATCH", { status: "IN_PROGRESS" }), "Marked in progress"));
  $("#done")?.addEventListener("click", () => act(() => api("/tasks/" + id + "/complete", "POST"), "Completed 🎉"));
  $("#cancel")?.addEventListener("click", () => {
    if (confirm("Cancel this task and all its subtasks?")) act(() => api("/tasks/" + id + "/cancel", "POST"), "Cancelled");
  });
  $("#fwd")?.addEventListener("click", () => forwardModal(id, t));
  $("#split")?.addEventListener("click", () => splitModal(id, t));
}

async function forwardModal(id, t) {
  const opts = await assignableOptions();
  if (!opts) return snack("You have no one you can assign to.", true);
  dialog(`<h2>Assign onward</h2>
    <p class="dialog-sub">Hand this whole task to one person. They can then complete it, or pass it on / split it further.</p>
    <form id="ff">
      <div class="field"><label>Assign to</label><select name="assignedToId" required>${opts}</select></div>
      <div class="field"><label>New deadline (optional · must be on or before ${fmtDate(t.deadline)})</label><input name="deadline" type="datetime-local" /></div>
      <div class="field"><label>Note (optional)</label><textarea name="note" rows="2"></textarea></div>
      <div class="err-tile" id="fe" style="display:none"></div>
      <div class="dialog-actions">
        <button type="button" class="btn text" id="x">Cancel</button>
        <button class="btn" type="submit">${icon("fast_forward")} Assign onward</button>
      </div>
    </form>`);
  $("#x").addEventListener("click", closeDialog);
  $("#ff").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api("/tasks/" + id + "/forward", "POST", {
        assignedToId: f.get("assignedToId"),
        deadline: f.get("deadline") ? new Date(f.get("deadline")).toISOString() : undefined,
        note: f.get("note") || undefined,
      });
      closeDialog();
      snack("Assigned onward");
      viewTask(id);
    } catch (err) {
      const el = $("#fe");
      el.style.display = "block";
      el.textContent = err.message;
    }
  });
}

async function splitModal(id, t) {
  const users = await api("/users?assignableOnly=true");
  if (!users.length) return snack("You have no one you can assign to.", true);
  const opt = users.map((u) => `<option value="${u.id}">${esc(u.name)} — ${esc(u.department)}</option>`).join("");
  const rowHtml = () => `<div class="subtask-card">
      <button type="button" class="icon-btn st-del" style="position:absolute;right:6px;top:6px">${icon("close")}</button>
      <div class="field" style="margin-bottom:8px"><label>Subtask</label><input class="st-title" placeholder="What needs doing" /></div>
      <div class="grid2">
        <div class="field" style="margin:0"><label>Who</label><select class="st-user">${opt}</select></div>
        <div class="field" style="margin:0"><label>Due</label><input type="datetime-local" class="st-deadline" /></div>
      </div></div>`;
  dialog(`<h2>Split across a team</h2>
    <p class="dialog-sub">Divide this into parallel subtasks for different people (e.g. Warehouse, Accounts, Dispatch). This task auto-completes when every subtask is done. Each due date must be on or before ${fmtDate(t.deadline)}.</p>
    <div id="rows">${rowHtml()}${rowHtml()}</div>
    <button type="button" class="btn text" id="addRow">${icon("add")} Add another</button>
    <div class="err-tile" id="se" style="display:none"></div>
    <div class="dialog-actions">
      <button class="btn text" id="x">Cancel</button>
      <button class="btn" id="go">${icon("account_tree")} Create subtasks</button>
    </div>`);
  const bind = () =>
    document.querySelectorAll(".st-del").forEach((b) =>
      b.addEventListener("click", () => {
        if (document.querySelectorAll(".subtask-card").length > 2) b.closest(".subtask-card").remove();
      })
    );
  bind();
  $("#addRow").addEventListener("click", () => {
    $("#rows").insertAdjacentHTML("beforeend", rowHtml());
    bind();
  });
  $("#x").addEventListener("click", closeDialog);
  $("#go").addEventListener("click", async () => {
    const subtasks = [...document.querySelectorAll(".subtask-card")].map((r) => ({
      title: r.querySelector(".st-title").value,
      assignedToId: r.querySelector(".st-user").value,
      deadline: r.querySelector(".st-deadline").value ? new Date(r.querySelector(".st-deadline").value).toISOString() : null,
    }));
    try {
      await api("/tasks/" + id + "/split", "POST", { subtasks });
      closeDialog();
      snack("Split into subtasks");
      viewTask(id);
    } catch (err) {
      const el = $("#se");
      el.style.display = "block";
      el.textContent = err.message;
    }
  });
}

// ── Leaderboard ────────────────────────────────────────────────────
async function viewLeaderboard() {
  loading("Board", { nav: "leaderboard" });
  const [board, me] = [await api("/tasks/leaderboard"), await api("/tasks/me/stats")];
  const medal = (i) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`);
  const rows = board.length
    ? board
        .map(
          (r, i) => `<div class="list-item" style="cursor:default">
            <div class="lead">${medal(i)}</div>
            <div class="body"><div class="ttl">${esc(r.name)}</div>
              <div class="sub">${esc(r.role)} · ${esc(r.department)} · ${esc(r.regionCode)}</div></div>
            <div class="trail"><b style="font-family:var(--font-display);font-size:18px">${r.totalPoints}</b>
              <span class="muted">🔥 ${r.currentStreak}</span></div>
          </div>`
        )
        .join("")
    : `<div class="empty">${icon("emoji_events")}<p>No scores yet. Complete tasks on time to climb.</p></div>`;
  view(
    "Leaderboard",
    `<div class="card filled">
       <div class="stat-grid">
         <div class="stat"><b>${me.totalPoints}</b><span>Your points</span></div>
         <div class="stat"><b>${me.currentStreak}</b><span>Current streak</span></div>
       </div>
     </div>
     <div class="section-title">Top performers</div>
     <div class="card pad0">${rows}</div>`,
    { nav: "leaderboard" }
  );
}

// ── Me / stats ─────────────────────────────────────────────────────
async function viewMe() {
  loading("Me", { nav: "me" });
  const s = await api("/tasks/me/stats");
  const badges = (s.badges || []).length
    ? s.badges.map((b) => `<span class="chip">${icon("workspace_premium")} ${esc(b)}</span>`).join(" ")
    : '<span class="muted">No badges yet — complete tasks on time to earn them.</span>';
  view(
    "Me",
    `<div class="card">
       <div class="row" style="gap:14px">
         <div class="lead" style="width:56px;height:56px;background:var(--primary-container);color:var(--on-primary-container)">${icon("person")}</div>
         <div><div style="font-size:18px;font-weight:700">${esc(ME.name)}</div>
           <div class="muted">${esc(ME.role)} · ${esc(ME.department)} · ${esc(ME.regionCode)}</div></div>
       </div>
     </div>
     <div class="section-title">Your stats</div>
     <div class="stat-grid">
       <div class="stat"><b>${s.totalPoints}</b><span>Points</span></div>
       <div class="stat"><b>${s.currentStreak}</b><span>Streak</span></div>
       <div class="stat"><b>${s.bestStreak}</b><span>Best streak</span></div>
       <div class="stat"><b>${s.tasksCompletedOnTime}</b><span>On time</span></div>
       <div class="stat"><b>${s.openTasks}</b><span>Open tasks</span></div>
       <div class="stat"><b>${s.overdueTasks}</b><span>Overdue</span></div>
     </div>
     <div class="section-title">Badges</div>
     <div class="card">${badges}</div>
     <button class="btn outlined block" id="lo2" style="margin-top:8px">${icon("logout")} Sign out</button>`,
    { nav: "me" }
  );
  $("#lo2").addEventListener("click", logout);
}

// ── Templates ──────────────────────────────────────────────────────
async function viewTemplates() {
  loading("Templates", { nav: "templates", fab: ME.role === "ADMIN" ? { label: "New", onClick: () => templateEditor() } : null });
  const tpls = await api("/templates");
  const isAdmin = ME.role === "ADMIN";
  const rows = tpls.length
    ? tpls
        .map(
          (t) => `<div class="card">
            <div class="row between"><div><div style="font-weight:700;font-size:16px">${esc(t.name)}</div>
              <div class="muted">${esc(t.description || "")}</div></div>
              <span class="chip">${t.steps.length} steps</span></div>
            <div class="row" style="margin-top:12px">
              <button class="btn tonal" data-inst="${t.id}">${icon("play_arrow")} Use</button>
              <button class="btn text" data-prev="${t.id}">${icon("visibility")} Preview</button>
              ${isAdmin ? `<button class="btn text" data-edit="${t.id}">${icon("edit")} Edit</button>` : ""}
            </div></div>`
        )
        .join("")
    : `<div class="empty">${icon("dashboard_customize")}<p>No templates yet.</p></div>`;
  view("Templates", rows, {
    nav: "templates",
    fab: isAdmin ? { label: "New", onClick: () => templateEditor() } : null,
  });
  document.querySelectorAll("[data-inst]").forEach((b) => b.addEventListener("click", () => instantiateModal(b.dataset.inst)));
  document.querySelectorAll("[data-prev]").forEach((b) => b.addEventListener("click", () => previewModal(b.dataset.prev)));
  document.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => templateEditor(b.dataset.edit)));
}

async function previewModal(id) {
  const r = await api("/templates/" + id + "/preview", "POST", { regionCode: ME.regionCode });
  dialog(`<h2>Resolution · ${esc(ME.regionCode)}</h2>
    <p class="dialog-sub">Who each step would be assigned to in your region right now.</p>
    <div class="card pad0">${r
      .map(
        (s) => `<div class="list-item" style="cursor:default"><div class="body">
        <div class="ttl">${esc(s.title)}</div><div class="sub">${esc(s.criteria)}</div></div>
        <div class="trail">${
          s.resolvedUser ? `<span class="chip s-COMPLETED">${esc(s.resolvedUser.name)}</span>` : `<span class="chip s-overdue">${esc(s.reason)}</span>`
        }</div></div>`
      )
      .join("")}</div>
    <div class="dialog-actions"><button class="btn text" id="x">Close</button></div>`);
  $("#x").addEventListener("click", closeDialog);
}

async function instantiateModal(id) {
  const tpls = await api("/templates");
  if (!tpls.length) return snack("No templates available.", true);
  const opts = tpls.map((t) => `<option value="${t.id}" ${t.id === id ? "selected" : ""}>${esc(t.name)}</option>`).join("");
  dialog(`<h2>Start from template</h2>
    <p class="dialog-sub">Creates the task and auto-assigns each step to people in the chosen region.</p>
    <form id="inf">
      <div class="field"><label>Template</label><select name="tpl">${opts}</select></div>
      <div class="field"><label>Region code</label><input name="region" value="${esc(ME.regionCode)}" /></div>
      <div class="field"><label>Deadline (hours from now · blank = template default)</label><input name="hours" type="number" /></div>
      <button type="button" class="btn outlined block" id="pv">${icon("visibility")} Preview assignees</button>
      <div class="muted" id="pvout" style="margin-top:8px"></div>
      <div class="err-tile" id="ie" style="display:none"></div>
      <div class="dialog-actions">
        <button type="button" class="btn text" id="x">Cancel</button>
        <button class="btn" type="submit">${icon("rocket_launch")} Create</button>
      </div>
    </form>`);
  $("#x").addEventListener("click", closeDialog);
  $("#pv").addEventListener("click", async () => {
    const r = await api("/templates/" + $("[name=tpl]").value + "/preview", "POST", { regionCode: $("[name=region]").value });
    $("#pvout").innerHTML = r.map((s) => `${esc(s.title)} → ${s.resolvedUser ? esc(s.resolvedUser.name) : "⚠ " + esc(s.reason)}`).join("<br>");
  });
  $("#inf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const r = await api("/templates/" + f.get("tpl") + "/instantiate", "POST", {
        regionCode: f.get("region"),
        deadlineHours: f.get("hours") ? Number(f.get("hours")) : undefined,
      });
      closeDialog();
      snack("Created from template");
      location.hash = "#/task/" + r.rootTaskId;
    } catch (err) {
      const el = $("#ie");
      el.style.display = "block";
      el.textContent = err.message + (err.details?.unresolved ? " — " + err.details.unresolved.map((u) => u.title).join(", ") : "");
    }
  });
}

async function templateEditor(id) {
  const tpl = id ? await api("/templates/" + id) : null;
  const sel = (cur, list) => `<option value="">—</option>` + list.map((x) => `<option ${cur === x ? "selected" : ""}>${x}</option>`).join("");
  const stepRow = (s = {}) => `<div class="subtask-card">
      <button type="button" class="icon-btn s-del" style="position:absolute;right:6px;top:6px">${icon("close")}</button>
      <div class="field" style="margin-bottom:8px"><label>Step title</label><input class="s-title" value="${esc(s.title || "")}" /></div>
      <div class="grid2">
        <div class="field" style="margin:0"><label>By role</label><select class="s-role">${sel(s.assigneeRole, META.roles)}</select></div>
        <div class="field" style="margin:0"><label>By department</label><select class="s-dept">${sel(s.assigneeDepartment, META.departments)}</select></div>
      </div>
      <div class="grid2">
        <div class="field" style="margin:8px 0 0"><label>Priority</label><select class="s-pri">${["LOW", "MEDIUM", "HIGH", "URGENT"]
          .map((p) => `<option ${(s.priority || "MEDIUM") === p ? "selected" : ""}>${p}</option>`)
          .join("")}</select></div>
        <div class="field" style="margin:8px 0 0"><label>Deadline offset (hrs)</label><input class="s-off" type="number" value="${s.deadlineOffsetHours ?? 0}" /></div>
      </div></div>`;
  dialog(`<h2>${id ? "Edit" : "New"} template</h2>
    <form id="tf">
      <div class="field"><label>Name</label><input name="name" value="${esc(tpl?.name || "")}" required /></div>
      <div class="field"><label>Description</label><textarea name="description" rows="2">${esc(tpl?.description || "")}</textarea></div>
      <div class="grid2">
        <div class="field"><label>Default priority</label><select name="dp">${["LOW", "MEDIUM", "HIGH", "URGENT"]
          .map((p) => `<option ${(tpl?.defaultPriority || "MEDIUM") === p ? "selected" : ""}>${p}</option>`)
          .join("")}</select></div>
        <div class="field"><label>Default deadline (hrs)</label><input name="dh" type="number" value="${tpl?.defaultDeadlineHours ?? 48}" /></div>
      </div>
      <div class="section-title">Steps</div>
      <div id="steps">${(tpl?.steps?.length ? tpl.steps : [{}, {}]).map(stepRow).join("")}</div>
      <button type="button" class="btn text" id="addStep">${icon("add")} Add step</button>
      <div class="err-tile" id="ee" style="display:none"></div>
      <div class="dialog-actions">
        <button type="button" class="btn text" id="x">Cancel</button>
        ${id ? `<button type="button" class="btn danger-text" id="del">Deactivate</button>` : ""}
        <button class="btn" type="submit">Save</button>
      </div>
    </form>`);
  const bindDel = () =>
    document.querySelectorAll(".s-del").forEach((b) => b.addEventListener("click", () => b.closest(".subtask-card").remove()));
  bindDel();
  $("#addStep").addEventListener("click", () => {
    $("#steps").insertAdjacentHTML("beforeend", stepRow());
    bindDel();
  });
  $("#x").addEventListener("click", closeDialog);
  $("#del")?.addEventListener("click", async () => {
    await api("/templates/" + id, "DELETE");
    closeDialog();
    snack("Template deactivated");
    viewTemplates();
  });
  $("#tf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const steps = [...document.querySelectorAll(".subtask-card")].map((s) => ({
      title: s.querySelector(".s-title").value,
      assigneeRole: s.querySelector(".s-role").value || null,
      assigneeDepartment: s.querySelector(".s-dept").value || null,
      priority: s.querySelector(".s-pri").value,
      deadlineOffsetHours: Number(s.querySelector(".s-off").value) || 0,
    }));
    const payload = {
      name: f.get("name"),
      description: f.get("description"),
      defaultPriority: f.get("dp"),
      defaultDeadlineHours: Number(f.get("dh")) || 48,
      steps,
    };
    try {
      if (id) await api("/templates/" + id, "PUT", payload);
      else await api("/templates", "POST", payload);
      closeDialog();
      snack("Template saved");
      viewTemplates();
    } catch (err) {
      const el = $("#ee");
      el.style.display = "block";
      el.textContent = err.message;
    }
  });
}

// ── Org admin ──────────────────────────────────────────────────────
async function viewOrg() {
  loading("Org", { nav: "org", fab: { label: "User", onClick: newUserModal } });
  const [users, tree] = [await api("/users?all=true"), await api("/users/tree")];
  const rows = users
    .map(
      (u) => `<div class="list-item" data-edit="${u.id}">
        <div class="lead">${icon("person")}</div>
        <div class="body"><div class="ttl">${esc(u.name)}</div>
          <div class="sub">${esc(u.role)} · ${esc(u.department)} · ${esc(u.regionCode)}</div></div>
        <span class="chev">${icon("edit")}</span></div>`
    )
    .join("");
  const renderTree = (n, d = 0) =>
    `<li class="depth${Math.min(d, 2)}"><div class="node-title">${esc(n.name)}</div>
      <div class="node-sub">${esc(n.role)} · ${esc(n.department)} · ${esc(n.regionCode)}</div>
      ${n.reports?.length ? `<ul class="timeline" style="margin-top:8px">${n.reports.map((c) => renderTree(c, d + 1)).join("")}</ul>` : ""}</li>`;
  view(
    "Org & Users",
    `<div class="section-title">People</div>
     <div class="card pad0">${rows}</div>
     <div class="section-title">Reporting tree</div>
     <div class="card"><ul class="timeline">${tree.map((r) => renderTree(r)).join("")}</ul></div>`,
    { nav: "org", fab: { label: "User", onClick: newUserModal } }
  );
  document.querySelectorAll("[data-edit]").forEach((r) =>
    r.addEventListener("click", () => editUserModal(users.find((u) => u.id === r.dataset.edit), users))
  );
}

function editUserModal(u, users) {
  const sel = (cur, list) => list.map((x) => `<option ${cur === x ? "selected" : ""}>${x}</option>`).join("");
  const mgr =
    `<option value="">— none —</option>` +
    users.filter((x) => x.id !== u.id).map((x) => `<option value="${x.id}" ${u.reportsTo === x.id ? "selected" : ""}>${esc(x.name)}</option>`).join("");
  dialog(`<h2>${esc(u.name)}</h2>
    <p class="dialog-sub">${esc(u.email)}</p>
    <form id="uf">
      <div class="grid2">
        <div class="field"><label>Role</label><select name="role">${sel(u.role, META.roles)}</select></div>
        <div class="field"><label>Department</label><select name="department">${sel(u.department, META.departments)}</select></div>
      </div>
      <div class="field"><label>Region code</label><input name="regionCode" value="${esc(u.regionCode)}" /></div>
      <div class="field"><label>Reports to</label><select name="reportsTo">${mgr}</select></div>
      <div class="err-tile" id="ue" style="display:none"></div>
      <div class="dialog-actions">
        <button type="button" class="btn text" id="x">Cancel</button>
        <button class="btn" type="submit">Save</button>
      </div>
    </form>`);
  $("#x").addEventListener("click", closeDialog);
  $("#uf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api("/users/" + u.id, "PATCH", {
        role: f.get("role"),
        department: f.get("department"),
        regionCode: f.get("regionCode"),
        reportsTo: f.get("reportsTo") || null,
      });
      closeDialog();
      snack("User updated");
      viewOrg();
    } catch (err) {
      const el = $("#ue");
      el.style.display = "block";
      el.textContent = err.message;
    }
  });
}

function newUserModal() {
  const sel = (list, def) => list.map((x) => `<option ${x === def ? "selected" : ""}>${x}</option>`).join("");
  dialog(`<h2>New user</h2>
    <form id="nf">
      <div class="field"><label>Name</label><input name="name" required /></div>
      <div class="field"><label>Email</label><input name="email" type="email" required /></div>
      <div class="field"><label>Password</label><input name="password" required /></div>
      <div class="grid2">
        <div class="field"><label>Role</label><select name="role">${sel(META.roles, "OPERATOR")}</select></div>
        <div class="field"><label>Department</label><select name="department">${sel(META.departments)}</select></div>
      </div>
      <div class="field"><label>Region code</label><input name="regionCode" value="KA" /></div>
      <div class="err-tile" id="ne" style="display:none"></div>
      <div class="dialog-actions">
        <button type="button" class="btn text" id="x">Cancel</button>
        <button class="btn" type="submit">Create user</button>
      </div>
    </form>`);
  $("#x").addEventListener("click", closeDialog);
  $("#nf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api("/users", "POST", Object.fromEntries(f));
      closeDialog();
      snack("User created");
      viewOrg();
    } catch (err) {
      const el = $("#ne");
      el.style.display = "block";
      el.textContent = err.message;
    }
  });
}

boot();
