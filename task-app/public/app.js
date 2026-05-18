// Eagle Tasks — standalone SPA (vanilla, no build step)
const app = document.getElementById("app");
const modalRoot = document.getElementById("modal-root");

let ME = null;
let META = { roles: [], departments: [] };

// ── API helper ────────────────────────────────────────────────────
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
const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");
const badge = (t) =>
  `<span class="badge b-${esc(t.overdue && !["COMPLETED", "CANCELLED"].includes(t.status) ? "overdue" : t.status)}">${
    t.overdue && !["COMPLETED", "CANCELLED"].includes(t.status) ? "OVERDUE" : esc(t.status.replace(/_/g, " "))
  }</span>`;

function modal(html) {
  modalRoot.innerHTML = `<div class="modal-bg"><div class="modal">${html}</div></div>`;
  modalRoot.querySelector(".modal-bg").addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-bg")) closeModal();
  });
}
const closeModal = () => (modalRoot.innerHTML = "");

// ── Auth ──────────────────────────────────────────────────────────
async function boot() {
  try {
    META = await api("/meta");
    ME = await api("/me");
    route();
  } catch {
    renderLogin();
  }
}

function renderLogin() {
  app.innerHTML = `
    <div class="center"><div class="card login">
      <h1>Eagle Tasks</h1>
      <p class="sub">Internal task assignment</p>
      <form id="lf">
        <label>Email</label><input name="email" value="admin@eaglestone.in" />
        <label>Password</label><input name="password" type="password" value="password123" />
        <div style="margin-top:14px"><button style="width:100%">Sign in</button></div>
        <div class="err" id="le"></div>
      </form>
      <p class="muted" style="margin-top:12px">Demo: admin@ / manager@ / supervisor@ / warehouse@ / accounts@ / dispatch@ eaglestone.in · password123</p>
    </div></div>`;
  document.getElementById("lf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      ME = await api("/login", "POST", {
        email: f.get("email"),
        password: f.get("password"),
      });
      META = await api("/meta");
      location.hash = "#/tasks";
      route();
    } catch (err) {
      document.getElementById("le").textContent = err.message;
    }
  });
}

async function logout() {
  await api("/logout", "POST");
  ME = null;
  location.hash = "";
  renderLogin();
}

// ── Shell ─────────────────────────────────────────────────────────
function shell(active, inner) {
  const isAdmin = ME.role === "ADMIN";
  const canTpl = ["ADMIN", "MANAGER", "SUPERVISOR"].includes(ME.role);
  const link = (h, label) =>
    `<a href="#/${h}" class="${active === h ? "active" : ""}">${label}</a>`;
  app.innerHTML = `
    <div class="topbar">
      <span class="brand">EAGLE&nbsp;TASKS</span>
      <nav>
        ${link("tasks", "Tasks")}
        ${link("leaderboard", "Leaderboard")}
        ${canTpl ? link("templates", "Templates") : ""}
        ${isAdmin ? link("org", "Org") : ""}
        ${link("stats", "My Stats")}
      </nav>
      <span class="who">${esc(ME.name)} · ${esc(ME.role)} · ${esc(ME.regionCode)}</span>
      <button class="ghost sm" id="lo">Logout</button>
    </div>
    <div class="wrap" id="view">${inner}</div>`;
  document.getElementById("lo").addEventListener("click", logout);
}

