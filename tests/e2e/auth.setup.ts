import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../.auth/user.json");

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByText("SIGN IN TO YOUR ACCOUNT")).toBeVisible();

  await page.getByPlaceholder("admin@eaglestone.in").fill("admin@eaglestone.in");
  await page.getByPlaceholder("Enter password").fill("admin123");
  await page.getByRole("button", { name: /sign in/i }).click();

  // Should redirect to field dashboard after login
  await expect(page).toHaveURL(/field-dashboard/, { timeout: 10_000 });

  await page.context().storageState({ path: authFile });
});
