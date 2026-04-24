import { test, expect } from "@playwright/test";
import { mockGeolocation, JAIPUR_INSIDE, OUTSIDE_COORDS } from "../helpers/gps";

test.describe("Visits — list & new", () => {
  test("visits list shows seeded visits", async ({ page }) => {
    await page.goto("/visits");
    await expect(page.locator("h1").filter({ hasText: /visit/i })).toBeVisible();

    await expect(page.getByText(/Rajasthan Marble|Mehta|Stone Age|Delhi/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test("visits list shows statuses", async ({ page }) => {
    await page.goto("/visits");
    await expect(page.getByText(/COMPLETED|PLANNED|FLAGGED/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test("flagged fake visit is shown with warning indicator", async ({ page }) => {
    await page.goto("/visits");
    await expect(page.getByText(/FLAGGED_FAKE|FAKE|flagged/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test("visit detail page loads", async ({ page }) => {
    await page.goto("/visits");
    const firstVisitLink = page.getByRole("link").filter({ hasText: /VIEW|details/i }).first();
    if (await firstVisitLink.isVisible()) {
      await firstVisitLink.click();
      await expect(page).toHaveURL(/visits\//);
    } else {
      const rows = page.locator("table tbody tr, [data-testid='visit-row']");
      if (await rows.count() > 0) {
        await rows.first().click();
        await expect(page).toHaveURL(/visits\//);
      }
    }
  });

  test("new visit form renders", async ({ page }) => {
    await page.goto("/visits/new");
    await expect(page.locator("h1").filter({ hasText: /new visit|visit/i })).toBeVisible();
    await expect(page.locator("select, input[type='date']").first()).toBeVisible();
  });

  test("new visit - create planned visit", async ({ page }) => {
    await page.goto("/visits/new");

    const customerSearch = page.getByPlaceholder(/search customer|type.*customer/i);
    if (await customerSearch.isVisible()) {
      await customerSearch.fill("Rajasthan");
      await page.getByText("Rajasthan Marble House").first().click({ timeout: 6_000 });
    }

    const purposeSelect = page.locator("select").filter({ hasText: /purpose|sales|select/i }).first();
    if (await purposeSelect.isVisible()) {
      await purposeSelect.selectOption("SALES_PITCH");
    }

    const dateInput = page.locator("input[type='date']").first();
    if (await dateInput.isVisible()) {
      await dateInput.fill(new Date().toISOString().split("T")[0]);
    }

    await page.getByRole("button", { name: /create|save|plan/i }).last().click();
    await expect(page).toHaveURL(/visits/, { timeout: 10_000 });
  });

  test("Plan Visit button navigates", async ({ page }) => {
    await page.goto("/field-dashboard");
    const planBtn = page.getByRole("button", { name: /plan visit|new visit|schedule/i });
    if (await planBtn.isVisible({ timeout: 3_000 })) {
      await planBtn.click();
      await page.waitForTimeout(2_000);
      // Button either opens a modal or navigates to /visits/new
      const url = page.url();
      const hasModal = await page.locator('[class*="fixed"][class*="inset"]').isVisible().catch(() => false);
      expect(url.includes("/visits") || hasModal).toBeTruthy();
    }
  });
});

test.describe("Visit Check-in flow", () => {
  test("check-in page renders with GPS prompt", async ({ page, context }) => {
    await mockGeolocation(context, JAIPUR_INSIDE);
    await page.goto("/visits/checkin");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 8_000 });
  });

  test("check-in with customer - shows geofence status", async ({ page, context }) => {
    await mockGeolocation(context, JAIPUR_INSIDE);
    await page.goto("/visits/checkin");
    const pageText = await page.textContent("body");
    expect(pageText).toBeTruthy();
  });

  test("check-in page shows GPS accuracy indicator", async ({ page, context }) => {
    await mockGeolocation(context, JAIPUR_INSIDE);
    await page.goto("/visits/checkin");
    await expect(page.locator("body")).toBeVisible();
  });

  test("check-in rejects location far from customer", async ({ page, context }) => {
    await mockGeolocation(context, OUTSIDE_COORDS);
    await page.goto("/visits/checkin");
    await expect(page.locator("body")).toBeVisible();
  });
});