// ── Router ────────────────────────────────────────────────────────
function route() {
  if (!ME) return renderLogin();
  const h = location.hash.replace(/^#\//, "") || "tasks";
  const [page, arg] = h.split("/");
  if (page === "tasks") return viewTasks();
  if (page === "task") return viewTask(arg);
  if (page === "leaderboard") return viewLeaderboard();
  if (page === "templates") return viewTemplates();
  if (page === "org") return viewOrg();
  if (page === "stats") return viewStats();
  viewTasks();
}
window.addEventListener("hashchange", route);

// ── Tasks list ────────────────────────────────────────────────────
let taskFilter = { tab: "mine", status: "", priority: "", search: "" };

async function viewTasks() {
  shell("tasks", `<div class="spin">Loading…</div>`);
  const canCreate = ["ADMIN", "MANAGER", "SUPERVISOR"].includes(ME.role);
  const qp = new URLSearchParams();
  if (taskFilter.tab === "mine") qp.set("mine", "true");
  if (taskFilter.tab === "created") qp.set("assignedById", ME.id);
  if (taskFilter.status) qp.set("status", taskFilter.status);
  if (taskFilter.priority) qp.set("priority", taskFilter.priority);
  if (taskFilter.search) qp.set("search", taskFilter.search);
  let tasks = await api("/tasks?" + qp.toString());
  if (taskFilter.tab === "created")
    tasks = tasks.filter((t) => t.assignedById === ME.id);

  const rows = tasks
    .map(
      (t) => `<tr class="clickable" data-id="${t.id}">
        <td><b>${esc(t.title)}</b>${t.templateId ? ' <span class="pill">template</span>' : ""}</td>
        <td>${esc(t.assignedToName || "")}<div class="muted">${esc(t.assignedToDepartment || "")}</div></td>
        <td>${esc(t.assignedByName || "")}</td>
        <td>${fmt(t.deadline)}</td>
        <td><span class="pill">${esc(t.priority)}</span></td>
        <td>${badge(t)}</td></tr>`
    )
    .join("");

  shell(
    "tasks",
    `<div class="row between">
       <div><h1>Tasks</h1><p class="sub">${tasks.length} visible</p></div>
       ${canCreate ? `<div class="row"><button id="newT">+ New task</button><button class="ghost" id="fromT">From template</button></div>` : ""}
     </div>
     <div class="card row">
       <div class="row">
         ${["mine", "created", "all"]
           .map(
             (tb) =>
               `<button class="sm ${taskFilter.tab === tb ? "" : "ghost"}" data-tab="${tb}">${
                 { mine: "Assigned to me", created: "Created by me", all: "All visible" }[tb]
               }</button>`
           )
           .join("")}
       </div>
       <input id="srch" placeholder="Search title…" style="max-width:200px" value="${esc(taskFilter.search)}" />
       <select id="fst" style="max-width:170px">
         <option value="">Any status</option>
         ${["PENDING", "IN_PROGRESS", "FORWARDED", "BLOCKED_BY_SUBTASKS", "COMPLETED", "CANCELLED"]
           .map((s) => `<option ${taskFilter.status === s ? "selected" : ""}>${s}</option>`)
           .join("")}
       </select>
       <select id="fpr" style="max-width:140px">
         <option value="">Any priority</option>
         ${["LOW", "MEDIUM", "HIGH", "URGENT"]
           .map((p) => `<option ${taskFilter.priority === p ? "selected" : ""}>${p}</option>`)
           .join("")}
       </select>
     </div>
     <div class="card"><table>
       <tr><th>Title</th><th>Assignee</th><th>Assigner</th><th>Deadline</th><th>Priority</th><th>Status</th></tr>
       ${rows || `<tr><td colspan="6" class="muted">No tasks.</td></tr>`}
     </table></div>`
  );

  document.querySelectorAll("[data-tab]").forEach((b) =>
    b.addEventListener("click", () => {
      taskFilter.tab = b.dataset.tab;
      viewTasks();
    })
  );
  document.querySelectorAll("tr[data-id]").forEach((r) =>
    r.addEventListener("click", () => (location.hash = "#/task/" + r.dataset.id))
  );
  document.getElementById("fst").addEventListener("change", (e) => {
    taskFilter.status = e.target.value;
    viewTasks();
  });
  document.getElementById("fpr").addEventListener("change", (e) => {
    taskFilter.priority = e.target.value;
    viewTasks();
  });
  let deb;
  document.getElementById("srch").addEventListener("input", (e) => {
    clearTimeout(deb);
    deb = setTimeout(() => {
      taskFilter.search = e.target.value;
      viewTasks();
    }, 350);
  });
  if (canCreate) {
    document.getElementById("newT").addEventListener("click", createTaskModal);
    document.getElementById("fromT").addEventListener("click", instantiateModal);
  }
}

async function userOptions(selectedId) {
  const users = await api("/users?assignableOnly=true");
  return users
    .map(
      (u) =>
        `<option value="${u.id}" ${u.id === selectedId ? "selected" : ""}>${esc(
          u.name
        )} — ${esc(u.role)}/${esc(u.department)} (${esc(u.regionCode)})</option>`
    )
    .join("");
}

async function createTaskModal() {
  const opts = await userOptions();
  modal(`<h2>New task</h2><form id="ct">
    <label>Title</label><input name="title" required />
    <label>Description</label><textarea name="description" rows="3"></textarea>
    <label>Assign to</label><select name="assignedToId" required>${opts}</select>
    <div class="grid2">
      <div><label>Deadline</label><input name="deadline" type="datetime-local" required /></div>
      <div><label>Priority</label><select name="priority">
        ${["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => `<option ${p === "MEDIUM" ? "selected" : ""}>${p}</option>`).join("")}
      </select></div>
    </div>
    <div class="row between" style="margin-top:16px">
      <button type="button" class="ghost" id="cx">Cancel</button>
      <button>Create</button>
    </div><div class="err" id="ce"></div>
  </form>`);
  document.getElementById("cx").addEventListener("click", closeModal);
  document.getElementById("ct").addEventListener("submit", async (e) => {
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
      closeModal();
      viewTasks();
    } catch (err) {
      document.getElementById("ce").textContent = err.message;
    }
  });
}

