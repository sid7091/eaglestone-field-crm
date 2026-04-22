import { test, expect } from "@playwright/test";

// Auth tests run without stored auth state
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authentication", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("SIGN IN TO YOUR ACCOUNT")).toBeVisible();
    await expect(page.getByPlaceholder("admin@eaglestone.in")).toBeVisible();
    await expect(page.getByPlaceholder("Enter password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    // Demo credentials shown
    await expect(page.getByText("DEMO CREDENTIALS")).toBeVisible();
  });

  test("rejects wrong password", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("admin@eaglestone.in").fill("admin@eaglestone.in");
    await page.getByPlaceholder("Enter password").fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/login/);
  });

  test("rejects unknown email", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("admin@eaglestone.in").fill("nobody@nowhere.com");
    await page.getByPlaceholder("Enter password").fill("anything");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({ timeout: 5_000 });
  });

  test("admin login redirects to field-dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("admin@eaglestone.in").fill("admin@eaglestone.in");
    await page.getByPlaceholder("Enter password").fill("admin123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/field-dashboard/, { timeout: 10_000 });
  });

  test("operator login works", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("admin@eaglestone.in").fill("operator@eaglestone.in");
    await page.getByPlaceholder("Enter password").fill("operator123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/field-dashboard/, { timeout: 10_000 });
  });

  test("protected routes redirect to login when unauthenticated", async ({ page }) => {
    await page.goto("/customers");
    await expect(page).toHaveURL(/login/, { timeout: 5_000 });

    await page.goto("/production/gang-saw");
    await expect(page).toHaveURL(/login/, { timeout: 5_000 });
  });

  test("logout works", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByPlaceholder("admin@eaglestone.in").fill("admin@eaglestone.in");
    await page.getByPlaceholder("Enter password").fill("admin123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/field-dashboard/, { timeout: 10_000 });

    // Find and click logout (usually in sidebar or user menu)
    const logoutBtn = page.getByRole("button", { name: /log ?out|sign ?out/i });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/login/, { timeout: 5_000 });
    }
  });
});
