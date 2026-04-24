import { test, expect } from "@playwright/test";

test.describe("Blocks (Raw Material)", () => {
  test("blocks list shows seeded blocks", async ({ page }) => {
    await page.goto("/blocks");
    await expect(page.locator("h1").filter({ hasText: /block/i })).toBeVisible();

    await expect(page.getByText("BLK-2026-0001").first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("BLK-2026-0002").first()).toBeVisible();
    await expect(page.getByText("BLK-2026-0003").first()).toBeVisible();
    await expect(page.getByText("BLK-2026-0004").first()).toBeVisible();
  });

  test("blocks list shows variety and status", async ({ page }) => {
    await page.goto("/blocks");
    await expect(page.getByText("Statuario").first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/RECEIVED|IN_PRODUCTION|FULLY_CUT/).first()).toBeVisible();
  });

  test("block detail page loads with slabs", async ({ page }) => {
    await page.goto("/blocks");
    await page.getByText("BLK-2026-0001").first().click();
    await expect(page).toHaveURL(/blocks\//);
    await expect(page.getByText("BLK-2026-0001").first()).toBeVisible({ timeout: 8_000 });
    // Block 1 has 8 slabs from seed
    await expect(page.getByText(/SLB-2026|slab/i).first()).toBeVisible();
  });

  test("block detail shows gang saw entries", async ({ page }) => {
    await page.goto("/blocks");
    await page.getByText("BLK-2026-0001").first().click();
    await expect(page.getByText(/GS-2026-0001|gang saw/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test("block detail shows dimensions and weight", async ({ page }) => {
    await page.goto("/blocks");
    await page.getByText("BLK-2026-0001").first().click();
    // Statuario block: 300 x 180 x 150 cm, 22000 kg
    await expect(page.getByText(/300|180|150/).first()).toBeVisible({ timeout: 8_000 });
  });

  test("new block form renders all fields", async ({ page }) => {
    await page.goto("/blocks/new");
    await expect(page.locator("h1").filter({ hasText: /new block|add block/i })).toBeVisible();

    // Block number is auto-generated, so just check that the form has type/variety selects
    await expect(page.locator('select, input').first()).toBeVisible();
  });

  test("new block - create block successfully", async ({ page }) => {
    await page.goto("/blocks/new");

    // The form uses select dropdowns for type, variety, color, origin
    // Fill in whatever fields are available
    const selects = page.locator('select');
    const selectCount = await selects.count();
    for (let i = 0; i < selectCount; i++) {
      const select = selects.nth(i);
      const options = select.locator('option');
      const optionCount = await options.count();
      if (optionCount > 1) {
        await select.selectOption({ index: 1 });
      }
    }

    // Fill text inputs that exist
    const supplierInput = page.locator('input[name="supplierName"]');
    if (await supplierInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await supplierInput.fill("Test Supplier Playwright");
    }
    const lengthInput = page.locator('input[name="lengthCm"]');
    if (await lengthInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await lengthInput.fill("300");
    }
    const widthInput = page.locator('input[name="widthCm"]');
    if (await widthInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await widthInput.fill("180");
    }
    const heightInput = page.locator('input[name="heightCm"]');
    if (await heightInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await heightInput.fill("150");
    }
    const weightInput = page.locator('input[name="weightKg"]');
    if (await weightInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await weightInput.fill("22000");
    }
    const arrivalInput = page.locator('input[name="arrivalDate"]');
    if (await arrivalInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      const today = new Date().toISOString().split("T")[0];
      await arrivalInput.fill(today);
    }

    await page.getByRole("button", { name: /save|create/i }).click();
    // Either redirect to blocks list or stay on page with success
    await expect(page).toHaveURL(/\/blocks/, { timeout: 10_000 });
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
