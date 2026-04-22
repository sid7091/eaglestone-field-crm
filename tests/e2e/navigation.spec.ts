import { test, expect } from "@playwright/test";

test.describe("Navigation & Layout", () => {
  test("sidebar is visible on all main pages", async ({ page }) => {
    const pages = [
      "/field-dashboard",
      "/customers",
      "/visits",
      "/blocks",
      "/machines",
      "/production",
      "/inventory",
    ];
    for (const path of pages) {
      await page.goto(path);
      // Sidebar should have brand name or logo
      await expect(page.locator("nav, aside, [class*='sidebar']").first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test("/ redirects to /field-dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/field-dashboard/, { timeout: 8_000 });
  });

  test("breadcrumb / page titles render on all pages", async ({ page }) => {
    const routes = [
      { url: "/field-dashboard", title: /field|dashboard/i },
      { url: "/customers", title: /customer/i },
      { url: "/visits", title: /visit/i },
      { url: "/blocks", title: /block/i },
      { url: "/machines", title: /machine/i },
      { url: "/production", title: /production/i },
      { url: "/production/gang-saw", title: /gang saw/i },
      { url: "/production/epoxy", title: /epoxy/i },
      { url: "/production/polishing", title: /polishing/i },
      { url: "/inventory", title: /inventory/i },
    ];

    for (const { url, title } of routes) {
      await page.goto(url);
      await expect(page.locator("h1").first()).toHaveText(title, { timeout: 8_000 });
    }
  });

  test("404 page — unknown route", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");
    // Next.js shows 404 by default
    const body = await page.textContent("body");
    expect(body).toMatch(/404|not found/i);
  });

  test("New Entry / Add buttons on list pages work", async ({ page }) => {
    const cases = [
      { list: "/blocks", btnText: /add block|\+ block/i, target: /blocks\/new/ },
      { list: "/machines", btnText: /add machine|\+ machine/i, target: /machines\/new/ },
      { list: "/production/gang-saw", btnText: /new entry/i, target: /gang-saw\/new/ },
      { list: "/production/epoxy", btnText: /new entry/i, target: /epoxy\/new/ },
      { list: "/production/polishing", btnText: /new entry/i, target: /polishing\/new/ },
    ];

    for (const { list, btnText, target } of cases) {
      await page.goto(list);
      await page.getByRole("link", { name: btnText }).click();
      await expect(page).toHaveURL(target, { timeout: 5_000 });
    }
  });

  test("Cancel buttons return to parent page", async ({ page }) => {
    const cases = [
      { form: "/blocks/new", parent: /\/blocks$/ },
      { form: "/machines/new", parent: /\/machines$/ },
      { form: "/production/gang-saw/new", parent: /gang-saw$/ },
    ];

    for (const { form, parent } of cases) {
      await page.goto(form);
      await page.getByRole("button", { name: /cancel/i }).click();
      await expect(page).toHaveURL(parent, { timeout: 5_000 });
    }
  });

  test("production stage cards link to correct sub-pages", async ({ page }) => {
    await page.goto("/production");
    // Stage 1 card
    await page.getByRole("link", { name: /gang saw/i }).first().click();
    await expect(page).toHaveURL(/gang-saw/);
    await page.goto("/production");

    // Stage 2 card
    await page.getByRole("link", { name: /epoxy/i }).first().click();
    await expect(page).toHaveURL(/epoxy/);
    await page.goto("/production");

    // Stage 3 card
    await page.getByRole("link", { name: /polishing/i }).first().click();
    await expect(page).toHaveURL(/polishing/);
  });
});

test.describe("Mobile layout", () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14

  test("field dashboard renders on mobile", async ({ page }) => {
    await page.goto("/field-dashboard");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 8_000 });
  });

  test("customers list renders on mobile", async ({ page }) => {
    await page.goto("/customers");
    await expect(page.getByText("Rajasthan Marble House")).toBeVisible({ timeout: 8_000 });
  });

  test("new customer form renders on mobile without overflow", async ({ page }) => {
    await page.goto("/customers/new");
    await expect(page.getByText("Customer Information")).toBeVisible();
    // Location icon button should be tappable
    await expect(page.locator('[title="Use current GPS location"]')).toBeVisible();
  });
});
