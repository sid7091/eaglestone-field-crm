# Eaglestone Field CRM — Project Brief

## Project Overview

CRM and ERP system for **Eagle Stone**, an Indian marble/granite processing company. Two main modules:

1. **Field CRM** — Sales reps visit customers, check in with GPS/geofencing, track leads, manage field inventory
2. **Factory ERP** — Track raw blocks through a 3-stage production pipeline (Gang Saw → Epoxy/Vacuum → Polishing) into finished slab inventory

The app is designed for field reps on mobile and managers on desktop. Warm luxury brand aesthetic with brown/tan/olive/cream palette.

## Tech Stack

- **Framework:** Next.js 16.1.6 (App Router, Turbopack)
- **React:** 19.2.3
- **CSS:** Tailwind CSS 4 with `@theme` block in `globals.css`
- **Database:** SQLite via Prisma 7.4 + better-sqlite3 adapter (local dev), Turso (production/Vercel)
- **Auth:** JWT in httpOnly cookies, bcryptjs password hashing
- **Maps:** OpenStreetMap Nominatim (free autocomplete), Google Maps Geocoding API (reverse geocode, optional via `GOOGLE_PLACES_API_KEY`)
- **Offline:** Service worker (`public/sw.js`) + IndexedDB (`src/lib/offline-store.ts`) + background sync (`src/lib/sync-manager.ts`)
- **Testing:** Playwright E2E (239 tests), GitHub Actions CI
- **Deployment:** Vercel with `vercel.json` build config
- **Backend:** Separate Express.js backend at `backend/` (TypeORM + PostgreSQL + Redis/BullMQ) — proxied via Next.js rewrites at `/api/v1/*`. Not required for core Next.js app to run.

## Architecture

```
src/
├── app/
│   ├── (dashboard)/          # All authenticated pages (layout with sidebar+header)
│   │   ├── field-dashboard/  # Main dashboard with KPIs, calendar, pipeline, trends
│   │   ├── customers/        # List, [id] detail, new form
│   │   ├── visits/           # List, [id] detail, new form, checkin flow
│   │   ├── field-inventory/  # Grid/list view, [id] detail with reservation
│   │   ├── blocks/           # Raw blocks list, [id] detail, new form
│   │   ├── machines/         # Machines list, new form
│   │   ├── production/       # Hub + gang-saw/ + epoxy/ + polishing/ (each with list + new)
│   │   └── inventory/        # Factory slab inventory
│   ├── api/                  # Next.js API routes
│   │   ├── auth/             # login, logout, me
│   │   ├── customers/        # CRUD
│   │   ├── visits/           # CRUD + checkin + checkout
│   │   ├── blocks/           # CRUD
│   │   ├── machines/         # CRUD
│   │   ├── production/       # gang-saw, epoxy, polishing
│   │   ├── inventory/        # list + [id] + reserve
│   │   ├── slabs/            # list with stage filtering
│   │   ├── analytics/        # field-summary, pipeline, visit-trends
│   │   ├── places/           # autocomplete, details, reverse-geocode, config
│   │   └── dashboard/        # dashboard summary
│   ├── login/                # Login page
│   └── globals.css           # Tailwind @theme tokens
├── components/
│   ├── layout/               # Sidebar, Header, DashboardLayout
│   └── ui/                   # Card, StatusBadge, DataTable, PlanVisitModal, PhotoCapture, SitePhotos, GeofenceMap, etc.
├── lib/                      # auth.ts, prisma.ts, api-client.ts, utils.ts, offline-store.ts, sync-manager.ts
├── generated/prisma/         # Prisma generated client
└── middleware.ts              # Auth redirect middleware (deprecated — Next.js 16 warns to rename to proxy.ts)
```

## API Response Conventions

All list endpoints return: `{ data: [...], meta: { total, page, limit, totalPages } }`
- NOT `{ customers: [...] }` or `{ items: [...] }`
- POST endpoints return the created object directly (not nested under a key)
- Error responses: `{ error: "message" }` with appropriate status code
- Some endpoints return 500 for validation errors (Prisma throws before app validates) — this is a known issue