// ── Task detail + chain ───────────────────────────────────────────
async function viewTask(id) {
  shell("tasks", `<div class="spin">Loading…</div>`);
  let data;
  try {
    data = await api("/tasks/" + id);
  } catch (err) {
    return shell("tasks", `<div class="card">${esc(err.message)} <a href="#/tasks">Back</a></div>`);
  }
  const t = data.task;
  const mine = t.assignedToId === ME.id;
  const leaf = t.decomposition === "NONE";
  const open = !["COMPLETED", "CANCELLED"].includes(t.status);
  const rootId = t.rootTaskId || t.id;

  const chainHtml = data.chain
    .map((c) => {
      const depth = c.id === rootId ? 0 : c.parentTaskId === rootId ? 1 : 2;
      return `<li class="depth${depth}">
        <div class="row between">
          <div><b>${esc(c.title)}</b> ${badge(c)}
            <div class="muted">${esc(c.assignedToName || "")} · ${esc(c.assignedToDepartment || "")} · due ${fmt(c.deadline)}</div>
          </div>
          ${c.id !== t.id ? `<a class="pill" href="#/task/${c.id}">open</a>` : ""}
        </div></li>`;
    })
    .join("");

  const actions = [];
  if (mine && open && leaf && t.status === "PENDING")
    actions.push(`<button class="sm" id="start">Mark in progress</button>`);
  if (mine && open && leaf)
    actions.push(`<button class="sm" id="fwd">Forward</button>`);
  if (mine && open && leaf)
    actions.push(`<button class="sm" id="split">Split into subtasks</button>`);
  if (mine && open && leaf)
    actions.push(`<button class="sm" id="done">Mark complete</button>`);
  if ((ME.role === "ADMIN" || t.assignedById === ME.id) && open)
    actions.push(`<button class="sm danger" id="cancel">Cancel chain</button>`);

  shell(
    "tasks",
    `<a href="#/tasks">← Tasks</a>
     <div class="card">
       <div class="row between">
         <div><h1>${esc(t.title)}</h1>
           <p class="sub">${badge(t)} · <span class="pill">${esc(t.priority)}</span> · due ${fmt(t.deadline)}</p>
         </div>
       </div>
       <p>${esc(t.description || "No description.")}</p>
       <div class="muted" style="margin-top:8px">Assigned by ${esc(t.assignedByName)} → ${esc(t.assignedToName)}</div>
       <div class="row" style="margin-top:14px">${actions.join("") || '<span class="muted">No actions available to you.</span>'}</div>
       <div class="err" id="te"></div>
     </div>
     <div class="card"><h2 style="font-size:16px;margin-bottom:10px">Chain</h2>
       <ul class="timeline">${chainHtml}</ul>
       ${ME.role === "ADMIN" || ME.role === "MANAGER" ? "" : '<p class="muted">You see your task, what you delegated, and one level up. Senior roles see the full chain.</p>'}
     </div>`
  );

  const act = async (fn) => {
    try {
      await fn();
      viewTask(id);
    } catch (err) {
      document.getElementById("te").textContent =
        err.message + (err.details ? " " + JSON.stringify(err.details) : "");
    }
  };
  document.getElementById("start")?.addEventListener("click", () =>
    act(() => api("/tasks/" + id, "PATCH", { status: "IN_PROGRESS" }))
  );
  document.getElementById("done")?.addEventListener("click", () =>
    act(() => api("/tasks/" + id + "/complete", "POST"))
  );
  document.getElementById("cancel")?.addEventListener("click", () => {
    if (confirm("Cancel this task and all its subtasks?"))
      act(() => api("/tasks/" + id + "/cancel", "POST"));
  });
  document.getElementById("fwd")?.addEventListener("click", () => forwardModal(id, t));
  document.getElementById("split")?.addEventListener("click", () => splitModal(id, t));
}

