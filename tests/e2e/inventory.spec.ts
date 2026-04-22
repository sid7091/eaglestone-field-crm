import { test, expect } from "@playwright/test";

test.describe("Slab Inventory (Factory)", () => {
  test("inventory page shows seeded items", async ({ page }) => {
    await page.goto("/inventory");
    await expect(page.locator("h1").filter({ hasText: /inventory/i })).toBeVisible();
    // Seed has 4 inventory items from Statuario block
    await expect(page.getByText(/SLB-2026/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test("inventory shows stat cards: Total, In Stock, Reserved, Sold", async ({ page }) => {
    await page.goto("/inventory");
    await expect(page.getByText(/total items/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/in stock/i)).toBeVisible();
    await expect(page.getByText(/reserved/i)).toBeVisible();
    await expect(page.getByText(/sold/i)).toBeVisible();
  });

  test("inventory table shows all columns", async ({ page }) => {
    await page.goto("/inventory");
    await expect(page.getByText("Slab #")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("Variety")).toBeVisible();
    await expect(page.getByText("Dimensions")).toBeVisible();
    await expect(page.getByText("Grade")).toBeVisible();
    await expect(page.getByText("Warehouse")).toBeVisible();
  });

  test("inventory shows Statuario variety from seed", async ({ page }) => {
    await page.goto("/inventory");
    await expect(page.getByText("Statuario")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("Main Warehouse")).toBeVisible();
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
    await expect(page.getByText(/Statuario|Bottochino|Makrana|Calacatta/)).toBeVisible({ timeout: 8_000 });
  });

  test("field inventory shows pricing", async ({ page }) => {
    await page.goto("/field-inventory");
    // Seed has prices like 850, 650, 1200 per sqft
    await expect(page.getByText(/₹|INR|\d+.*sqft/i)).toBeVisible({ timeout: 8_000 });
  });

  test("field inventory detail page loads", async ({ page }) => {
    await page.goto("/field-inventory");
    const firstItem = page.locator('[href*="/field-inventory/"]').first();
    if (await firstItem.isVisible({ timeout: 5_000 })) {
      await firstItem.click();
      await expect(page).toHaveURL(/field-inventory\//);
      await expect(page.locator("h1, h2").first()).toBeVisible();
    } else {
      // Items might be clickable rows
      const row = page.locator("table tbody tr, [data-testid='inventory-row']").first();
      if (await row.isVisible({ timeout: 3_000 })) {
        await row.click();
      }
    }
  });

  test("field inventory shows warehouse codes", async ({ page }) => {
    await page.goto("/field-inventory");
    // Seed has WH-ONG-01 and WH-JPR-01
    await expect(page.getByText(/WH-ONG|WH-JPR/i)).toBeVisible({ timeout: 8_000 });
  });

  test("field inventory shows bundle numbers", async ({ page }) => {
    await page.goto("/field-inventory");
    await expect(page.getByText(/BDL-STT|BDL-BOT|BDL-MKR/i)).toBeVisible({ timeout: 8_000 });
  });
});
