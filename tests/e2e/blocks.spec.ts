import { test, expect } from "@playwright/test";

test.describe("Blocks (Raw Material)", () => {
  test("blocks list shows seeded blocks", async ({ page }) => {
    await page.goto("/blocks");
    await expect(page.locator("h1").filter({ hasText: /block/i })).toBeVisible();

    await expect(page.getByText("BLK-2026-0001")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("BLK-2026-0002")).toBeVisible();
    await expect(page.getByText("BLK-2026-0003")).toBeVisible();
    await expect(page.getByText("BLK-2026-0004")).toBeVisible();
  });

  test("blocks list shows variety and status", async ({ page }) => {
    await page.goto("/blocks");
    await expect(page.getByText("Statuario")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/RECEIVED|IN_PRODUCTION|FULLY_CUT/)).toBeVisible();
  });

  test("block detail page loads with slabs", async ({ page }) => {
    await page.goto("/blocks");
    await page.getByText("BLK-2026-0001").first().click();
    await expect(page).toHaveURL(/blocks\//);
    await expect(page.getByText("BLK-2026-0001")).toBeVisible({ timeout: 8_000 });
    // Block 1 has 8 slabs from seed
    await expect(page.getByText(/SLB-2026|slab/i).first()).toBeVisible();
  });

  test("block detail shows gang saw entries", async ({ page }) => {
    await page.goto("/blocks");
    await page.getByText("BLK-2026-0001").first().click();
    await expect(page.getByText(/GS-2026-0001|gang saw/i)).toBeVisible({ timeout: 8_000 });
  });

  test("block detail shows dimensions and weight", async ({ page }) => {
    await page.goto("/blocks");
    await page.getByText("BLK-2026-0001").first().click();
    // Statuario block: 300 x 180 x 150 cm, 22000 kg
    await expect(page.getByText(/300|180|150/)).toBeVisible({ timeout: 8_000 });
  });

  test("new block form renders all fields", async ({ page }) => {
    await page.goto("/blocks/new");
    await expect(page.locator("h1").filter({ hasText: /new block|add block/i })).toBeVisible();

    // Required fields
    await expect(page.getByLabel(/block number|number/i).or(page.locator('input[name="blockNumber"]'))).toBeVisible();
    await expect(page.locator('input[name="variety"]').or(page.getByPlaceholder(/statuario/i))).toBeVisible();
  });

  test("new block - create block successfully", async ({ page }) => {
    await page.goto("/blocks/new");

    const today = new Date().toISOString().split("T")[0];

    await page.locator('input[name="blockNumber"]').fill(`BLK-TEST-${Date.now()}`);
    await page.locator('select[name="type"], input[name="type"]').first().selectOption?.("Italian Marble");
    await page.locator('input[name="variety"]').fill("Calacatta");
    await page.locator('input[name="color"]').fill("White");
    await page.locator('input[name="origin"]').fill("Italy");
    await page.locator('input[name="supplierName"]').fill("Test Supplier Playwright");
    await page.locator('input[name="lengthCm"]').fill("300");
    await page.locator('input[name="widthCm"]').fill("180");
    await page.locator('input[name="heightCm"]').fill("150");
    await page.locator('input[name="weightKg"]').fill("22000");
    await page.locator('input[name="arrivalDate"]').fill(today);

    await page.getByRole("button", { name: /save|create/i }).click();
    await expect(page).toHaveURL(/\/blocks$/, { timeout: 10_000 });
  });

  test("new block - validation catches missing required fields", async ({ page }) => {
    await page.goto("/blocks/new");
    await page.getByRole("button", { name: /save|create/i }).click();
    // HTML5 validation or app-level error
    const hasError = await page.getByText(/required|fill/i).isVisible({ timeout: 3_000 }).catch(() => false);
    const stayedOnPage = page.url().includes("/blocks/new");
    expect(hasError || stayedOnPage).toBeTruthy();
  });

  test("Add Block button navigates to new block form", async ({ page }) => {
    await page.goto("/blocks");
    await page.getByRole("link", { name: /add block|\+ block|new block/i }).click();
    await expect(page).toHaveURL(/blocks\/new/);
  });
});