async function forwardModal(id, t) {
  const opts = await userOptions();
  modal(`<h2>Forward task</h2><form id="ff">
    <label>Forward to</label><select name="assignedToId" required>${opts}</select>
    <label>New deadline (≤ ${fmt(t.deadline)})</label>
    <input name="deadline" type="datetime-local" />
    <label>Note (optional)</label><textarea name="note" rows="2"></textarea>
    <div class="row between" style="margin-top:14px">
      <button type="button" class="ghost" id="x">Cancel</button><button>Forward</button>
    </div><div class="err" id="e"></div></form>`);
  document.getElementById("x").addEventListener("click", closeModal);
  document.getElementById("ff").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api("/tasks/" + id + "/forward", "POST", {
        assignedToId: f.get("assignedToId"),
        deadline: f.get("deadline") ? new Date(f.get("deadline")).toISOString() : undefined,
        note: f.get("note") || undefined,
      });
      closeModal();
      viewTask(id);
    } catch (err) {
      document.getElementById("e").textContent = err.message;
    }
  });
}

async function splitModal(id, t) {
  const users = await api("/users?assignableOnly=true");
  const opt = users
    .map((u) => `<option value="${u.id}">${esc(u.name)} — ${esc(u.department)}</option>`)
    .join("");
  const rowHtml = () => `<div class="subtask-row">
      <input placeholder="Subtask title" class="st-title" />
      <select class="st-user">${opt}</select>
      <input type="datetime-local" class="st-deadline" />
      <button type="button" class="ghost sm st-del">✕</button></div>`;
  modal(`<h2>Split into subtasks</h2>
    <p class="muted">Parent waits until every subtask is done. Deadlines must be ≤ ${fmt(t.deadline)}.</p>
    <div id="rows">${rowHtml()}${rowHtml()}</div>
    <button type="button" class="ghost sm" id="addRow">+ Add subtask</button>
    <div class="row between" style="margin-top:14px">
      <button class="ghost" id="x">Cancel</button><button id="go">Create subtasks</button>
    </div><div class="err" id="e"></div>`);
  const bind = () =>
    document.querySelectorAll(".st-del").forEach((b) =>
      b.addEventListener("click", () => {
        if (document.querySelectorAll(".subtask-row").length > 2) b.parentElement.remove();
      })
    );
  bind();
  document.getElementById("addRow").addEventListener("click", () => {
    document.getElementById("rows").insertAdjacentHTML("beforeend", rowHtml());
    bind();
  });
  document.getElementById("x").addEventListener("click", closeModal);
  document.getElementById("go").addEventListener("click", async () => {
    const subtasks = [...document.querySelectorAll(".subtask-row")].map((r) => ({
      title: r.querySelector(".st-title").value,
      assignedToId: r.querySelector(".st-user").value,
      deadline: r.querySelector(".st-deadline").value
        ? new Date(r.querySelector(".st-deadline").value).toISOString()
        : null,
    }));
    try {
      await api("/tasks/" + id + "/split", "POST", { subtasks });
      closeModal();
      viewTask(id);
    } catch (err) {
      document.getElementById("e").textContent = err.message;
    }
  });
}

