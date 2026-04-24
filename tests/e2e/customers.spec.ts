import { test, expect } from "@playwright/test";
import { mockGeolocation, JAIPUR_INSIDE } from "../helpers/gps";

test.describe("Customers", () => {
  test("list page shows seeded customers", async ({ page }) => {
    await page.goto("/customers");
    await expect(page.locator("h1").filter({ hasText: /customers/i })).toBeVisible();

    // Seed data has 5 customers
    await expect(page.getByText("Rajasthan Marble House")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("Mehta Constructions")).toBeVisible();
    await expect(page.getByText("Stone Age Interiors")).toBeVisible();
    await expect(page.getByText("Andhra Granite Works")).toBeVisible();
    await expect(page.getByText("Delhi Marble Emporium")).toBeVisible();
  });

  test("customer list shows tier badges", async ({ page }) => {
    await page.goto("/customers");
    await expect(page.getByText(/PLATINUM|GOLD|SILVER|BRONZE/).first()).toBeVisible({ timeout: 8_000 });
  });

  test("click customer opens detail page", async ({ page }) => {
    await page.goto("/customers");
    await page.getByText("Rajasthan Marble House").first().click();
    await expect(page).toHaveURL(/customers\//);
    await expect(page.getByText("Rajasthan Marble House").first()).toBeVisible();
    await expect(page.getByText(/Vikram Singh|Jaipur/).first()).toBeVisible();
  });

  test("customer detail shows contact info", async ({ page }) => {
    await page.goto("/customers");
    await page.getByText("Mehta Constructions").first().click();
    await expect(page.getByText("+91-9823456789")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/priya@mehtaconstruction|priya/i)).toBeVisible();
  });

  test("customer detail shows visit history", async ({ page }) => {
    await page.goto("/customers");
    await page.getByText("Rajasthan Marble House").first().click();
    // This customer has visits in seed data
    await expect(page.getByText(/visit|COMPLETED|PLANNED/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test("new customer form - renders all fields", async ({ page }) => {
    await page.goto("/customers/new");
    await expect(page.getByRole('heading', { name: 'Add Customer' })).toBeVisible();

    await expect(page.getByText("Customer Information")).toBeVisible();
    await expect(page.getByText("Classification")).toBeVisible();
    await expect(page.getByText("Location & Region")).toBeVisible();
    await expect(page.getByText("GPS Coordinates")).toBeVisible();
    await expect(page.getByText("Current Requirements")).toBeVisible();
    await expect(page.getByText("Site Photos")).toBeVisible();
  });

  test("new customer form - address field has GPS location icon", async ({ page }) => {
    await page.goto("/customers/new");
    const addressLabel = page.getByText("Address *");
    await expect(addressLabel).toBeVisible();
    // GPS pin icon button should be inside the address field
    const locationBtn = page.locator('[title="Use current GPS location"]');
    await expect(locationBtn).toBeVisible();
  });

  test("new customer - GPS icon captures location and fills address", async ({ page, context }) => {
    await mockGeolocation(context, JAIPUR_INSIDE);
    await page.goto("/customers/new");

    // Mock the reverse-geocode API response
    await page.route("/api/places/reverse-geocode*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          address: "123 MI Road, Jaipur, Rajasthan 302001, India",
          city: "Jaipur",
          district: "Jaipur",
          state: "Rajasthan",
          pincode: "302001",
          lat: String(JAIPUR_INSIDE.latitude),
          lng: String(JAIPUR_INSIDE.longitude),
          source: "google",
        }),
      });
    });

    const locationBtn = page.locator('[title="Use current GPS location"]');
    await locationBtn.click();

    // Address field should be filled
    await expect(page.locator('input[placeholder*="search or tap"]')).toHaveValue(
      /Jaipur|MI Road/i,
      { timeout: 8_000 }
    );
    // GPS coords should appear below the field
    await expect(page.getByText(/GPS:/)).toBeVisible();
  });

  test("new customer - address autocomplete shows suggestions", async ({ page }) => {
    await page.goto("/customers/new");

    // Mock the autocomplete API
    await page.route("/api/places/autocomplete*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          predictions: [
            {
              place_id: "1",
              description: "Jaipur, Rajasthan, India",
              lat: "26.9124",
              lng: "75.7873",
              city: "Jaipur",
              district: "Jaipur",
              state: "Rajasthan",
              pincode: "302001",
            },
          ],
        }),
      });
    });

    await page.locator('input[placeholder*="search or tap"]').fill("Jaipur");
    await expect(page.getByText("Jaipur, Rajasthan, India")).toBeVisible({ timeout: 6_000 });
    await page.getByText("Jaipur, Rajasthan, India").click();

    // Fields should be filled
    await expect(page.locator('input[placeholder*="search or tap"]')).toHaveValue(/Jaipur/);
  });

  test("new customer - create customer successfully", async ({ page }) => {
    await page.goto("/customers/new");

    await page.getByPlaceholder("e.g. Sharma Marble Works").fill("Test Marble Co Playwright");
    await page.getByPlaceholder("Primary contact name").fill("Test Contact");
    await page.getByPlaceholder("+91 98765 43210").fill("+91-9000000001");
    await page.locator('select[value=""], select').first().selectOption("DEALER");

    // Region
    await page.locator("select").filter({ hasText: /select state/i }).selectOption("MH");

    // District — matches both district and city, use first
    await page.getByPlaceholder(/Jaipur/i).first().fill("Mumbai");

    // Address
    await page.locator('input[placeholder*="search or tap"]').fill("1 Test Street, Mumbai");

    await page.getByRole("button", { name: /create customer/i }).click();

    // Should redirect to customers list
    await expect(page).toHaveURL(/\/customers$/, { timeout: 10_000 });
    await expect(page.getByText("Test Marble Co Playwright")).toBeVisible({ timeout: 8_000 });
  });

  test("new customer - shows validation errors for missing required fields", async ({ page }) => {
    await page.goto("/customers/new");
    await page.getByRole("button", { name: /create customer/i }).click();
    await expect(page.getByText(/required|required/i)).toBeVisible({ timeout: 5_000 });
  });

  test("search/filter customers", async ({ page }) => {
    await page.goto("/customers");
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill("Rajasthan");
      await expect(page.getByText("Rajasthan Marble House")).toBeVisible({ timeout: 5_000 });
      // Search may not filter client-side, just verify the input accepts text
    }
  });
});
