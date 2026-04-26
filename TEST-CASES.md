# Eaglestone CRM — Test Checklist

**Login:** `admin@eaglestone.in` / `admin123`

---

## 1. AUTH & NAVIGATION

| # | Test | Pass? |
|---|------|-------|
| 1 | Login with valid creds → redirects to /field-dashboard | |
| 2 | Wrong password → error message, stays on login | |
| 3 | Visit /customers without login → redirects to /login | |
| 4 | Sidebar: all 8 nav links work (Dashboard, Customers, Visits, Field Inventory, Blocks, Production, Machines, Reports) | |
| 5 | Sidebar: NO hardcoded count badges (147/32) | |
| 6 | Header: avatar shows initials correctly (not clipped) | |
| 7 | Header: avatar click → logs out | |
| 8 | Mobile: hamburger opens sidebar, overlay closes it | |
| 9 | No console errors (especially no ServiceWorker SecurityError) | |

---

## 2. DASHBOARD (`/field-dashboard`)

| # | Test | Pass? |
|---|------|-------|
| 1 | 4 KPI cards load with real data (Total Customers, Visits, Order Value, Compliance) | |
| 2 | Calendar shows current month with visit dots | |
| 3 | Upcoming Visits panel lists planned visits with customer names | |
| 4 | Lead Pipeline shows bars proportional to data (not all same width) | |
| 5 | Visit Trends chart shows bars for last 7 days (not empty) | |
| 6 | Customers by Tier: 4 cards with correct counts adding to total | |
| 7 | NEW VISIT button works | |

---

## 3. CUSTOMERS

| # | Test | Pass? |
|---|------|-------|
| 1 | List shows 5 seed customers with tier badges and lead status | |
| 2 | Click customer → detail page with contact info, address, visit history | |
| 3 | Add Customer: all 6 sections render (Info, Classification, Location, GPS, Requirements, Photos) | |
| 4 | GPS icon in address field → captures location → reverse geocodes → fills address + city + district + region + pincode | |
| 5 | Type 3+ chars in address → autocomplete dropdown appears | |
| 6 | Fill required fields → CREATE CUSTOMER → redirects to list, new customer visible | |
| 7 | Submit empty form → "required" validation error | |
| 8 | Customer detail: EDIT mode works, SAVE persists changes | |
| 9 | Customer detail: PLAN VISIT button opens modal | |

---

## 4. VISITS

| # | Test | Pass? |
|---|------|-------|
| 1 | List shows seed visits with correct statuses (Completed, Planned, Flagged) | |
| 2 | FLAGGED_FAKE visit has red indicator | |
| 3 | Click visit → detail page with timeline, geofence card, notes | |
| 4 | Flagged visit detail → red warning banner shown | |
| 5 | New Visit: customer search, purpose dropdown, date picker all work | |
| 6 | Check-in page: GPS acquisition → geofence check → timer → checkout form → done | |
| 7 | Check-in: outside geofence → warning + "Continue Anyway" option | |
| 8 | Visit detail: Edit Notes → Save works | |

---

## 5. BLOCKS & PRODUCTION

| # | Test | Pass? |
|---|------|-------|
| 1 | Blocks list: 4 blocks with varieties (Statuario, Bottochino, Emperador, Makrana) | |
| 2 | Block detail: shows slabs table (8 slabs for BLK-0001) + gang saw entries | |
| 3 | Add Block: select dropdowns for type/variety/color/origin, dimension inputs, submit works | |
| 4 | Production hub: flow diagram (5 stages) + 3 stage cards link to sub-pages | |
| 5 | Gang Saw list: GS-2026-0001 (Completed), GS-2026-0002 (In Progress) | |
| 6 | Gang Saw new: block/machine dropdowns populated, create entry works | |
| 7 | Epoxy list: 8 entries with QC Pass status | |
| 8 | Epoxy new: epoxy type dropdown (5 options), mesh checkbox, status/QC selects | |
| 9 | Polishing list: 6 entries with POLISHED finish, 85% gloss | |
| 10 | Polishing new: finish type options (Polished, Honed, Leather, Brushed, Flamed) | |

---

## 6. MACHINES & INVENTORY

| # | Test | Pass? |
|---|------|-------|
| 1 | Machines: grouped by type (Gang Saw, Epoxy, Polishing), 6 machines total | |
| 2 | Machine codes visible: GS-01, GS-02, EP-01, EP-02, PL-01, PL-02 | |
| 3 | Add Machine: create with unique code → appears in list | |
| 4 | Add Machine: duplicate code "GS-01" → error or stays on form | |
| 5 | Factory Inventory: stat cards (Total, In Stock, Reserved, Sold), data table | |
| 6 | Factory Inventory: Add to Inventory modal opens, slab dropdown works, cancel closes | |
| 7 | Field Inventory: grid of 8 items with prices (₹350–₹1,500/sqft) | |
| 8 | Field Inventory: Grid/List view toggle works | |
| 9 | Field Inventory: filters (search, material, finish, grade) | |
| 10 | Field Inventory detail: specs, stock counts, warehouse info, reserve button | |

---

## 7. LOOK FOR THESE ISSUES

- **Styling**: any unstyled default browser elements (blue links, default checkboxes, pale autofill backgrounds)
- **Brand consistency**: all text should use Rajdhani (headings) or Manrope (body), warm brown/tan/olive palette
- **Empty states**: pages with no data should show helpful message, not blank or broken
- **Status badges**: color-coded correctly (green=success, red=danger, orange=warning)
- **Indian formatting**: currency as ₹X,XX,XXX (lakh notation), phone as +91-XXXXX
- **Mobile**: no horizontal overflow, forms usable, modals full-height
- **Console**: no errors besides deprecation warnings