// ── Leaderboard ───────────────────────────────────────────────────
async function viewLeaderboard() {
  shell("leaderboard", `<div class="spin">Loading…</div>`);
  const board = await api("/tasks/leaderboard");
  const me = await api("/tasks/me/stats");
  const rows = board
    .map(
      (r, i) => `<tr><td>#${i + 1}</td><td><b>${esc(r.name)}</b></td>
      <td>${esc(r.role)}</td><td>${esc(r.department)}</td><td>${esc(r.regionCode)}</td>
      <td><b>${r.totalPoints}</b></td><td>🔥 ${r.currentStreak}</td><td>${r.bestStreak}</td>
      <td>${r.badges.map((b) => `<span class="pill">${esc(b)}</span>`).join(" ")}</td></tr>`
    )
    .join("");
  shell(
    "leaderboard",
    `<h1>Leaderboard</h1>
     <div class="card"><div class="row">
       <div class="stat"><b>${me.totalPoints}</b><span>Your points</span></div>
       <div class="stat"><b>${me.currentStreak}</b><span>Streak</span></div>
       <div class="stat"><b>${me.bestStreak}</b><span>Best</span></div>
       <div class="stat"><b>${me.openTasks}</b><span>Open</span></div>
       <div class="stat"><b>${me.overdueTasks}</b><span>Overdue</span></div>
     </div></div>
     <div class="card"><table>
       <tr><th>#</th><th>Name</th><th>Role</th><th>Dept</th><th>Region</th><th>Points</th><th>Streak</th><th>Best</th><th>Badges</th></tr>
       ${rows || `<tr><td colspan="9" class="muted">No data yet.</td></tr>`}
     </table></div>`
  );
}

async function viewStats() {
  shell("stats", `<div class="spin">Loading…</div>`);
  const s = await api("/tasks/me/stats");
  shell(
    "stats",
    `<h1>My Stats</h1>
     <div class="card"><div class="row">
       <div class="stat"><b>${s.totalPoints}</b><span>Points</span></div>
       <div class="stat"><b>${s.currentStreak}</b><span>Current streak</span></div>
       <div class="stat"><b>${s.bestStreak}</b><span>Best streak</span></div>
       <div class="stat"><b>${s.tasksCompletedOnTime}</b><span>On time</span></div>
       <div class="stat"><b>${s.tasksCompletedLate}</b><span>Late</span></div>
     </div>
     <div style="margin-top:14px">${
       s.badges.length
         ? s.badges.map((b) => `<span class="pill">${esc(b)}</span>`).join(" ")
         : '<span class="muted">No badges yet — complete tasks on time to earn them.</span>'
     }</div></div>
     <div class="card row">
       <div class="stat"><b>${s.openTasks}</b><span>Open tasks</span></div>
       <div class="stat"><b>${s.overdueTasks}</b><span>Overdue</span></div>
     </div>`
  );
}

