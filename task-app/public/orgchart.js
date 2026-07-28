// Eagle Tasks — org chart editor.
//
// A free-form canvas: people are cards you drag anywhere (a brainstorming
// board), while the reporting lines stay live underneath. Dropping a card
// onto another card re-parents it.
//
// Input is unified on Pointer Events so touch and mouse take the same path;
// the only real difference is how the info card surfaces — a floating
// bubble on hover for PC, a bottom sheet on tap for phones.
//
// Helpers are injected rather than imported so this module never has to
// import app.js back (which would be a cycle).

export function createOrgChart(deps) {
  const { api, esc, icon, dialog, closeDialog, snack, view, getMe, getMeta } = deps;

  // Card size is owned by CSS (it grows on desktop); layout and hit-testing
  // read it back so the two can never drift apart.
  let NODE_W = 176;
  let NODE_H = 84;
  const H_GAP = 32;
  const V_GAP = 96;

  function readNodeSize() {
    const wrap = document.querySelector(".oc-wrap");
    if (!wrap) return;
    const cs = getComputedStyle(wrap);
    const w = parseFloat(cs.getPropertyValue("--oc-node-w"));
    const h = parseFloat(cs.getPropertyValue("--oc-node-h"));
    if (Number.isFinite(w) && w > 0) NODE_W = w;
    if (Number.isFinite(h) && h > 0) NODE_H = h;
  }
  const MIN_ZOOM = 0.3;
  const MAX_ZOOM = 2.5;
  const TAP_SLOP = 8; // px of travel still counted as a tap, not a drag

  const finePointer = () =>
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  let graph = { nodes: [], edges: [], canEdit: false };
  let byId = new Map();
  let pos = new Map(); // id -> {x, y} in world coords
  let pan = { x: 0, y: 0 };
  let zoom = 1;
  let pinnedId = null; // info card kept open by tap/click
  let lastMove = null; // { id, prevManagerId } for undo
  let els = {}; // cached DOM refs
  let nodeEl = new Map();
  let edgeEl = new Map();

  const initials = (name) =>
    String(name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();

  // ── layout ───────────────────────────────────────────────────────
  function childrenMap(nodes) {
    const kids = new Map(nodes.map((n) => [n.id, []]));
    for (const n of nodes)
      if (n.reportsTo && kids.has(n.reportsTo)) kids.get(n.reportsTo).push(n.id);
    for (const list of kids.values())
      list.sort((a, b) =>
        (byId.get(a)?.name || "").localeCompare(byId.get(b)?.name || "")
      );
    return kids;
  }

  /** Tidy tree: leaves take the next column, parents centre over their kids. */
  function tidyLayout(nodes) {
    const kids = childrenMap(nodes);
    const roots = nodes.filter((n) => !n.reportsTo).map((n) => n.id);
    const out = new Map();
    const seen = new Set();
    let column = 0;

    const visit = (id, depth) => {
      if (seen.has(id)) return column * (NODE_W + H_GAP); // defensive: cycles
      seen.add(id);
      const ch = kids.get(id) || [];
      let x;
      if (!ch.length) {
        x = column * (NODE_W + H_GAP);
        column++;
      } else {
        const xs = ch.map((c) => visit(c, depth + 1));
        x = (xs[0] + xs[xs.length - 1]) / 2;
      }
      out.set(id, { x, y: depth * (NODE_H + V_GAP) });
      return x;
    };

    for (const r of roots) {
      visit(r, 0);
      column += 1; // breathing room between separate trees
    }
    // Anyone unreachable from a root (shouldn't happen, but never drop a card)
    for (const n of nodes)
      if (!out.has(n.id)) {
        out.set(n.id, { x: column * (NODE_W + H_GAP), y: 0 });
        column++;
      }
    return out;
  }

  function descendantsOf(id) {
    const kids = childrenMap(graph.nodes);
    const out = new Set();
    const walk = (cur) => {
      for (const c of kids.get(cur) || []) {
        if (out.has(c)) continue;
        out.add(c);
        walk(c);
      }
    };
    walk(id);
    return out;
  }

  // ── data ─────────────────────────────────────────────────────────
  async function load() {
    graph = await api("/org/graph");
    byId = new Map(graph.nodes.map((n) => [n.id, n]));

    const fallback = tidyLayout(graph.nodes);
    const unplaced = [];
    pos = new Map();
    for (const n of graph.nodes) {
      if (Number.isFinite(n.chartX) && Number.isFinite(n.chartY)) {
        pos.set(n.id, { x: n.chartX, y: n.chartY });
      } else {
        const p = fallback.get(n.id) || { x: 0, y: 0 };
        pos.set(n.id, p);
        unplaced.push({ id: n.id, x: p.x, y: p.y });
      }
    }
    // Persist first-time positions so the layout is stable next visit.
    if (unplaced.length && graph.canEdit) {
      try {
        await api("/org/positions", "POST", { positions: unplaced });
      } catch {
        /* non-fatal: the chart still renders, it just won't be sticky yet */
      }
    }
  }

  const savePositions = async (positions) => {
    if (!graph.canEdit) return;
    try {
      await api("/org/positions", "POST", { positions });
    } catch (err) {
      snack(err.message || "Could not save position", true);
    }
  };

  // ── rendering ────────────────────────────────────────────────────
  function nodeHTML(n) {
    const badges = [];
    if (n.directReports)
      badges.push(
        `<span class="oc-badge" title="${n.directReports} direct report(s)">${icon(
          "account_tree"
        )}${n.directReports}</span>`
      );
    if (n.openTasks)
      badges.push(
        `<span class="oc-badge open" title="${n.openTasks} open task(s)">${icon(
          "checklist"
        )}${n.openTasks}</span>`
      );
    return `
      <div class="oc-node" data-id="${esc(n.id)}" tabindex="0"
           role="button" aria-label="${esc(n.name)}, ${esc(n.role)}">
        <span class="oc-accent dept-${esc(n.department)}"></span>
        <span class="oc-avatar">${esc(initials(n.name))}</span>
        <span class="oc-meta">
          <span class="oc-name">${esc(n.name)}</span>
          <span class="oc-role">${esc(n.role)}</span>
          <span class="oc-dept">${esc(n.department)} · ${esc(n.regionCode)}</span>
        </span>
        ${badges.length ? `<span class="oc-badges">${badges.join("")}</span>` : ""}
      </div>`;
  }

  function edgePath(from, to) {
    const p = pos.get(from);
    const c = pos.get(to);
    if (!p || !c) return "";
    const x1 = p.x + NODE_W / 2;
    const y1 = p.y + NODE_H;
    const x2 = c.x + NODE_W / 2;
    const y2 = c.y;
    const mid = y1 + (y2 - y1) / 2;
    return `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`;
  }

  function paintNode(id) {
    const el = nodeEl.get(id);
    const p = pos.get(id);
    if (el && p) el.style.transform = `translate(${p.x}px, ${p.y}px)`;
  }

  function paintEdgesFor(id) {
    for (const [key, el] of edgeEl) {
      const [from, to] = key.split("→");
      if (from === id || to === id) el.setAttribute("d", edgePath(from, to));
    }
  }

  function applyTransform() {
    els.world.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
  }

  function renderCanvas() {
    els.nodes.innerHTML = graph.nodes.map(nodeHTML).join("");
    nodeEl = new Map();
    for (const el of els.nodes.querySelectorAll(".oc-node"))
      nodeEl.set(el.dataset.id, el);
    for (const n of graph.nodes) paintNode(n.id);

    els.edges.innerHTML = graph.edges
      .map(
        (e) =>
          `<path class="oc-edge" data-key="${esc(e.from)}→${esc(e.to)}" d="${edgePath(
            e.from,
            e.to
          )}" />`
      )
      .join("");
    edgeEl = new Map();
    for (const el of els.edges.querySelectorAll(".oc-edge"))
      edgeEl.set(el.dataset.key, el);
  }

  function bounds() {
    if (!pos.size) return { minX: 0, minY: 0, maxX: NODE_W, maxY: NODE_H };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pos.values()) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + NODE_W);
      maxY = Math.max(maxY, p.y + NODE_H);
    }
    return { minX, minY, maxX, maxY };
  }

  function fit(animate = true) {
    const r = els.viewport.getBoundingClientRect();
    const b = bounds();
    const pad = 48;
    // Leave room for the hint strip so the top row isn't tucked under it.
    const topInset = els.hint?.isConnected ? els.hint.offsetHeight + 14 : 0;
    const avail = Math.max(120, r.height - topInset);
    const w = b.maxX - b.minX + pad * 2;
    const h = b.maxY - b.minY + pad * 2;
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(r.width / w, avail / h, 1.1)));
    pan.x = (r.width - (b.maxX - b.minX) * zoom) / 2 - b.minX * zoom;
    pan.y = topInset + (avail - (b.maxY - b.minY) * zoom) / 2 - b.minY * zoom;
    els.world.style.transition = animate ? "transform .28s ease" : "none";
    applyTransform();
    if (animate) setTimeout(() => (els.world.style.transition = "none"), 300);
  }

  function centerOn(id, scale) {
    const p = pos.get(id);
    if (!p) return;
    const r = els.viewport.getBoundingClientRect();
    if (scale) zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale));
    pan.x = r.width / 2 - (p.x + NODE_W / 2) * zoom;
    pan.y = r.height / 2 - (p.y + NODE_H / 2) * zoom;
    els.world.style.transition = "transform .28s ease";
    applyTransform();
    setTimeout(() => (els.world.style.transition = "none"), 300);
  }

  const zoomBy = (factor, cx, cy) => {
    const r = els.viewport.getBoundingClientRect();
    const px = cx ?? r.width / 2;
    const py = cy ?? r.height / 2;
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));
    // keep the point under the cursor fixed while scaling
    pan.x = px - ((px - pan.x) / zoom) * next;
    pan.y = py - ((py - pan.y) / zoom) * next;
    zoom = next;
    applyTransform();
  };

  // ── info card (the "floating stick") ─────────────────────────────
  function cardHTML(n) {
    const line = (ic, txt) =>
      txt ? `<div class="oc-info-line">${icon(ic)}<span>${esc(txt)}</span></div>` : "";
    const mgr = n.reportsTo ? byId.get(n.reportsTo) : null;
    const actions = graph.canEdit
      ? `<div class="oc-info-actions">
           <button class="btn tonal sm" data-act="add">${icon("person_add")}Add report</button>
           <button class="btn tonal sm" data-act="edit">${icon("edit")}Edit</button>
           <button class="btn tonal sm" data-act="manager">${icon("supervisor_account")}Manager</button>
           <button class="btn tonal sm danger" data-act="remove">${icon("person_remove")}Remove</button>
         </div>`
      : `<p class="oc-info-note">Read-only — ask an admin to make changes.</p>`;
    return `
      <div class="oc-info-head">
        <span class="oc-avatar lg">${esc(initials(n.name))}</span>
        <div class="oc-info-id">
          <div class="oc-info-name">${esc(n.name)}</div>
          <div class="oc-info-role">${esc(n.role)} · ${esc(n.department)}</div>
        </div>
        <button class="icon-btn" data-act="close" aria-label="Close">${icon("close")}</button>
      </div>
      <div class="oc-info-body">
        ${line("badge", n.regionCode ? `Region ${n.regionCode}` : "")}
        ${line("mail", n.email)}
        ${line("call", n.phone)}
        ${line("supervisor_account", mgr ? `Reports to ${mgr.name}` : "No manager (top of chart)")}
        ${line("account_tree", `${n.directReports} direct report${n.directReports === 1 ? "" : "s"}`)}
        ${line("checklist", `${n.openTasks} open task${n.openTasks === 1 ? "" : "s"}`)}
      </div>
      ${actions}`;
  }

  function positionCard(id) {
    const card = els.card;
    if (finePointer()) {
      // Floating bubble anchored to the node, flipped/clamped to stay visible.
      const el = nodeEl.get(id);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vp = els.viewport.getBoundingClientRect();
      const cw = card.offsetWidth || 280;
      const ch = card.offsetHeight || 220;
      let left = r.right + 12;
      if (left + cw > window.innerWidth - 8) left = r.left - cw - 12;
      if (left < 8) left = Math.max(8, (window.innerWidth - cw) / 2);
      // Keep it inside the canvas: below it lies the bottom nav, which would
      // otherwise cover the action buttons.
      let top = r.top;
      if (top + ch > vp.bottom - 8) top = vp.bottom - ch - 8;
      top = Math.max(vp.top + 8, top);
      card.style.left = `${Math.round(left)}px`;
      card.style.top = `${Math.round(top)}px`;
      card.style.right = "auto";
      card.style.bottom = "auto";
    } else {
      // Phone: a sheet at the bottom, clear of the thumb and the nav bar.
      card.style.left = "8px";
      card.style.right = "8px";
      card.style.top = "auto";
      card.style.bottom = "calc(var(--bottom-nav-h) + 12px)";
    }
  }

  function showInfo(id, { pinned = false } = {}) {
    const n = byId.get(id);
    if (!n) return;
    if (pinned) pinnedId = id;
    els.card.innerHTML = cardHTML(n);
    els.card.classList.remove("hover", "pinned");
    els.card.classList.add("show", pinned ? "pinned" : "hover");
    const asSheet = !finePointer();
    els.card.classList.toggle("sheet", asSheet);
    positionCard(id);
    // On phones the sheet lands right under the FAB; hide it while open.
    const fabEl = document.getElementById("fab");
    if (fabEl && asSheet) fabEl.style.display = "none";
    for (const el of nodeEl.values()) el.classList.remove("selected");
    nodeEl.get(id)?.classList.add("selected");

    els.card.querySelectorAll("[data-act]").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === "close") return hideInfo(true);
        if (act === "add") return addPersonModal({ managerId: id });
        if (act === "edit") return editPersonModal(n);
        if (act === "manager") return managerPickerModal(n);
        if (act === "remove") return removePersonModal(n);
      })
    );
  }

  function hideInfo(force = false) {
    if (pinnedId && !force) return;
    pinnedId = null;
    els.card.classList.remove("show", "pinned", "hover");
    for (const el of nodeEl.values()) el.classList.remove("selected");
    const fabEl = document.getElementById("fab");
    if (fabEl && graph.canEdit) fabEl.style.display = "inline-flex";
  }

  // ── mutations ────────────────────────────────────────────────────
  async function reload({ keepView = true } = {}) {
    const savedPan = { ...pan };
    const savedZoom = zoom;
    await load();
    renderCanvas();
    if (keepView) {
      pan = savedPan;
      zoom = savedZoom;
      applyTransform();
    } else {
      fit(false);
    }
    if (pinnedId && byId.has(pinnedId)) showInfo(pinnedId, { pinned: true });
    else hideInfo(true);
  }

  async function reparent(childId, managerId) {
    const child = byId.get(childId);
    const prev = child?.reportsTo || null;
    if (prev === managerId) return;
    try {
      await api(`/users/${childId}/manager`, "PUT", { managerId });
      lastMove = { id: childId, prevManagerId: prev };
      await reload();
      const mgrName = managerId ? byId.get(managerId)?.name : null;
      snackUndo(
        mgrName
          ? `${child.name} now reports to ${mgrName}`
          : `${child.name} is now top of the chart`
      );
    } catch (err) {
      snack(err.message || "Could not change manager", true);
      await reload();
    }
  }

  function snackUndo(msg) {
    const root = document.getElementById("snackbar");
    root.innerHTML = `<div class="snack"><span>${esc(msg)}</span>
      <button class="snack-action" id="ocUndo">Undo</button></div>`;
    const t = setTimeout(() => (root.innerHTML = ""), 6000);
    document.getElementById("ocUndo")?.addEventListener("click", async () => {
      clearTimeout(t);
      root.innerHTML = "";
      if (!lastMove) return;
      const { id, prevManagerId } = lastMove;
      lastMove = null;
      try {
        await api(`/users/${id}/manager`, "PUT", { managerId: prevManagerId });
        await reload();
        snack("Reverted");
      } catch (err) {
        snack(err.message || "Could not undo", true);
      }
    });
  }

  // ── dialogs ──────────────────────────────────────────────────────
  const optionList = (list, current) =>
    list
      .map((x) => `<option ${x === current ? "selected" : ""}>${esc(x)}</option>`)
      .join("");

  function managerOptions(excludeId, current) {
    const blocked = excludeId ? descendantsOf(excludeId) : new Set();
    return (
      `<option value="">— none (top of chart) —</option>` +
      graph.nodes
        .filter((n) => n.id !== excludeId && !blocked.has(n.id))
        .map(
          (n) =>
            `<option value="${esc(n.id)}" ${current === n.id ? "selected" : ""}>${esc(
              n.name
            )} · ${esc(n.role)}</option>`
        )
        .join("")
    );
  }

  function formError(id, err) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = "block";
    el.textContent = err.message || "Something went wrong";
  }

  function addPersonModal({ managerId = null, at = null } = {}) {
    const META = getMeta();
    const suggested = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    dialog(`<h2>Add person</h2>
      <p class="dialog-sub">They appear on the chart straight away.</p>
      <form id="ocAdd">
        <div class="field"><label>Full name</label><input name="name" required autocomplete="off" /></div>
        <div class="field"><label>Email</label><input name="email" type="email" required autocomplete="off" /></div>
        <div class="grid2">
          <div class="field"><label>Role</label><select name="role">${optionList(META.roles, "OPERATOR")}</select></div>
          <div class="field"><label>Department</label><select name="department">${optionList(META.departments, "PRODUCTION")}</select></div>
        </div>
        <div class="grid2">
          <div class="field"><label>Region</label><input name="regionCode" value="${esc(
            getMe().regionCode || "KA"
          )}" /></div>
          <div class="field"><label>Phone</label><input name="phone" autocomplete="off" /></div>
        </div>
        <div class="field"><label>Reports to</label>
          <select name="reportsTo">${managerOptions(null, managerId)}</select></div>
        <div class="field"><label>Temporary password</label>
          <input name="password" value="${esc(suggested)}" required />
          <span class="hint">Share this with them — they'll sign in with it.</span></div>
        <div class="err-tile" id="ocAddErr" style="display:none"></div>
        <div class="dialog-actions">
          <button type="button" class="btn text" id="ocAddX">Cancel</button>
          <button class="btn" type="submit">Add to chart</button>
        </div>
      </form>`);
    document.getElementById("ocAddX").addEventListener("click", closeDialog);
    document.getElementById("ocAdd").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      // Drop the new card just below its manager, nudged clear of siblings.
      let place = at;
      if (!place && f.reportsTo && pos.has(f.reportsTo)) {
        const p = pos.get(f.reportsTo);
        const sibs = graph.nodes.filter((n) => n.reportsTo === f.reportsTo).length;
        place = { x: p.x + sibs * (NODE_W + H_GAP), y: p.y + NODE_H + V_GAP };
      }
      try {
        await api("/users", "POST", {
          ...f,
          reportsTo: f.reportsTo || null,
          chartX: place?.x,
          chartY: place?.y,
        });
        closeDialog();
        await reload();
        snack("Person added");
      } catch (err) {
        formError("ocAddErr", err);
      }
    });
  }

  function editPersonModal(n) {
    const META = getMeta();
    dialog(`<h2>Edit ${esc(n.name)}</h2>
      <form id="ocEdit">
        <div class="field"><label>Full name</label><input name="name" value="${esc(n.name)}" required /></div>
        <div class="field"><label>Email</label><input name="email" type="email" value="${esc(n.email)}" required /></div>
        <div class="grid2">
          <div class="field"><label>Role</label><select name="role">${optionList(META.roles, n.role)}</select></div>
          <div class="field"><label>Department</label><select name="department">${optionList(META.departments, n.department)}</select></div>
        </div>
        <div class="grid2">
          <div class="field"><label>Region</label><input name="regionCode" value="${esc(n.regionCode)}" /></div>
          <div class="field"><label>Phone</label><input name="phone" value="${esc(n.phone || "")}" /></div>
        </div>
        <div class="err-tile" id="ocEditErr" style="display:none"></div>
        <div class="dialog-actions">
          <button type="button" class="btn text" id="ocEditX">Cancel</button>
          <button class="btn" type="submit">Save</button>
        </div>
      </form>`);
    document.getElementById("ocEditX").addEventListener("click", closeDialog);
    document.getElementById("ocEdit").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await api(`/users/${n.id}`, "PATCH", Object.fromEntries(new FormData(e.target)));
        closeDialog();
        await reload();
        snack("Saved");
      } catch (err) {
        formError("ocEditErr", err);
      }
    });
  }

  function managerPickerModal(n) {
    dialog(`<h2>Who does ${esc(n.name)} report to?</h2>
      <p class="dialog-sub">Same as dragging their card onto someone.</p>
      <form id="ocMgr">
        <div class="field"><label>Manager</label>
          <select name="managerId">${managerOptions(n.id, n.reportsTo)}</select>
          <span class="hint">Their own reports aren't listed — that would loop.</span></div>
        <div class="err-tile" id="ocMgrErr" style="display:none"></div>
        <div class="dialog-actions">
          <button type="button" class="btn text" id="ocMgrX">Cancel</button>
          <button class="btn" type="submit">Update</button>
        </div>
      </form>`);
    document.getElementById("ocMgrX").addEventListener("click", closeDialog);
    document.getElementById("ocMgr").addEventListener("submit", async (e) => {
      e.preventDefault();
      const managerId = new FormData(e.target).get("managerId") || null;
      closeDialog();
      await reparent(n.id, managerId);
    });
  }

  function removePersonModal(n, force = false) {
    const warn = n.directReports
      ? `<p class="oc-warn">${icon("account_tree")} Their ${n.directReports} direct report${
          n.directReports === 1 ? "" : "s"
        } will move up to ${
          n.reportsTo ? esc(byId.get(n.reportsTo)?.name || "their manager") : "the top of the chart"
        }.</p>`
      : "";
    const forceWarn = force
      ? `<p class="oc-warn danger">${icon("warning")} ${esc(n.name)} still has open tasks. Those tasks stay assigned to them.</p>`
      : "";
    dialog(`<h2>Remove ${esc(n.name)}?</h2>
      <p class="dialog-sub">They're deactivated and taken off the chart. Task history is kept.</p>
      ${warn}${forceWarn}
      <div class="err-tile" id="ocDelErr" style="display:none"></div>
      <div class="dialog-actions">
        <button type="button" class="btn text" id="ocDelX">Cancel</button>
        <button type="button" class="btn danger" id="ocDelGo">${force ? "Remove anyway" : "Remove"}</button>
      </div>`);
    document.getElementById("ocDelX").addEventListener("click", closeDialog);
    document.getElementById("ocDelGo").addEventListener("click", async () => {
      try {
        await api(`/users/${n.id}${force ? "?force=true" : ""}`, "DELETE");
        closeDialog();
        pinnedId = null;
        await reload();
        snack(`${n.name} removed`);
      } catch (err) {
        if (err.status === 409 && err.details?.requiresForce) {
          closeDialog();
          return removePersonModal(n, true);
        }
        formError("ocDelErr", err);
      }
    });
  }

  // ── auto-arrange ─────────────────────────────────────────────────
  async function autoArrange() {
    pos = tidyLayout(graph.nodes);
    for (const n of graph.nodes) paintNode(n.id);
    for (const [key, el] of edgeEl) {
      const [from, to] = key.split("→");
      el.setAttribute("d", edgePath(from, to));
    }
    fit();
    await savePositions(
      graph.nodes.map((n) => ({ id: n.id, x: pos.get(n.id).x, y: pos.get(n.id).y }))
    );
    snack("Chart tidied up");
  }

  // ── input: pan, pinch, drag, tap, hover ──────────────────────────
  function wireInput() {
    const vp = els.viewport;
    const pointers = new Map();
    let mode = null; // 'pan' | 'drag' | 'pinch'
    let dragId = null;
    let dragBlocked = new Set();
    let dropId = null;
    let start = null;
    let pinchStart = null;
    let moved = false;
    let hoverTimer = null;

    const toWorld = (clientX, clientY) => {
      const r = vp.getBoundingClientRect();
      return {
        x: (clientX - r.left - pan.x) / zoom,
        y: (clientY - r.top - pan.y) / zoom,
      };
    };

    const hitNode = (wx, wy, exclude) => {
      // Topmost wins; iterate in reverse render order.
      for (let i = graph.nodes.length - 1; i >= 0; i--) {
        const n = graph.nodes[i];
        if (n.id === exclude) continue;
        const p = pos.get(n.id);
        if (!p) continue;
        if (wx >= p.x && wx <= p.x + NODE_W && wy >= p.y && wy <= p.y + NODE_H)
          return n.id;
      }
      return null;
    };

    vp.addEventListener("pointerdown", (e) => {
      if (e.button === 1 || e.button === 2) return;
      // Presses inside the info card are the card's own; panning the canvas
      // from under it would be wrong.
      if (e.target.closest?.("#ocCard")) return;
      const nodeDiv = e.target.closest?.(".oc-node");
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      vp.setPointerCapture(e.pointerId);
      moved = false;

      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          zoom,
          cx: (a.x + b.x) / 2,
          cy: (a.y + b.y) / 2,
        };
        mode = "pinch";
        dragId = null;
        return;
      }

      if (nodeDiv && graph.canEdit) {
        mode = "drag";
        dragId = nodeDiv.dataset.id;
        dragBlocked = descendantsOf(dragId);
        const p = pos.get(dragId);
        const w = toWorld(e.clientX, e.clientY);
        start = { dx: w.x - p.x, dy: w.y - p.y, x: e.clientX, y: e.clientY, at: Date.now() };
        nodeDiv.classList.add("dragging");
      } else if (nodeDiv) {
        mode = null; // read-only: taps still open the card
        dragId = nodeDiv.dataset.id;
        start = { x: e.clientX, y: e.clientY, at: Date.now() };
      } else {
        mode = "pan";
        start = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y, at: Date.now() };
      }
    });

    vp.addEventListener("pointermove", (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (mode === "pinch" && pointers.size === 2 && pinchStart) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const r = vp.getBoundingClientRect();
        const next = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, pinchStart.zoom * (dist / pinchStart.dist))
        );
        const px = pinchStart.cx - r.left;
        const py = pinchStart.cy - r.top;
        pan.x = px - ((px - pan.x) / zoom) * next;
        pan.y = py - ((py - pan.y) / zoom) * next;
        zoom = next;
        applyTransform();
        moved = true;
        return;
      }

      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) > TAP_SLOP) moved = true;

      if (mode === "drag" && dragId && moved) {
        const w = toWorld(e.clientX, e.clientY);
        pos.set(dragId, { x: w.x - start.dx, y: w.y - start.dy });
        paintNode(dragId);
        paintEdgesFor(dragId);
        hideInfo(true);

        const over = hitNode(w.x, w.y, dragId);
        const valid = over && !dragBlocked.has(over) ? over : null;
        if (valid !== dropId) {
          if (dropId) nodeEl.get(dropId)?.classList.remove("drop-target");
          dropId = valid;
          if (dropId) nodeEl.get(dropId)?.classList.add("drop-target");
        }
      } else if (mode === "pan" && moved) {
        pan.x = start.panX + dx;
        pan.y = start.panY + dy;
        applyTransform();
      }
    });

    const endPointer = async (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStart = null;

      const wasMode = mode;
      const id = dragId;
      const drop = dropId;
      const didMove = moved;

      if (id) nodeEl.get(id)?.classList.remove("dragging");
      if (drop) nodeEl.get(drop)?.classList.remove("drop-target");
      dropId = null;

      if (pointers.size === 0) {
        mode = null;
        dragId = null;
        start = null;
      }

      if (wasMode === "pinch") return;

      // A tap that never travelled: open the info card.
      if (!didMove && id) {
        showInfo(id, { pinned: true });
        return;
      }
      if (!didMove && !id) {
        hideInfo(true); // tap on empty space dismisses
        return;
      }

      if (wasMode === "drag" && id && didMove) {
        if (drop) {
          // Snap back visually; reload will place it properly after re-parenting.
          await reparent(id, drop);
        } else {
          const p = pos.get(id);
          await savePositions([{ id, x: p.x, y: p.y }]);
        }
      }
    };
    vp.addEventListener("pointerup", endPointer);
    vp.addEventListener("pointercancel", endPointer);

    vp.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const r = vp.getBoundingClientRect();
        zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
      },
      { passive: false }
    );

    // PC nicety: hover previews the card without committing to a selection.
    els.nodes.addEventListener("pointerover", (e) => {
      if (!finePointer() || mode === "drag") return;
      const div = e.target.closest?.(".oc-node");
      if (!div || pinnedId) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => showInfo(div.dataset.id), 320);
    });
    els.nodes.addEventListener("pointerout", (e) => {
      if (!finePointer()) return;
      const div = e.target.closest?.(".oc-node");
      const to = e.relatedTarget;
      if (!div) return;
      if (to && (to.closest?.(".oc-node") === div || to.closest?.("#ocCard"))) return;
      clearTimeout(hoverTimer);
      if (!pinnedId) hideInfo();
    });
    els.card.addEventListener("pointerleave", () => {
      if (finePointer() && !pinnedId) hideInfo();
    });

    // Keyboard: focusable cards open their info panel.
    els.nodes.addEventListener("keydown", (e) => {
      const div = e.target.closest?.(".oc-node");
      if (!div) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showInfo(div.dataset.id, { pinned: true });
      }
    });

    window.addEventListener("resize", () => {
      if (pinnedId) positionCard(pinnedId);
    });
  }

  // ── view ─────────────────────────────────────────────────────────
  async function viewOrgChart() {
    const me = getMe();
    view(
      "Org chart",
      `<div class="oc-wrap">
         <div class="oc-toolbar">
           <div class="oc-seg">
             <button class="active">${icon("account_tree")}<span>Chart</span></button>
             <button id="ocToList">${icon("list")}<span>List</span></button>
           </div>
           <div class="oc-tools">
             <button class="icon-btn" id="ocFit" title="Fit to screen">${icon("fit_screen")}</button>
             <button class="icon-btn" id="ocOut" title="Zoom out">${icon("remove")}</button>
             <button class="icon-btn" id="ocIn" title="Zoom in">${icon("add")}</button>
             <button class="btn tonal sm" id="ocTidy" title="Auto-arrange">${icon("auto_awesome_mosaic")}<span>Tidy</span></button>
           </div>
         </div>
         <div class="oc-viewport" id="ocViewport">
           <div class="oc-world" id="ocWorld">
             <svg class="oc-edges" id="ocEdges" width="1" height="1" aria-hidden="true"></svg>
             <div class="oc-nodes" id="ocNodes"></div>
           </div>
           <div class="oc-hint" id="ocHint">
             ${icon("touch_app")}
             <span>${
               finePointer()
                 ? "Hover for details · drag to rearrange · drop onto someone to change their manager"
                 : "Tap for options · drag to move · drop on someone to re-assign"
             }</span>
             <button class="icon-btn sm" id="ocHintX" aria-label="Dismiss">${icon("close")}</button>
           </div>
           <div class="oc-card" id="ocCard" role="dialog" aria-label="Person details"></div>
         </div>
       </div>`,
      {
        nav: "org",
        fab: graph.canEdit || me.role === "ADMIN" ? { label: "Person", onClick: () => addPersonModal({}) } : null,
      }
    );

    els = {
      viewport: document.getElementById("ocViewport"),
      world: document.getElementById("ocWorld"),
      edges: document.getElementById("ocEdges"),
      nodes: document.getElementById("ocNodes"),
      card: document.getElementById("ocCard"),
      hint: document.getElementById("ocHint"),
    };
    readNodeSize();

    document.getElementById("ocToList").addEventListener("click", () => {
      location.hash = "#/people";
    });
    document.getElementById("ocFit").addEventListener("click", () => fit());
    document.getElementById("ocIn").addEventListener("click", () => zoomBy(1.2));
    document.getElementById("ocOut").addEventListener("click", () => zoomBy(1 / 1.2));
    document.getElementById("ocTidy").addEventListener("click", autoArrange);
    document.getElementById("ocHintX").addEventListener("click", () => {
      els.hint.remove();
      try {
        localStorage.setItem("oc-hint", "off");
      } catch {}
    });
    try {
      if (localStorage.getItem("oc-hint") === "off") els.hint.remove();
    } catch {}

    try {
      await load();
    } catch (err) {
      els.nodes.innerHTML = "";
      snack(err.message || "Could not load the org chart", true);
      return;
    }

    renderCanvas();
    wireInput();
    fit(false);

    // The FAB depends on canEdit, which we only know after loading.
    const fab = document.getElementById("fab");
    if (fab && !graph.canEdit) fab.style.display = "none";
  }

  return { viewOrgChart };
}
