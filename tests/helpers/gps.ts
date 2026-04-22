import { BrowserContext } from "@playwright/test";

// Rajasthan Marble House (Jaipur) — matches seed customer1 location
export const JAIPUR_COORDS = { latitude: 26.9124, longitude: 75.7873, accuracy: 8 };
// Inside geofence of customer1 (within 100m)
export const JAIPUR_INSIDE = { latitude: 26.9125, longitude: 75.7874, accuracy: 8 };
// Far outside any geofence
export const OUTSIDE_COORDS = { latitude: 26.0, longitude: 75.0, accuracy: 45 };

export async function mockGeolocation(context: BrowserContext, coords = JAIPUR_INSIDE) {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(coords);
}