// ── Templates ─────────────────────────────────────────────────────
async function viewTemplates() {
  shell("templates", `<div class="spin">Loading…</div>`);
  const tpls = await api("/templates");
  const isAdmin = ME.role === "ADMIN";
  const rows = tpls
    .map(
      (t) => `<tr><td><b>${esc(t.name)}</b><div class="muted">${esc(t.description || "")}</div></td>
      <td>${t.steps.length} steps</td><td><span class="pill">${esc(t.defaultPriority)}</span></td>
      <td>${t.defaultDeadlineHours}h</td>
      <td><button class="sm ghost" data-prev="${t.id}">Preview</button>
      ${["ADMIN", "MANAGER", "SUPERVISOR"].includes(ME.role) ? `<button class="sm" data-inst="${t.id}">Use</button>` : ""}
      ${isAdmin ? `<button class="sm ghost" data-edit="${t.id}">Edit</button>` : ""}</td></tr>`
    )
    .join("");
  shell(
    "templates",
    `<div class="row between"><div><h1>Templates</h1><p class="sub">Auto-assign a chain of subtasks</p></div>
       ${isAdmin ? `<button id="newTpl">+ New template</button>` : ""}</div>
     <div class="card"><table>
       <tr><th>Name</th><th>Steps</th><th>Priority</th><th>Deadline</th><th></th></tr>
       ${rows || `<tr><td colspan="5" class="muted">No templates.</td></tr>`}
     </table></div>`
  );
  document.querySelectorAll("[data-inst]").forEach((b) =>
    b.addEventListener("click", () => instantiateModal(b.dataset.inst))
  );
  document.querySelectorAll("[data-prev]").forEach((b) =>
    b.addEventListener("click", () => previewModal(b.dataset.prev))
  );
  document.querySelectorAll("[data-edit]").forEach((b) =>
    b.addEventListener("click", () => templateEditor(b.dataset.edit))
  );
  document.getElementById("newTpl")?.addEventListener("click", () => templateEditor());
}

async function previewModal(id) {
  const region = prompt("Preview for region code:", ME.regionCode);
  if (!region) return;
  const r = await api("/templates/" + id + "/preview", "POST", { regionCode: region });
  modal(`<h2>Resolution preview · ${esc(region)}</h2>
    <table><tr><th>Step</th><th>Criteria</th><th>Resolves to</th></tr>
    ${r
      .map(
        (s) =>
          `<tr><td>${esc(s.title)}</td><td class="muted">${esc(s.criteria)}</td>
       <td>${s.resolvedUser ? esc(s.resolvedUser.name) : `<span class="err">${esc(s.reason)}</span>`}</td></tr>`
      )
      .join("")}</table>
    <div class="row between" style="margin-top:14px"><span></span><button id="x">Close</button></div>`);
  document.getElementById("x").addEventListener("click", closeModal);
}

async function instantiateModal(id) {
  const tpls = await api("/templates");
  const opts = tpls
    .map((t) => `<option value="${t.id}" ${t.id === id ? "selected" : ""}>${esc(t.name)}</option>`)
    .join("");
  modal(`<h2>Start from template</h2><form id="inf">
    <label>Template</label><select name="tpl">${opts}</select>
    <label>Region code</label><input name="region" value="${esc(ME.regionCode)}" />
    <label>Deadline (hours from now, blank = template default)</label><input name="hours" type="number" />
    <div class="row between" style="margin-top:14px">
      <button type="button" class="ghost" id="x">Cancel</button>
      <button type="button" class="ghost" id="pv">Preview</button>
      <button>Create</button></div>
    <div id="pvout" class="muted" style="margin-top:8px"></div>
    <div class="err" id="e"></div></form>`);
  document.getElementById("x").addEventListener("click", closeModal);
  document.getElementById("pv").addEventListener("click", async () => {
    const tpl = document.querySelector("[name=tpl]").value;
    const region = document.querySelector("[name=region]").value;
    const r = await api("/templates/" + tpl + "/preview", "POST", { regionCode: region });
    document.getElementById("pvout").innerHTML = r
      .map(
        (s) =>
          `${esc(s.title)} → ${s.resolvedUser ? esc(s.resolvedUser.name) : "⚠ " + esc(s.reason)}`
      )
      .join("<br>");
  });
  document.getElementById("inf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const r = await api(
        "/templates/" + f.get("tpl") + "/instantiate",
        "POST",
        {
          regionCode: f.get("region"),
          deadlineHours: f.get("hours") ? Number(f.get("hours")) : undefined,
        }
      );
      closeModal();
      location.hash = "#/task/" + r.rootTaskId;
    } catch (err) {
      document.getElementById("e").textContent =
        err.message + (err.details ? " — " + JSON.stringify(err.details.unresolved) : "");
    }
  });
}

