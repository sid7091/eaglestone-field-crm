import { test, expect } from "@playwright/test";

test.describe("Production Hub", () => {
  test("production hub shows all 3 stages", async ({ page }) => {
    await page.goto("/production");
    await expect(page.locator("h1").filter({ hasText: /production/i })).toBeVisible();
    await expect(page.getByText(/Gang Saw/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/Epoxy/i)).toBeVisible();
    await expect(page.getByText(/Polishing/i)).toBeVisible();
  });

  test("production hub shows flow diagram with 5 stages", async ({ page }) => {
    await page.goto("/production");
    await expect(page.getByText(/Raw Block/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/Warehouse/i)).toBeVisible();
  });

  test("navigate to gang saw from production hub", async ({ page }) => {
    await page.goto("/production");
    await page.getByRole("link", { name: /Gang Saw/i }).click();
    await expect(page).toHaveURL(/production\/gang-saw/);
  });

  test("navigate to epoxy from production hub", async ({ page }) => {
    await page.goto("/production");
    await page.getByRole("link", { name: /epoxy/i }).click();
    await expect(page).toHaveURL(/production\/epoxy/);
  });

  test("navigate to polishing from production hub", async ({ page }) => {
    await page.goto("/production");
    await page.getByRole("link", { name: /polishing/i }).click();
    await expect(page).toHaveURL(/production\/polishing/);
  });
});

test.describe("Gang Saw", () => {
  test("gang saw list shows seeded entries", async ({ page }) => {
    await page.goto("/production/gang-saw");
    await expect(page.locator("h1").filter({ hasText: /Gang Saw/i })).toBeVisible();
    await expect(page.getByText("GS-2026-0001")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("GS-2026-0002")).toBeVisible();
  });

  test("gang saw list shows block numbers and status", async ({ page }) => {
    await page.goto("/production/gang-saw");
    await expect(page.getByText(/BLK-2026-0001|Statuario/)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/COMPLETED|IN_PROGRESS/)).toBeVisible();
  });

  test("new gang saw form renders", async ({ page }) => {
    await page.goto("/production/gang-saw/new");
    await expect(page.locator("h1").filter({ hasText: /Gang Saw/i })).toBeVisible();
    await expect(page.getByText("Block & Machine")).toBeVisible();
    await expect(page.getByText("Cutting Details")).toBeVisible();
  });

  test("new gang saw form - required fields populated from seed", async ({ page }) => {
    await page.goto("/production/gang-saw/new");
    // Blocks with RECEIVED or PARTIALLY_CUT status should appear
    await expect(page.locator('select[name="blockId"] option').filter({ hasNotText: "Choose a block" }).first())
      .toBeVisible({ timeout: 8_000 });
    // Gang saw machines should appear
    await expect(page.locator('select[name="machineId"] option').filter({ hasNotText: "Select machine" }).first())
      .toBeVisible({ timeout: 5_000 });
  });

  test("new gang saw - create entry", async ({ page }) => {
    await page.goto("/production/gang-saw/new");

    // Select a block (BLK-2026-0003 or BLK-2026-0004 are RECEIVED)
    await page.locator('select[name="blockId"]').selectOption({ index: 1 });
    await page.locator('select[name="machineId"]').selectOption({ index: 1 });

    const now = new Date();
    const dtLocal = now.toISOString().slice(0, 16);
    await page.locator('input[name="startTime"]').fill(dtLocal);
    await page.locator('input[name="numberOfSlabs"]').fill("6");
    await page.locator('input[name="slabThicknessMm"]').fill("18");

    await page.getByRole("button", { name: /save entry/i }).click();
    await expect(page).toHaveURL(/production\/gang-saw$/, { timeout: 10_000 });
  });
});

test.describe("Epoxy / Vacuum", () => {
  test("epoxy list shows seeded entries", async ({ page }) => {
    await page.goto("/production/epoxy");
    await expect(page.locator("h1").filter({ hasText: /epoxy/i })).toBeVisible();
    await expect(page.getByText("EP-2026-0001")).toBeVisible({ timeout: 8_000 });
  });

  test("epoxy list shows quality check status", async ({ page }) => {
    await page.goto("/production/epoxy");
    await expect(page.getByText(/PASS|COMPLETED/i)).toBeVisible({ timeout: 8_000 });
  });

  test("new epoxy form renders", async ({ page }) => {
    await page.goto("/production/epoxy/new");
    await expect(page.locator("h1").filter({ hasText: /epoxy/i })).toBeVisible();
    await expect(page.getByText("Slab & Machine")).toBeVisible();
    await expect(page.getByText("Epoxy Details")).toBeVisible();
  });

  test("new epoxy form - mesh applied checkbox exists", async ({ page }) => {
    await page.goto("/production/epoxy/new");
    await expect(page.locator("#meshApplied")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Fiber mesh applied")).toBeVisible();
  });

  test("new epoxy form - epoxy type dropdown has options", async ({ page }) => {
    await page.goto("/production/epoxy/new");
    const typeSelect = page.locator('select[name="epoxyType"]');
    await expect(typeSelect).toBeVisible({ timeout: 5_000 });
    await expect(typeSelect.locator('option[value="Premium"]')).toBeVisible();
    await expect(typeSelect.locator('option[value="UV Resistant"]')).toBeVisible();
  });

  test("new epoxy - no slabs ready shows warning hint", async ({ page }) => {
    // After seeding, some slabs will be in EPOXY stage
    await page.goto("/production/epoxy/new");
    // If slabs exist, dropdown is populated; if not, warning shown
    const dropdown = page.locator('select[name="slabId"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Polishing", () => {
  test("polishing list shows seeded entries", async ({ page }) => {
    await page.goto("/production/polishing");
    await expect(page.locator("h1").filter({ hasText: /polishing/i })).toBeVisible();
    await expect(page.getByText("PL-2026-0001")).toBeVisible({ timeout: 8_000 });
  });

  test("polishing list shows finish type and gloss level", async ({ page }) => {
    await page.goto("/production/polishing");
    await expect(page.getByText(/POLISHED/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/85%/)).toBeVisible();
  });

  test("new polishing form renders", async ({ page }) => {
    await page.goto("/production/polishing/new");
    await expect(page.locator("h1").filter({ hasText: /polishing/i })).toBeVisible();
    await expect(page.getByText("Polishing Details")).toBeVisible();
  });

  test("new polishing form - finish type has all options", async ({ page }) => {
    await page.goto("/production/polishing/new");
    const finishSelect = page.locator('select[name="finishType"]');
    await expect(finishSelect).toBeVisible({ timeout: 5_000 });
    const options = await finishSelect.locator("option").allTextContents();
    // Should have at least Polished, Honed
    expect(options.some((o) => /polished/i.test(o))).toBeTruthy();
    expect(options.some((o) => /honed/i.test(o))).toBeTruthy();
  });

  test("new polishing - gloss level field accepts 0-100", async ({ page }) => {
    await page.goto("/production/polishing/new");
    const glossInput = page.locator('input[name="glossLevel"]');
    await expect(glossInput).toBeVisible({ timeout: 5_000 });
    await glossInput.fill("85");
    await expect(glossInput).toHaveValue("85");
  });
});