## Design Token System

Defined in `src/app/globals.css` under `@theme`:

| Token | Value | Usage |
|-------|-------|-------|
| `brand-brown` | `#362418` | Primary text, buttons, sidebar bg |
| `brand-brown-deep` | `#1E140C` | Hover states, login gradient |
| `brand-tan` | `#EABB87` | Accents, active states, CTA |
| `brand-tan-dark` | `#C89963` | Entry numbers, secondary accents |
| `brand-cream` | `#FFF5DC` | Light text on dark bg |
| `brand-olive` | `#5B5038` | Secondary text, muted labels |
| `bg` | `#FBF6E9` | Page background |
| `surface` | `#FFFFFF` | Card backgrounds |
| `success` | `#3D5A3D` | Green states |
| `warning` | `#9E6A1C` | Orange states |
| `danger` | `#8B3A2A` | Red states |

**Typography:** `font-display` = Rajdhani (headings), `font-sans` = Manrope (body), `font-mono` = JetBrains Mono (codes/numbers)

**Shared CSS classes** used in form pages:
```
INPUT_CLS = "w-full rounded-sm border border-brand-brown/20 px-3 py-2 text-sm text-brand-brown bg-white focus:border-brand-tan focus:outline-none focus:ring-1 focus:ring-brand-tan/20"
LABEL_CLS = "mb-1 block font-display text-[11px] font-semibold tracking-[.12em] text-brand-olive/50 uppercase"
```

## What's Been Built

### Fully Complete
- **Login** — JWT auth, dark branded page, autofill CSS fix
- **Sidebar navigation** — 3 groups (Operations, Factory, Analytics), all links working
- **Header** — greeting, avatar with initials, logout
- **Field Dashboard** — 4 KPI cards, visits calendar, upcoming visits, lead pipeline, visit trends chart, top reps, tier breakdown
- **Customers** — list with tier badges, detail page with edit mode, add customer form with GPS location icon + reverse geocode + address autocomplete
- **Visits** — list with date filter, detail page with timeline + geofence map + notes editing, new visit form, check-in/checkout flow with geofence validation
- **Blocks** — list, detail with slabs table + gang saw entries, add block form
- **Machines** — list grouped by type, add machine form
- **Production Hub** — flow diagram + 3 stage cards
- **Gang Saw** — list + new entry form
- **Epoxy/Vacuum** — list + new entry form
- **Polishing** — list + new entry form
- **Factory Inventory** — stat cards, table, add-to-inventory modal
- **Field Inventory** — grid/list toggle, filters, detail page with reservation
- **Offline support** — service worker, IndexedDB queuing, background sync
- **Playwright tests** — 239 tests across 9 spec files + auth setup
- **GitHub Actions CI** — auto-runs tests on push

### Design Token Migration (Complete)
Every page migrated from generic Tailwind (stone-*, amber-*, purple-*, indigo-*) to the brand token system. Pages affected: visits/new, visits/checkin, PlanVisitModal, PhotoCapture, SitePhotos, blocks (list/new/detail), machines (list/new), inventory, production (hub/gang-saw/epoxy/polishing — all list + new pages).

## What's In Progress / Not Started

- **Reports page** — sidebar links to `#reports` anchor (placeholder)
- **Orders module** — removed from nav (not implemented)
- **middleware.ts → proxy.ts rename** — Next.js 16 deprecated the `middleware` file convention; shows warning on every dev startup. The rename is trivial (same exports, just rename file) but hasn't been done yet to avoid risking auth breakage without browser testing.
- **Remaining 31 Playwright test failures** — mostly mobile-specific tests that need viewport-aware selectors. 208 pass currently.

## Known Bugs / Issues