async function templateEditor(id) {
  const tpl = id ? await api("/templates/" + id) : null;
  const deptOpts = (sel) =>
    `<option value="">—</option>` +
    META.departments
      .map((d) => `<option ${sel === d ? "selected" : ""}>${d}</option>`)
      .join("");
  const roleOpts = (sel) =>
    `<option value="">—</option>` +
    META.roles.map((r) => `<option ${sel === r ? "selected" : ""}>${r}</option>`).join("");
  const stepRow = (s = {}) => `<div class="card step">
      <input class="s-title" placeholder="Step title" value="${esc(s.title || "")}" />
      <div class="grid2" style="margin-top:6px">
        <div><label>By role</label><select class="s-role">${roleOpts(s.assigneeRole)}</select></div>
        <div><label>By department</label><select class="s-dept">${deptOpts(s.assigneeDepartment)}</select></div>
      </div>
      <div class="grid2">
        <div><label>Priority</label><select class="s-pri">${["LOW", "MEDIUM", "HIGH", "URGENT"]
          .map((p) => `<option ${(s.priority || "MEDIUM") === p ? "selected" : ""}>${p}</option>`)
          .join("")}</select></div>
        <div><label>Deadline offset hrs (vs root)</label><input class="s-off" type="number" value="${
          s.deadlineOffsetHours ?? 0
        }" /></div>
      </div>
      <button type="button" class="ghost sm s-del" style="margin-top:6px">Remove step</button>
    </div>`;
  modal(`<h2>${id ? "Edit" : "New"} template</h2><form id="tf">
    <label>Name</label><input name="name" value="${esc(tpl?.name || "")}" required />
    <label>Description</label><textarea name="description" rows="2">${esc(tpl?.description || "")}</textarea>
    <div class="grid2">
      <div><label>Default priority</label><select name="dp">${["LOW", "MEDIUM", "HIGH", "URGENT"]
        .map((p) => `<option ${(tpl?.defaultPriority || "MEDIUM") === p ? "selected" : ""}>${p}</option>`)
        .join("")}</select></div>
      <div><label>Default deadline (hrs)</label><input name="dh" type="number" value="${
        tpl?.defaultDeadlineHours ?? 48
      }" /></div>
    </div>
    <h2 style="font-size:15px;margin-top:14px">Steps</h2>
    <div id="steps">${(tpl?.steps?.length ? tpl.steps : [{}, {}]).map(stepRow).join("")}</div>
    <button type="button" class="ghost sm" id="addStep">+ Add step</button>
    <div class="row between" style="margin-top:14px">
      <button type="button" class="ghost" id="x">Cancel</button>
      ${id ? `<button type="button" class="danger" id="del">Deactivate</button>` : ""}
      <button>Save</button></div>
    <div class="err" id="e"></div></form>`);
  const bindDel = () =>
    document.querySelectorAll(".s-del").forEach((b) =>
      b.addEventListener("click", () => b.closest(".step").remove())
    );
  bindDel();
  document.getElementById("addStep").addEventListener("click", () => {
    document.getElementById("steps").insertAdjacentHTML("beforeend", stepRow());
    bindDel();
  });
  document.getElementById("x").addEventListener("click", closeModal);
  document.getElementById("del")?.addEventListener("click", async () => {
    await api("/templates/" + id, "DELETE");
    closeModal();
    viewTemplates();
  });
  document.getElementById("tf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const steps = [...document.querySelectorAll(".step")].map((s) => ({
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
      closeModal();
      viewTemplates();
    } catch (err) {
      document.getElementById("e").textContent = err.message;
    }
  });
}

