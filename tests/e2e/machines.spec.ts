import { test, expect } from "@playwright/test";

test.describe("Machines", () => {
  test("machines list shows all seeded machines", async ({ page }) => {
    await page.goto("/machines");
    await expect(page.locator("h1").filter({ hasText: /machine/i })).toBeVisible();

    await expect(page.getByText("Gang Saw 1")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("Gang Saw 2")).toBeVisible();
    await expect(page.getByText("Epoxy Line A")).toBeVisible();
    await expect(page.getByText("Polishing Machine 1")).toBeVisible();
    await expect(page.getByText("Polishing Machine 2")).toBeVisible();
  });

  test("machines grouped by type", async ({ page }) => {
    await page.goto("/machines");
    await expect(page.getByText(/Gang Saw|GANG_SAW/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/Epoxy|EPOXY/i)).toBeVisible();
    await expect(page.getByText(/Polishing|POLISHING/i)).toBeVisible();
  });

  test("machine status ACTIVE and MAINTENANCE shown", async ({ page }) => {
    await page.goto("/machines");
    await expect(page.getByText(/ACTIVE/)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/MAINTENANCE/)).toBeVisible();
  });

  test("machine codes displayed (GS-01, EP-01, PL-01)", async ({ page }) => {
    await page.goto("/machines");
    await expect(page.getByText("GS-01")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("EP-01")).toBeVisible();
    await expect(page.getByText("PL-01")).toBeVisible();
  });

  test("new machine form renders all fields", async ({ page }) => {
    await page.goto("/machines/new");
    await expect(page.locator("h1").filter({ hasText: /new machine|add machine/i })).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="code"]')).toBeVisible();
    await expect(page.locator('select[name="type"]')).toBeVisible();
  });

  test("new machine - create gang saw successfully", async ({ page }) => {
    await page.goto("/machines/new");

    await page.locator('input[name="name"]').fill("Test Gang Saw Playwright");
    await page.locator('input[name="code"]').fill(`GS-PW-${Date.now()}`);
    await page.locator('select[name="type"]').selectOption("GANG_SAW");
    await page.locator('input[name="manufacturer"]').fill("Breton");
    await page.locator('input[name="location"]').fill("Section Z, Bay 99");

    await page.getByRole("button", { name: /save|create/i }).click();
    await expect(page).toHaveURL(/\/machines$/, { timeout: 10_000 });
    await expect(page.getByText("Test Gang Saw Playwright")).toBeVisible({ timeout: 5_000 });
  });

  test("new machine - create polishing machine", async ({ page }) => {
    await page.goto("/machines/new");

    await page.locator('input[name="name"]').fill("Test Polisher Playwright");
    await page.locator('input[name="code"]').fill(`PL-PW-${Date.now()}`);
    await page.locator('select[name="type"]').selectOption("POLISHING_MACHINE");

    await page.getByRole("button", { name: /save|create/i }).click();
    await expect(page).toHaveURL(/\/machines$/, { timeout: 10_000 });
  });

  test("new machine - duplicate code shows error", async ({ page }) => {
    await page.goto("/machines/new");
    await page.locator('input[name="name"]').fill("Duplicate Saw");
    await page.locator('input[name="code"]').fill("GS-01"); // Already exists
    await page.locator('select[name="type"]').selectOption("GANG_SAW");
    await page.getByRole("button", { name: /save|create/i }).click();
    await expect(page.getByText(/already|duplicate|unique|exists/i)).toBeVisible({ timeout: 5_000 });
  });
});
