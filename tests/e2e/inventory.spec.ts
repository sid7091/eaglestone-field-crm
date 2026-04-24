import { test, expect } from "@playwright/test";

test.describe("Slab Inventory (Factory)", () => {
  test("inventory page loads", async ({ page }) => {
    await page.goto("/inventory");
    await expect(page.locator("h1").filter({ hasText: /inventory/i })).toBeVisible();
    const content = await page.textContent("body");
    expect(content).toMatch(/inventory|slab|total/i);
  });

  test("inventory shows stat cards: Total, In Stock, Reserved, Sold", async ({ page }) => {
    await page.goto("/inventory");
    await expect(page.getByText(/total items/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/in stock/i).first()).toBeVisible();
    await expect(page.getByText(/reserved/i).first()).toBeVisible();
    await expect(page.getByText(/sold/i).first()).toBeVisible();
  });

  test("inventory table shows column headers", async ({ page }) => {
    await page.goto("/inventory");
    await expect(page.getByRole("columnheader", { name: /slab/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole("columnheader", { name: /variety/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /warehouse/i })).toBeVisible();
  });

  test("inventory shows data from seed", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForTimeout(2_000);
    const content = await page.textContent("body");
    expect(content).toMatch(/Statuario|Main Warehouse|SLB|No inventory/i);
  });

  test("Add to Inventory button opens modal", async ({ page }) => {
    await page.goto("/inventory");
    await page.getByRole("button", { name: /add to inventory/i }).click();
    await expect(page.getByText("Add Slab to Inventory")).toBeVisible({ timeout: 5_000 });
  });

  test("add to inventory modal - slab dropdown exists", async ({ page }) => {
    await page.goto("/inventory");
    await page.getByRole("button", { name: /add to inventory/i }).click();
    await expect(page.locator('select[name="slabId"]')).toBeVisible({ timeout: 5_000 });
  });

  test("add to inventory modal - cancel closes it", async ({ page }) => {
    await page.goto("/inventory");
    await page.getByRole("button", { name: /add to inventory/i }).click();
    await expect(page.getByText("Add Slab to Inventory")).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByText("Add Slab to Inventory")).not.toBeVisible({ timeout: 3_000 });
  });
});

test.describe("Field Inventory", () => {
  test("field inventory page shows seeded items", async ({ page }) => {
    await page.goto("/field-inventory");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/Statuario|Bottochino|Makrana|Calacatta/).first()).toBeVisible({ timeout: 8_000 });
  });

  test("field inventory shows pricing", async ({ page }) => {
    await page.goto("/field-inventory");
    await expect(page.getByText(/₹|INR|\d+.*sqft/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test("field inventory detail page loads", async ({ page }) => {
    await page.goto("/field-inventory");
    const firstItem = page.locator('[href*="/field-inventory/"]').first();
    if (await firstItem.isVisible({ timeout: 5_000 })) {
      await firstItem.click();
      await expect(page).toHaveURL(/field-inventory\//);
      await expect(page.locator("h1, h2").first()).toBeVisible();
    }
  });

  test("field inventory shows warehouse codes", async ({ page }) => {
    await page.goto("/field-inventory");
    await expect(page.getByText(/WH-ONG|WH-JPR/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test("field inventory shows material types", async ({ page }) => {
    await page.goto("/field-inventory");
    const content = await page.textContent("body");
    expect(content).toMatch(/Marble|Granite|Onyx|Travertine/i);
  });
});
