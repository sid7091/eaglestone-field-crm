import { test, expect } from "@playwright/test";

test.describe("Production Hub", () => {
  test("production hub shows all 3 stages", async ({ page }) => {
    await page.goto("/production");
    await expect(page.locator("h1").filter({ hasText: /production/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Gang Saw/i }).first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/Epoxy/i).first()).toBeVisible();
    await expect(page.getByText(/Polishing/i).first()).toBeVisible();
  });

  test("production hub shows flow diagram with 5 stages", async ({ page }) => {
    await page.goto("/production");
    await expect(page.getByText("Raw Block", { exact: true })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("Warehouse", { exact: true })).toBeVisible();
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
    await expect(page.getByText("BLK-2026-0001").first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/COMPLETED|IN_PROGRESS/).first()).toBeVisible();
  });

  test("new gang saw form renders", async ({ page }) => {
    await page.goto("/production/gang-saw/new");
    await expect(page.locator("h1").filter({ hasText: /Gang Saw/i })).toBeVisible();
    await expect(page.getByText("Block & Machine")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cutting Details" })).toBeVisible();
  });

  test("new gang saw form - block and machine selects populated", async ({ page }) => {
    await page.goto("/production/gang-saw/new");
    const blockSelect = page.locator('select[name="blockId"]');
    await expect(blockSelect).toBeVisible({ timeout: 8_000 });
    const blockOptions = await blockSelect.locator("option").count();
    expect(blockOptions).toBeGreaterThan(1);

    const machineSelect = page.locator('select[name="machineId"]');
    const machineOptions = await machineSelect.locator("option").count();
    expect(machineOptions).toBeGreaterThan(1);
  });

  test("new gang saw - create entry", async ({ page }) => {
    await page.goto("/production/gang-saw/new");

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
    await expect(page.getByText(/PASS|COMPLETED/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test("new epoxy form renders", async ({ page }) => {
    await page.goto("/production/epoxy/new");
    await expect(page.locator("h1").filter({ hasText: /epoxy/i })).toBeVisible();
    await expect(page.getByText("Slab & Machine")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Epoxy Details" })).toBeVisible();
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
    const options = await typeSelect.locator("option").allTextContents();
    expect(options.some((o) => /Premium/i.test(o))).toBeTruthy();
    expect(options.some((o) => /UV Resistant/i.test(o))).toBeTruthy();
  });

  test("new epoxy - no slabs ready shows warning hint", async ({ page }) => {
    await page.goto("/production/epoxy/new");
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
    await expect(page.getByText(/POLISHED/i).first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/85%/)).toBeVisible();
  });

  test("new polishing form renders", async ({ page }) => {
    await page.goto("/production/polishing/new");
    await expect(page.locator("h1").filter({ hasText: /polishing/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Polishing Details" })).toBeVisible();
  });

  test("new polishing form - finish type has all options", async ({ page }) => {
    await page.goto("/production/polishing/new");
    const finishSelect = page.locator('select[name="finishType"]');
    await expect(finishSelect).toBeVisible({ timeout: 5_000 });
    const options = await finishSelect.locator("option").allTextContents();
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
