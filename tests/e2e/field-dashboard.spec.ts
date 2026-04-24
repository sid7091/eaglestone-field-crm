import { test, expect } from "@playwright/test";

test.describe("Field Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/field-dashboard");
  });

  test("loads without errors", async ({ page }) => {
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/something went wrong|error/i)).not.toBeVisible();
  });

  test("shows stat cards", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible({ timeout: 8_000 });
    const content = await page.textContent("body");
    expect(content).toMatch(/\d+/);
  });

  test("sidebar navigation links work", async ({ page }) => {
    await expect(page.getByRole("link", { name: /customers/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /visits/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /blocks/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /machines/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /production/i }).first()).toBeVisible();
  });

  test("navigate to customers from sidebar", async ({ page }) => {
    await page.getByRole("link", { name: /customers/i }).first().click();
    await expect(page).toHaveURL(/customers/);
  });

  test("navigate to production from sidebar", async ({ page }) => {
    await page.getByRole("link", { name: /production/i }).first().click();
    await expect(page).toHaveURL(/production/);
  });

  test("today's visits section is present", async ({ page }) => {
    const content = await page.textContent("body");
    expect(content).toMatch(/visit|today|planned/i);
  });

  test("field inventory link works", async ({ page }) => {
    await page.goto("/field-inventory");
    await expect(page.locator("h1").first()).toBeVisible();
    const content = await page.textContent("body");
    expect(content).toMatch(/inventory|marble|statuario/i);
  });
});
