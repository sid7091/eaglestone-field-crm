import { test, expect } from "@playwright/test";

// Direct API tests — test the Next.js API routes in isolation
test.describe("API Routes", () => {
  test("GET /api/auth/me returns current user", async ({ request }) => {
    const res = await request.get("/api/auth/me");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.user).toBeTruthy();
    expect(data.user.email).toBe("admin@eaglestone.in");
  });

  test("GET /api/customers returns list", async ({ request }) => {
    const res = await request.get("/api/customers");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.data)).toBeTruthy();
    expect(data.data.length).toBeGreaterThanOrEqual(5);
  });

  test("GET /api/customers returns correct fields", async ({ request }) => {
    const res = await request.get("/api/customers");
    const body = await res.json();
    const customer = body.data.find((c: { businessName: string }) => c.businessName === "Rajasthan Marble House");
    expect(customer).toBeTruthy();
    expect(customer.tier).toBe("GOLD");
    expect(customer.leadStatus).toBe("QUALIFIED");
    expect(customer.regionCode).toBe("RJ");
  });

  test("GET /api/blocks returns all blocks", async ({ request }) => {
    const res = await request.get("/api/blocks");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.data.length).toBeGreaterThanOrEqual(4);
  });

  test("GET /api/blocks?status=RECEIVED filters correctly", async ({ request }) => {
    const res = await request.get("/api/blocks?status=RECEIVED");
    expect(res.status()).toBe(200);
    const data = await res.json();
    data.data.forEach((b: { status: string }) => expect(b.status).toBe("RECEIVED"));
  });

  test("GET /api/machines returns all machines", async ({ request }) => {
    const res = await request.get("/api/machines");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.data.length).toBeGreaterThanOrEqual(6);
  });

  test("GET /api/machines?type=GANG_SAW filters by type", async ({ request }) => {
    const res = await request.get("/api/machines?type=GANG_SAW");
    const data = await res.json();
    data.data.forEach((m: { type: string }) => expect(m.type).toBe("GANG_SAW"));
    expect(data.data.length).toBeGreaterThanOrEqual(2);
  });

  test("GET /api/production/gang-saw returns entries", async ({ request }) => {
    const res = await request.get("/api/production/gang-saw");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.data.length).toBeGreaterThanOrEqual(2);
    const first = data.data.find((e: { entryNumber: string }) => e.entryNumber === "GS-2026-0001");
    expect(first).toBeTruthy();
    expect(first.status).toBe("COMPLETED");
  });

  test("GET /api/production/epoxy returns entries", async ({ request }) => {
    const res = await request.get("/api/production/epoxy");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.data.length).toBeGreaterThanOrEqual(8);
  });

  test("GET /api/production/polishing returns entries", async ({ request }) => {
    const res = await request.get("/api/production/polishing");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.data.length).toBeGreaterThanOrEqual(6);
  });

  test("GET /api/inventory returns items with warehouse", async ({ request }) => {
    const res = await request.get("/api/inventory");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.data.length).toBeGreaterThanOrEqual(4);
    expect(data.data[0].warehouse).toBeTruthy();
    expect(data.data[0].slab).toBeTruthy();
  });

  test("GET /api/visits returns visits with customer info", async ({ request }) => {
    const res = await request.get("/api/visits");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.data.length).toBeGreaterThanOrEqual(4);
    const fake = data.data.find((v: { status: string }) => v.status === "FLAGGED_FAKE");
    expect(fake).toBeTruthy();
  });

  test("GET /api/analytics/pipeline returns pipeline data", async ({ request }) => {
    const res = await request.get("/api/analytics/pipeline");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.data).toBeTruthy();
    const qualified = data.data.find((d: { status: string }) => d.status === "QUALIFIED");
    expect(qualified).toBeTruthy();
    expect(qualified.count).toBeGreaterThanOrEqual(1);
  });

  test("GET /api/analytics/field-summary returns metrics", async ({ request }) => {
    const res = await request.get("/api/analytics/field-summary");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toBeTruthy();
  });

  test("POST /api/customers - creates customer", async ({ request }) => {
    const res = await request.post("/api/customers", {
      data: {
        businessName: `API Test Customer ${Date.now()}`,
        phone: "+91-9111111111",
        customerType: "DEALER",
        regionCode: "MH",
        district: "Pune",
        address: "1 Test Road, Pune",
        tier: "BRONZE",
        leadStatus: "NEW",
      },
    });
    expect(res.status()).toBe(201);
    const data = await res.json();
    expect(data.businessName).toMatch(/API Test Customer/);
  });

  test("POST /api/customers - rejects missing required fields", async ({ request }) => {
    const res = await request.post("/api/customers", {
      data: { businessName: "Incomplete Customer" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });

  test("POST /api/machines - creates machine", async ({ request }) => {
    const res = await request.post("/api/machines", {
      data: {
        name: `API Test Machine ${Date.now()}`,
        code: `API-TEST-${Date.now()}`,
        type: "GANG_SAW",
      },
    });
    expect(res.status()).toBe(201);
  });

  test("POST /api/machines - rejects duplicate code", async ({ request }) => {
    const res = await request.post("/api/machines", {
      data: { name: "Dupe", code: "GS-01", type: "GANG_SAW" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("GET /api/places/reverse-geocode returns address for coordinates", async ({ request }) => {
    const res = await request.get("/api/places/reverse-geocode?lat=26.9124&lng=75.7873");
    expect(res.status()).toBe(200);
    const data = await res.json();
    // Should have address from Nominatim at minimum
    expect(data.address || data.error).toBeTruthy();
    if (data.address) {
      // Should be somewhere in Rajasthan/Jaipur area
      expect(data.state || data.address).toMatch(/Rajasthan|Jaipur/i);
    }
  });

  test("GET /api/places/reverse-geocode - missing params returns 400", async ({ request }) => {
    const res = await request.get("/api/places/reverse-geocode");
    expect(res.status()).toBe(400);
  });

  test("POST /api/auth/logout clears session", async ({ request }) => {
    const res = await request.post("/api/auth/logout");
    expect([200, 204]).toContain(res.status());
  });

  test("unauthenticated GET /api/customers returns 401", async ({ playwright }) => {
    const context = await playwright.request.newContext({ baseURL: "http://localhost:3456" });
    const res = await context.get("/api/customers");
    expect(res.status()).toBe(401);
    await context.dispose();
  });
});
