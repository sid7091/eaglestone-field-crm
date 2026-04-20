# Eaglestone Field CRM — UI Design Document

**Live app:** https://eaglestone-field-crm.vercel.app
**Stack:** Next.js 16 · React 19 · Tailwind CSS 4 · Mobile-first PWA

Source of truth for every page and UI element in the app. Intended as a brief for a redesign.

---

## Table of Contents
1. [Design System](#1-design-system)
2. [Global Chrome](#2-global-chrome)
3. [Pages](#3-pages)
4. [Reusable Components](#4-reusable-components)
5. [Cross-cutting Patterns](#5-cross-cutting-patterns)
6. [Source File Map](#6-source-file-map)
7. [Redesign Notes](#7-redesign-notes)

---

## 1. Design System

### 1.1 CSS Color Tokens (`src/app/globals.css`)

| Token | Hex | Usage |
|---|---|---|
| `--background` | `#faf8f6` | Warm off-white page bg |
| `--foreground` | `#2c2420` | Dark espresso text |
| `--brand-dark` | `#3C332C` | Sidebar, login gradient |
| `--brand-medium` | `#5C4F43` | Medium brown |
| `--brand-cream` | `#EDE8E0` | Role badges, logo tint |
| `--brand-accent` | `#C4A265` | Muted gold — some CTAs, focus rings |
| PWA theme-color | `#8B6914` | Mobile browser chrome |

### 1.2 Tailwind Palette (actual usage)

- **Amber 500/600** — de-facto primary (most CTAs, active tabs, focus rings, FAB)
- **Stone 50–900** — neutrals (borders, backgrounds, text)
- **Green 600 / 50** — Check-in, success, "Valid" geofence, Add inventory
- **Red 600 / 50** — Check-out, errors, flagged rows
- **Blue 600** — Gang Saw module, "Ready to Check Out"
- **Purple 600** — Epoxy module, Platinum tier
- **Indigo 600** — Polishing module
- **Emerald 500** — New-client visit dot
- **Orange** — Bronze tier, offline pending

Pipeline-specific: NEW blue-400 · CONTACTED cyan-400 · QUALIFIED teal-400 · PROPOSAL_SENT indigo-400 · NEGOTIATION violet-400 · WON green-400 · LOST red-400 · DORMANT stone-400.

### 1.3 Typography Scale

| Use | Classes |
|---|---|
| Page title | `text-2xl font-bold text-stone-900` |
| Page subtitle | `text-sm text-stone-500` |
| Card heading | `text-base`/`text-lg font-semibold text-stone-800` |
| Label | `text-sm font-medium text-stone-700` |
| Uppercase eyebrow | `text-xs font-medium uppercase tracking-wider text-stone-500` |
| Monospace | `font-mono tabular-nums` (phones, GPS, SKUs, timers) |

### 1.4 Shape & Elevation

- **Radius**: `rounded-lg` (inputs, buttons, tags) · `rounded-xl` (cards) · `rounded-2xl` (modals, login) · `rounded-full` (badges, FAB, avatars)
- **Shadow**: `shadow-sm` (cards) → `shadow-lg` (dropdowns, FAB items) → `shadow-xl/2xl` (modals)

### 1.5 Repeated Form Patterns

- **Input shell**: `w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500`
- **Label**: `mb-1 block text-sm font-medium text-stone-700`; required fields end with red `*`
- **Error tile**: `rounded-lg bg-red-50 p-3 text-sm text-red-600`
- **Spinner**: `animate-spin rounded-full border-4 border-amber-500 border-t-transparent h-8 w-8`
- **Empty state**: centered `py-8 text-sm text-stone-500`
- **Back navigation**: `← Back to X` link, `text-stone-500 hover:text-stone-700`

---

## 2. Global Chrome

### 2.1 Sidebar
Desktop: fixed left `w-64 h-screen bg-brand-dark text-white`. Mobile: slide-in drawer with black/50 overlay and X close button. Logo block `h-16` cream-tinted.
**Nav items (only 4 visible)**: Dashboard · Customers · Visits · Field Inventory.
Active: `bg-stone-700/60 text-brand-accent`. Hover: `bg-stone-700/40`.
Footer: "Eaglestone Field CRM v1.0" in `text-stone-500`.

### 2.2 Header
Fixed top `h-16 bg-white z-30`, offset `lg:left-64`.
Left: mobile hamburger + "Welcome back," + user's full name.
Right: role pill (`bg-brand-cream rounded-full`, hidden on mobile) + Logout outline button.

### 2.3 Connectivity Banner (4 mutually-exclusive states)
1. **Offline**: `bg-amber-500 text-white`, pulsing white dot, pending count chip
2. **Syncing**: `bg-blue-500`, spinner
3. **Pending (online)**: `bg-stone-100`, amber "Sync Now" button
4. **Default**: hidden

### 2.4 Floating Action Button (FAB)
Fixed `bottom-6 right-6 z-50`, `h-14 w-14 rounded-full`.
Closed: `bg-amber-500`. Open: `bg-stone-700 rotate-45`. White `+` icon.
When open: full-screen `bg-black/20 backdrop-blur-[2px]` backdrop.
**Three pills** expand upward (staggered 50ms). Each is a white pill `rounded-full pl-4 pr-3 py-2 shadow-lg ring-1 ring-stone-200/60` with label + `h-9 w-9` colored icon circle:
1. **New Client Visit** — `bg-emerald-500` calendar icon → opens PlanVisitModal in new-client mode (Sales Pitch default)
2. **Post Follow Up** — `bg-amber-500` chat icon → PlanVisitModal (Order Follow-up default)
3. **Add Customer** — `bg-blue-500` user-plus icon → `/customers/new`

### 2.5 Plan Visit Modal
Bottom sheet on mobile (`items-end rounded-t-2xl`), centered on desktop (`sm:rounded-2xl max-w-lg max-h-[90vh]`). Backdrop `bg-black/40 backdrop-blur-sm`. Sticky header with title + X close.
- **Existing-customer mode**: debounced search input (spinner while fetching), dropdown list with business name + district/region, green ✓ confirmation line
- **New-client mode**: Customer Name · Phone · Region (30 Indian states select) · District · Address
- **Shared**: Date (min=today), Purpose select (7 options), Notes textarea
- Submit: amber full-width ("Schedule Visit" / "Create Client & Schedule")

---

## 3. Pages

### 3.1 Login (`/login`)
Full-screen centered card on a brand-dark → brand-medium → brand-dark diagonal gradient.
- Logo: 80px tall, cream-tinted via CSS filter
- Form card: `max-w-md rounded-2xl border-stone-600/30 bg-brand-medium/50 p-8 shadow-xl backdrop-blur`
- Subtitle "Sign in to your ERP account" in `text-stone-300`
- Dark inputs: `bg-stone-700/50 border-stone-600 text-white placeholder-stone-400`, amber focus
- Submit: `bg-brand-accent text-brand-dark` full-width ("Sign In" / "Signing in...")
- Demo credentials info box: `bg-stone-700/30 text-xs text-stone-400`

### 3.2 Field Dashboard (`/field-dashboard`)
Container `space-y-6 p-6`. Shows amber spinner while loading; red tile + Retry on error.

**Row 1 — Header**: "Field CRM Dashboard" + "Live KPIs for your region — current calendar month"

**Row 2 — 4 Stat Cards** (grid 1→2→4): each is a white card with label, `text-3xl font-bold` value, subtitle, and colored icon square on the right:
1. Total Customers (amber)
2. Visits This Month (blue) — "X completed · Y flagged"
3. Order Value This Month (green) — formatted INR
4. Geofence Compliance (purple) — "%" + "avg N min per visit"

**Row 3 — Calendar + Upcoming Visits** (2-col on lg):
- **Mini calendar card**: chevron prev/next + month label (`en-IN`); Su Mo Tu We Th Fr Sa header; 7×N day grid. Today = `bg-amber-500 text-white`, selected = `bg-stone-200`, days with visits = `bg-stone-50`. Below each day: stacked dots — emerald (new client) / amber (follow up). Legend below. Selected-date popup: stone-50 tile listing visits (type dot, business name, purpose, StatusBadge).
- **Upcoming Visits card**: "View all" amber link; `max-h-72 divide-y overflow-y-auto` list of buttons. Each row: 40×40 amber-50 date badge (day + MMM), business name, purpose, StatusBadge.

**Row 4 — Lead Pipeline card**: proportional horizontal stacked bar `h-8 rounded-lg` (one colored segment per status) + 2×4 legend grid with color swatch + "count · INR potential".

**Row 5 — Visit Trends + Top Reps** (2-col):
- **Visit Trends**: 7 stacked bars for the last 7 days (amber completed + red flagged top cap). Weekday short labels. Legend below.
- **Top Field Reps**: table with rank badge (gold/silver/bronze/stone colored circle), name, visit count, order value. Empty: "No visit data for this month yet."

**Row 6 — Customers by Tier** (grid 2→4): four tier tiles with bordered backgrounds:
- Platinum: `bg-purple-50 border-purple-200`
- Gold: `bg-amber-50 border-amber-200`
- Silver: `bg-stone-50 border-stone-200`
- Bronze: `bg-orange-50 border-orange-200`
Each shows uppercase label, big count, "% of total" subtitle.

### 3.3 Customers List (`/customers`)
Header: "Customers" + count/subtitle + amber "+ Add Customer" button.
Filter bar: search input + button, Type select, Tier select, Status select.
Card with DataTable:
- Business (name + contact person below)
- Phone (mono)
- Type · Tier (TierBadge: violet/amber/stone/orange) · Status (StatusBadge)
- Region (amber-50 code chip + city)
- Annual Potential (right-aligned INR)
Pagination buttons at the bottom.

### 3.4 New Customer (`/customers/new`)
Four cards in 2-col grid + two full-width cards:
1. **Customer Information**: Name* · Contact Person · Phone* · Alt Phone · Email · GSTIN · PAN
2. **Classification**: Type* · Tier · Lead Status · Notes
3. **Location & Region**: Address (with Google Places-style autocomplete — bottom sheet on mobile, absolute dropdown on desktop) · Region select · District* · City · Pincode
4. **GPS Location**: "Capture Current Location" button (amber-50 bg, amber-200 border, pin icon). Success tile green-50 with coords + accuracy. Manual lat/lng fallback.
5. **Current Requirements** (full-width): input row with Color + Material Type (Granite/Marble/Quartz/Tile/Quartzite/Nano White/Nano Statuario) + Qty sqft + amber "+ Add Requirement" button. Below: table with #, Color, Material, Qty, trash delete.
6. **Site Photos** (full-width): `SitePhotos` grid with camera capture.

Bottom actions: Cancel + amber "Create Customer" (`pb-24` clear for FAB).

### 3.5 Customer Detail (`/customers/[id]`)
Header: back link, business name, StatusBadge + TierBadge + type label.
Right: Edit Customer (brand-accent) → Cancel + Save Changes.

Main grid (2:1 on lg):
- **Business Details** (`lg:col-span-2`): two-column field list, inline inputs in edit mode
- Right stack:
  - **Location** card: GPS coords or "No GPS location set", map placeholder `h-32 bg-stone-100`
  - **Visit Summary** card: Total, Completed (green), Flagged (red)
  - **Site Photos** card

**Recent Visits** (full-width): inline "Plan Visit" (brand-accent) opens PlanVisitModal with customer preselected. Table: Date · Purpose · Status · Duration · Geofence (green Valid / red Invalid).

### 3.6 Visits List (`/visits`)
Header: "Visits" + count + amber "+ Plan Visit" button (opens modal).
**Full calendar card** (same pattern as dashboard — clickable dates, emerald/amber dots, legend, selected-date popup).
Date preset chips (amber when active): Today / This Week / Custom (shows two date inputs).
Status tabs (underline `border-b-2 border-amber-500 text-amber-600`): All · Planned · Completed · Flagged.
Custom table with red-50 tinting for `FLAGGED_FAKE` rows: Date · Customer · Purpose · Status · Duration · Geofence (green check / red X) · Rep.
Pagination.

### 3.7 New Visit (`/visits/new`)
`max-w-2xl`. Back arrow + "Plan a Visit".
Single card "Visit Details":
- Customer autocomplete (debounced search via `/customers?search`), green-700 "✓ Selected" confirmation
- Visit Date · Purpose select · Region select (auto-filled) · Notes · Next Steps · Follow-up Date
- Submit amber "Schedule Visit" + Cancel outline

### 3.8 Visit Check-in (`/visits/checkin`)
Mobile-first `max-w-lg`. State machine: `locate → confirming → checkedin → inprogress → checkout → done`.

Stacked cards:
- **Visit header**: business name + purpose + StatusBadge
- **GPS status**: animated pulsing dot (red unacquired → amber low-accuracy → green ≤50m), coords, amber warning tile if accuracy >50m
- **Geofence result** (after attempt): green-50 or red-50 tile, 40×40 round icon (check / warning), "Geofence Verified" or "Outside Geofence", distance, list of flag strings
- **Timer** (during in-progress): big `text-4xl font-mono` MM:SS
- **Action buttons** by phase:
  - `locate`: green `py-4 text-lg font-bold` "Check In" (disabled without GPS)
  - `confirming`: red-50 warning + amber "Continue Anyway" + outline "Retry Location"
  - `checkedin`: blue-600 "Ready to Check Out"
  - `checkout`: card with Summary textarea, Action Items, Order Value INR, `PhotoCapture`, red-600 "Check Out" + outline Back
  - `done`: green-100 check circle, "Visit Completed!", duration, brand-accent "View Details" + outline "All Visits"
- Map placeholder card `h-40 bg-stone-100`

Offline fallback: queues check-in/out via `addToPendingQueue` + `requestBackgroundSync`.

### 3.9 Visit Detail (`/visits/[id]`)
`max-w-4xl space-y-6`. Header: back arrow + "Visit — {customer}" + StatusBadge; date/purpose/rep line; "Edit Notes" toggle (hidden if cancelled/flagged).

- **Flagged banner** (if `FLAGGED_FAKE`): red-50 with explanation
- **Visit Progress**: horizontal 5-node stepper (Planned → Checked In → In Progress → Checked Out → Completed). Done
 nodes `bg-amber-500 text-white` with check; current `border-amber-500 text-amber-600`; upcoming `border-stone-300 text-stone-400`. Connectors `h-0.5`.
- **Grid (2-col)**:
  - **Visit Information** card (InfoRow list): Customer (amber link) · Contact · Phone (mono) · Date · Purpose · Region chip · Field Rep · Check-in/out timestamps · Duration · Order Value (green) · Follow-up. Orange "Offline Sync" chip if `createdOffline`.
  - **Geofence Validation** card: header with green/red pill (Valid check / Invalid warning). InfoRows for distance (color-coded), radius, check-in/out coords (mono), GPS accuracy, validated timestamp. **GeofenceMap** (Leaflet 1.9.4 via CDN, OSM tiles, 240px): dashed blue circle geofence, customer marker (blue), check-in (green), check-out (orange). Empty: "Map will show once check-in is recorded."
- **Notes & Outcomes** card: Summary · Action Items · Next Steps (view or textarea). Save/Cancel in edit mode. Follow-up date input in edit mode.
- **Photos** card (if any): header with count pill; responsive grid 3→4→5 cols of aspect-square buttons with hover `ring-amber-400`, index badge bottom-right, expand overlay on hover. Lightbox full-screen modal with close + "Open full size" link.

### 3.10 Field Inventory Browse (`/field-inventory`)
Header: "Field Inventory" + grid/list toggle (brand-accent active).
Filter Card: Search · Material select (Italian/Indian/Turkish Marble, Granite, Onyx, Travertine, Quartzite) · Finish (POLISHED/HONED/LEATHER/BRUSHED/FLAMED) · Grade (A–D).

**Grid view** (1→2→3→4 cols): each card has a color band header `h-3` keyed to color name (White/Beige/Grey/Black/Brown/Green/Pink/Red/Blue/Gold/Cream/Multi — Multi = tri-color gradient). Body: variety (bold) + material + grade chip. Dimensions row `text-xs`. Price row: `text-lg font-bold text-brand-accent` + StatusBadge. Footer: Qty available + warehouseCode. Bottom bar: "Reserve for Customer" button.

**List view**: card with table — SKU (mono) · Variety · Material · Color (dot + name) · Finish · Grade · Size · Price/sqft · Qty · Warehouse · Status · Reserve button.

**Reserve Modal**: `max-w-md rounded-xl bg-white p-6`, auto-focused customer search, results list, Cancel.

Pagination at bottom.

### 3.11 Inventory Detail (`/field-inventory/[id]`)
Header: back link, variety title, SKU + StatusBadge + grade chip. Right: big price `text-2xl text-brand-accent` + "Total value".

Grid 2:1:
- **Specifications** (`lg:col-span-2`, 3-col): Material · Variety · Color · Finish · Grade · Length · Width · Thickness · Area · Block Reference · Bundle Number · Region
- Right: **Stock** card (Available green-600 huge, Reserved amber-600, Landed Cost), **Warehouse** card (code, rack, listed-since)

**Reservation** card: if reserved, shows customer + "View Customer". If IN_STOCK, toggles between "Reserve for Customer" and search UI.

**Notes** card (if any): pre-wrap stone-700.

### 3.12 (Legacy) Slab Inventory (`/inventory`)
Header "Slab Inventory" + green-600 "+ Add to Inventory".
4 stat cards: Total · In Stock (green) · Reserved (yellow) · Sold (blue).
Card with full table: Slab # (amber) · Variety · Color · Dimensions · Grade · Finish · Warehouse · Bundle · Location · Status · Date.
**Add Modal**: Slab select · Warehouse ID · Bundle · Rack Location · Cancel + green Add.

### 3.13 Blocks List (`/blocks`)
Header "Raw Blocks" + amber "+ Add Block". Filter: search + status select (Received/In Production/Partially Cut/Fully Cut/Exhausted). DataTable: Block # (amber) · Variety · Color · Origin · Dimensions · Weight · Grade · Slabs count · Cost · Status · Arrival.

### 3.14 New Block (`/blocks/new`)
Two cards in 2-col grid:
- **Block Details**: Type* · Variety* · Color* · Origin* · Grade · Quarry Name
- **Dimensions & Supplier**: 3-col L/W/H · Weight · Supplier* · Arrival Date · Landed Cost · Import Batch No. · Vehicle · Notes

Bottom: Cancel + amber "Save Block".

### 3.15 Block Detail (`/blocks/[id]`)
Header: block # + StatusBadge + subtitle. 3-col grid:
- **Block Information** (10 fields)
- **Dimensions & Cost** (volume m³, weight + tons, landed cost, total slabs amber, notes stone-50 tile)
- **Gang Saw Entries** (entry # + StatusBadge + machine/operator/slabs + timestamp)

**Slabs Table** full-width: Slab # · Dimensions · Thickness · Grade · Finish · Stage · Status.

### 3.16 Machines List (`/machines`)
Header + amber "+ Add Machine". 3 stats: Total / Active (green) / Under Maintenance (yellow).
Grouped by type with colored backgrounds:
- GANG_SAW: `bg-blue-50 border-blue-200`
- EPOXY_LINE: `bg-purple-50 border-purple-200`
- POLISHING_MACHINE: `bg-indigo-50 border-indigo-200`
Each card: name + code · StatusBadge · make/model · location · maintenance dates.

### 3.17 New Machine (`/machines/new`)
`max-w-xl` Card: Name* · Code* · Type* · Manufacturer · Model · Location · Notes. Cancel + amber "Save Machine".

### 3.18 Production Index (`/production`)
Header "Production". **Flow Diagram card**: horizontal 5-stage stepper (Raw Block → Gang Saw → Epoxy/Vacuum → Polishing → Warehouse) with `h-12 w-12 rounded-full` nodes (amber→blue→purple→indigo→green) connected by `h-0.5 w-16 bg-stone-300`.
**Stage cards** (3-col grid): each Link card with colored icon box, "Stage N" eyebrow, name, description.

### 3.19 Gang Saw List (`/production/gang-saw`)
Header + blue "+ New Entry". Table: Entry # (blue-700) · Block · Machine · Operator · Slabs (bold) · Thickness · Wastage · Start Time · Status.

### 3.20 Gang Saw New (`/production/gang-saw/new`)
Two cards:
- **Block & Machine**: Block select (RECEIVED + PARTIALLY_CUT) · Machine (GANG_SAW) · Start/End
- **Cutting Details**: Slab count* · Thickness (default 18) · Blades · Wastage · Power kWh · Status · "Block fully cut" checkbox · Notes

Submit: blue "Save Entry".

### 3.21 Epoxy List (`/production/epoxy`)
Header + purple "+ New Entry". Table: Entry # (purple-700) · Slab · Machine · Operator · Epoxy Type · Mesh · Curing · Start · QC Badge · Status.

### 3.22 Epoxy New (`/production/epoxy/new`)
Two cards:
- **Slab & Machine**: Slab select (EPOXY stage; `text-amber-600` warning if empty) · Machine (EPOXY_LINE) · Start/End
- **Epoxy Details**: Type (Standard/Premium/UV Resistant/Clear/Colored) · Quantity ml · Vacuum Pressure · Curing min · Temperature °C · "Fiber mesh applied" checkbox · Status · Quality Check · Notes

Submit: purple.

### 3.23 Polishing List (`/production/polishing`)
Header + indigo "+ New Entry". Table: Entry # (indigo-700) · Slab · Machine · Operator · Finish · Gloss · Start · QC · Status.

### 3.24 Polishing New (`/production/polishing/new`)
Two cards:
- **Slab & Machine**: Slab select (POLISHING stage) · Machine · Start/End
- **Polishing Details**: Finish Type · Gloss 0–100 · Abrasives · Abrasives Cost · Status · Quality Check · Notes

Submit: indigo.

---

## 4. Reusable Components

| Component | Path | Visual |
|---|---|---|
| `Card` + `CardHeader` + `CardContent` | `src/components/ui/Card.tsx` | White `rounded-xl border border-stone-200 shadow-sm`. Header has bottom border. |
| `DataTable` | `src/components/ui/DataTable.tsx` | Uppercase stone-500 header, `divide-y` rows, hover `bg-stone-50`, optional `onRowClick` |
| `StatusBadge` | `src/components/ui/StatusBadge.tsx` | Pill `rounded-full px-2.5 py-0.5 text-xs font-medium`, color from status enum |
| `StatCard` | `src/components/ui/StatCard.tsx` | White card + big `text-3xl font-bold` value + colored icon square (amber/blue/green/red/purple/indigo 50-bg / 600-text) |
| `ConnectivityBanner` | `src/components/ui/ConnectivityBanner.tsx` | 4-state banner (offline/syncing/pending/hidden) |
| `FloatingActionButton` | `src/components/ui/FloatingActionButton.tsx` | 56px amber FAB with expanding pill menu |
| `PlanVisitModal` | `src/components/ui/PlanVisitModal.tsx` | Responsive bottom-sheet/centered modal with two modes |
| `PhotoCapture` | `src/components/ui/PhotoCapture.tsx` | Dashed-border "Take Photo" (rear camera), uploads to API, horizontal thumb strip with spinner overlay, lightbox |
| `SitePhotos` | `src/components/ui/SitePhotos.tsx` | `h-20 w-20` grid + dashed "Add Photo" tile + per-photo X delete + lightbox (z-200) |
| `GeofenceMap` | `src/components/ui/GeofenceMap.tsx` | Leaflet via CDN, OSM tiles, dashed circle geofence, divIcon pins (blue/green/orange) |
| `TierBadge` (inline) | various | Rounded pill per tier (violet/amber/stone/orange 100-bg) |

---

## 5. Cross-cutting Patterns

- **Button palette**: Primary amber-500 → amber-600 hover. Module-specific: Gang Saw blue-600, Epoxy purple-600, Polishing indigo-600, Add inventory green-600, Check-in green-600, Check-out red-600, Customer Save brand-accent. Outline = `border border-stone-300 bg-white text-stone-700 hover:bg-stone-50`.
- **Offline-aware pages**: Check-in uses `NetworkError` + `addToPendingQueue` + `requestBackgroundSync` on `pending-visits`/`pending-customers` IndexedDB stores.
- **Address autocomplete**: `/api/places/autocomplete` + `/details` (Nominatim/OSM-backed) with auto-fill of city/district/region/pincode/lat/lng.
- **Enums**: 30 Indian states · 6 customer types · 4 tiers · 8 lead statuses · 7 visit purposes · 7 materials · 5 finishes · 4 grades · 3 machine types.

---

## 6. Source File Map

**Layout & root**
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/(dashboard)/layout.tsx`
- `src/app/(dashboard)/page.tsx` (redirects to `/field-dashboard`)
- `src/components/layout/DashboardLayout.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Header.tsx`

**UI components**
- `src/components/ui/Card.tsx`
- `src/components/ui/DataTable.tsx`
- `src/components/ui/StatusBadge.tsx`
- `src/components/ui/StatCard.tsx`
- `src/components/ui/ConnectivityBanner.tsx`
- `src/components/ui/FloatingActionButton.tsx`
- `src/components/ui/PlanVisitModal.tsx`
- `src/components/ui/PhotoCapture.tsx`
- `src/components/ui/SitePhotos.tsx`
- `src/components/ui/GeofenceMap.tsx`

**Pages**
- `src/app/login/page.tsx`
- `src/app/(dashboard)/field-dashboard/page.tsx`
- `src/app/(dashboard)/customers/page.tsx`
- `src/app/(dashboard)/customers/new/page.tsx`
- `src/app/(dashboard)/customers/[id]/page.tsx`
- `src/app/(dashboard)/visits/page.tsx`
- `src/app/(dashboard)/visits/new/page.tsx`
- `src/app/(dashboard)/visits/[id]/page.tsx`
- `src/app/(dashboard)/visits/checkin/page.tsx`
- `src/app/(dashboard)/field-inventory/page.tsx`
- `src/app/(dashboard)/field-inventory/[id]/page.tsx`
- `src/app/(dashboard)/inventory/page.tsx` *(legacy)*
- `src/app/(dashboard)/blocks/page.tsx`
- `src/app/(dashboard)/blocks/new/page.tsx`
- `src/app/(dashboard)/blocks/[id]/page.tsx`
- `src/app/(dashboard)/machines/page.tsx`
- `src/app/(dashboard)/machines/new/page.tsx`
- `src/app/(dashboard)/production/page.tsx`
- `src/app/(dashboard)/production/gang-saw/page.tsx`
- `src/app/(dashboard)/production/gang-saw/new/page.tsx`
- `src/app/(dashboard)/production/epoxy/page.tsx`
- `src/app/(dashboard)/production/epoxy/new/page.tsx`
- `src/app/(dashboard)/production/polishing/page.tsx`
- `src/app/(dashboard)/production/polishing/new/page.tsx`

---

## 7. Redesign Notes

1. **Two navigation layers**: The sidebar exposes only 4 top-level sections (Dashboard, Customers, Visits, Field Inventory). Several routable pages (legacy Slab Inventory, Blocks, Machines, Production Gang Saw/Epoxy/Polishing) are **not linked from the sidebar** — they're factory/ERP pages retained from a prior phase. Decide whether to remove, hide, or surface them.
2. **Mixed color theming**: Dashboard chrome uses the brown/gold brand (`brand-dark/accent/cream`), while most working pages use Tailwind `amber-500` as the de-facto primary. Production submodules each have their own accent (blue/purple/indigo). A redesign should reconcile these into a single system.
3. **Map placeholders**: Two pages still have `bg-stone-100` "Map View (Phase 3.3)" placeholders (Check-in page, Customer Detail location card). Leaflet is already wired up and used on Visit Detail.
4. **Offline-first**: `ConnectivityBanner` + `FloatingActionButton` + `PhotoCapture` queue imply a PWA design goal. Any redesign should preserve offline patterns (pending indicators, sync banner, retry states).
5. **Hand-rolled inputs**: There's no primitives library — ~10 repeated input/select/textarea class strings. Consider introducing a proper design-system layer (`<Input>`, `<Select>`, `<Button variant>`).
6. **Dead props**: `StatCard` defines `trend` and `icon` props that are unused. Either implement or remove.
7. **Mobile-first**: The app is used primarily on phones. Keep touch targets ≥44px, avoid hover-only interactions, and test the FAB + bottom-sheet modals on small viewports.

---

*Generated from source on {{DATE}}. Regenerate after significant UI changes.*