// ── Org admin ─────────────────────────────────────────────────────
async function viewOrg() {
  shell("org", `<div class="spin">Loading…</div>`);
  const users = await api("/users?all=true");
  const tree = await api("/users/tree");
  const uOpt = (sel) =>
    `<option value="">— none —</option>` +
    users
      .map((u) => `<option value="${u.id}" ${sel === u.id ? "selected" : ""}>${esc(u.name)}</option>`)
      .join("");
  const rows = users
    .map(
      (u) => `<tr>
      <td><b>${esc(u.name)}</b><div class="muted">${esc(u.email)}</div></td>
      <td><select data-f="role" data-u="${u.id}">${META.roles
        .map((r) => `<option ${u.role === r ? "selected" : ""}>${r}</option>`)
        .join("")}</select></td>
      <td><select data-f="department" data-u="${u.id}">${META.departments
        .map((d) => `<option ${u.department === d ? "selected" : ""}>${d}</option>`)
        .join("")}</select></td>
      <td><input data-f="regionCode" data-u="${u.id}" value="${esc(u.regionCode)}" style="width:70px" /></td>
      <td><select data-f="reportsTo" data-u="${u.id}">${uOpt(u.reportsTo)}</select></td>
      <td><button class="sm" data-save="${u.id}">Save</button></td></tr>`
    )
    .join("");
  const renderTree = (n, d = 0) =>
    `<li class="depth${Math.min(d, 2)}"><b>${esc(n.name)}</b> <span class="pill">${esc(
      n.role
    )}</span> <span class="muted">${esc(n.department)} · ${esc(n.regionCode)}</span>
     ${n.reports?.length ? `<ul class="timeline">${n.reports.map((c) => renderTree(c, d + 1)).join("")}</ul>` : ""}</li>`;
  shell(
    "org",
    `<div class="row between"><div><h1>Org & Users</h1><p class="sub">Manage roles, departments, hierarchy</p></div>
       <button id="newU">+ New user</button></div>
     <div class="card"><table>
       <tr><th>User</th><th>Role</th><th>Dept</th><th>Region</th><th>Reports to</th><th></th></tr>
       ${rows}
     </table></div>
     <div class="card"><h2 style="font-size:16px;margin-bottom:10px">Reporting tree</h2>
       <ul class="timeline">${tree.map((r) => renderTree(r)).join("")}</ul></div>`
  );
  document.querySelectorAll("[data-save]").forEach((b) =>
    b.addEventListener("click", async () => {
      const uid = b.dataset.save;
      const get = (f) =>
        document.querySelector(`[data-f="${f}"][data-u="${uid}"]`).value;
      try {
        await api("/users/" + uid, "PATCH", {
          role: get("role"),
          department: get("department"),
          regionCode: get("regionCode"),
          reportsTo: get("reportsTo") || null,
        });
        viewOrg();
      } catch (err) {
        alert(err.message);
      }
    })
  );
  document.getElementById("newU").addEventListener("click", newUserModal);
}

function newUserModal() {
  modal(`<h2>New user</h2><form id="nf">
    <label>Name</label><input name="name" required />
    <label>Email</label><input name="email" type="email" required />
    <label>Password</label><input name="password" required />
    <div class="grid2">
      <div><label>Role</label><select name="role">${META.roles
        .map((r) => `<option ${r === "OPERATOR" ? "selected" : ""}>${r}</option>`)
        .join("")}</select></div>
      <div><label>Department</label><select name="department">${META.departments
        .map((d) => `<option>${d}</option>`)
        .join("")}</select></div>
    </div>
    <label>Region code</label><input name="regionCode" value="KA" />
    <div class="row between" style="margin-top:14px">
      <button type="button" class="ghost" id="x">Cancel</button><button>Create</button></div>
    <div class="err" id="e"></div></form>`);
  document.getElementById("x").addEventListener("click", closeModal);
  document.getElementById("nf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api("/users", "POST", Object.fromEntries(f));
      closeModal();
      viewOrg();
    } catch (err) {
      document.getElementById("e").textContent = err.message;
    }
  });
}

boot();