| Severity | Issue | Location |
|----------|-------|----------|
| Major | Visit Trends chart renders empty bars — data exists but bars have 0 height on some days | `field-dashboard/page.tsx` lines 460-488 — timing-dependent on seed data dates |
| Major | Lead Pipeline bars all same width regardless of count | `field-dashboard/page.tsx` — bar width calculation doesn't vary |
| Minor | Geofence Compliance KPI subtitle says "avg 75 min per visit" — misleading label (it's visit duration, not compliance metric) | `field-dashboard/page.tsx` |
| Minor | Calendar dots all same color (can't distinguish new vs follow-up) | `field-dashboard/page.tsx` |
| Minor | API returns 500 (not 400) for validation errors on customer/machine creation — Prisma throws before app validates | `api/customers/route.ts`, `api/machines/route.ts` |
| Cosmetic | `middleware.ts` deprecation warning on every dev startup | Rename to `proxy.ts` when ready to test |

## Key Decisions Made

1. **SQLite for dev, Turso for prod** — avoids PostgreSQL setup locally, Turso is serverless SQLite on Vercel
2. **No component library** — all UI is custom Tailwind, brand-specific. StatusBadge, Card, DataTable are the shared primitives.
3. **Server-side address autocomplete** — routes through `/api/places/autocomplete` (Nominatim) rather than client-side Google SDK to avoid API key exposure
4. **GPS icon in address field** — user requested this over separate GPS capture button. Tap pin icon → get GPS → reverse geocode → auto-fill all address fields
5. **Google Maps for reverse geocode, Nominatim for forward search** — Google is more accurate for lat/lng→address; Nominatim is free for text→suggestions. Falls back to Nominatim if no Google key.
6. **JWT in httpOnly cookie** — not localStorage. Production requires `JWT_SECRET` env var (throws if missing).
7. **Prisma db push for test setup** — migrations have schema gaps (missing columns like `currentRequirements`). `db push` applies current schema directly.
8. **Playwright on port 3456** — avoids conflict with dev server on 3000
9. **No debug info in API errors** — login route stripped of `debug: message` in 500 responses

## Conventions

- **File-level CSS constants** — each form page defines `INPUT_CLS` and `LABEL_CLS` at the top for consistency
- **Brand tokens only** — never use raw Tailwind colors (no `blue-500`, `stone-300`, etc.)
- **Entry numbers** — always `font-mono text-brand-tan-dark`
- **Page headers** — `font-display text-[28px] font-bold leading-tight text-brand-brown`
- **Card section headers** — `font-display text-[15px] font-bold text-brand-brown`
- **Status badges** — use `<StatusBadge status={value} />` component, never inline status styling
- **API responses** — always `{ data: [...], meta: {...} }` for lists
- **Buttons** — primary: `bg-brand-brown text-white`, success: `bg-success text-white`, danger: `bg-danger text-white`
- **Spinners** — `border-brand-tan border-t-transparent animate-spin`
- **Errors** — `bg-danger/10 text-danger rounded-sm p-3`

## Seed Data (for testing)

**Users:** admin@eaglestone.in, manager@eaglestone.in, operator@eaglestone.in, operator2@eaglestone.in, fieldrep@eaglestone.in (all passwords: [role]123)

**Customers (5):** Rajasthan Marble House (Gold/Jaipur), Mehta Constructions (Platinum/Mumbai), Stone Age Interiors (Silver/Bangalore), Andhra Granite Works (Bronze/Ongole), Delhi Marble Emporium (Gold/Delhi)

**Blocks (4):** Statuario (Fully Cut), Bottochino (In Production), Emperador (Received), Makrana (Received)

**Machines (6):** 2 gang saws, 2 epoxy lines, 2 polishing machines. PL-02 is in MAINTENANCE status.

**Production:** 2 gang saw entries, 8 epoxy entries, 6 polishing entries, 8 slabs from Block 1

**Visits (4):** 1 completed (Rajasthan), 1 planned (Mehta), 1 completed (Stone Age), 1 flagged fake (Delhi)

**Field Inventory (8):** Statuario, Bottochino, Emperador, Makrana, Black Galaxy, Calacatta, Honey Onyx, Classic Travertine

## Environment Setup

```bash
echo 'DATABASE_URL="file:./dev.db"' > .env
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Tests: `npm run test:e2e` (needs `npx playwright install chromium` first)

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
