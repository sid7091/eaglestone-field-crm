import type { GeoPoint, GeofenceValidation } from "../types/erp-metadata";

const EARTH_RADIUS_METERS = 6_371_000;
const DEFAULT_GEOFENCE_RADIUS_METERS = 100;

/**
 * Haversine formula — calculates great-circle distance between two GPS points.
 * Returns distance in meters.
 */
function haversineDistance(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const sinHalfDLat = Math.sin(dLat / 2);
  const sinHalfDLon = Math.sin(dLon / 2);

  const h =
    sinHalfDLat * sinHalfDLat +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      sinHalfDLon *
      sinHalfDLon;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export interface GeofenceCheckResult {
  isValid: boolean;
  distanceMeters: number;
  validation: GeofenceValidation;
  flags: string[];
}

/**
 * Validates that a field rep's check-in location is within the configured
 * geofence radius of the customer's registered location.
 *
 * Anti-fraud checks:
 * 1. Distance from customer location must be ≤ geofence radius (default 100m)
 * 2. GPS accuracy must be reasonable (≤ 50m) to prevent spoofed low-accuracy readings
 * 3. If checkout location provided, it must also be within radius
 * 4. Time between checkin and checkout must be ≥ 2 minutes (prevents drive-by checkins)
 */
export function validateGeofence(
  customerLocation: GeoPoint,
  checkinLocation: GeoPoint,
  checkoutLocation?: GeoPoint,
  checkinTime?: Date,
  checkoutTime?: Date,
  radiusMeters: number = DEFAULT_GEOFENCE_RADIUS_METERS
): GeofenceCheckResult {
  const flags: string[] = [];

  // Calculate distance from customer
  const distanceMeters = haversineDistance(customerLocation, checkinLocation);
  const isWithinRadius = distanceMeters <= radiusMeters;

  if (!isWithinRadius) {
    flags.push(
      `OUTSIDE_GEOFENCE: ${Math.round(distanceMeters)}m from customer (limit: ${radiusMeters}m)`
    );
  }

  // Flag poor GPS accuracy (potential spoofing indicator)
  if (checkinLocation.accuracy && checkinLocation.accuracy > 50) {
    flags.push(
      `LOW_GPS_ACCURACY: ${checkinLocation.accuracy}m (threshold: 50m)`
    );
  }

  // Validate checkout location if provided
  let checkoutValid = true;
  if (checkoutLocation) {
    const checkoutDistance = haversineDistance(
      customerLocation,
      checkoutLocation
    );
    if (checkoutDistance > radiusMeters * 2) {
      // Allow 2x radius for checkout (rep may have walked to vehicle)
      flags.push(
        `CHECKOUT_FAR: ${Math.round(checkoutDistance)}m from customer at checkout`
      );
      checkoutValid = false;
    }
  }

  // Minimum visit duration check (prevent instant check-in/check-out fraud)
  if (checkinTime && checkoutTime) {
    const durationMs = checkoutTime.getTime() - checkinTime.getTime();
    const durationMinutes = durationMs / 60_000;
    if (durationMinutes < 2) {
      flags.push(
        `SUSPICIOUS_DURATION: ${durationMinutes.toFixed(1)} minutes (minimum: 2)`
      );
    }
  }

  const validation: GeofenceValidation = {
    customerLocation,
    checkinLocation,
    checkoutLocation,
    distanceFromCustomerMeters: Math.round(distanceMeters * 100) / 100,
    isWithinGeofence: isWithinRadius,
    geofenceRadiusMeters: radiusMeters,
    validationTimestamp: new Date().toISOString(),
  };

  return {
    isValid: isWithinRadius && checkoutValid && flags.length === 0,
    distanceMeters: Math.round(distanceMeters * 100) / 100,
    validation,
    flags,
  };
}

/**
 * Batch-validates multiple visits for a field rep (e.g., daily route audit).
 * Returns visits that failed geofence validation.
 */
export function auditVisitRoute(
  visits: Array<{
    visitId: string;
    customerLocation: GeoPoint;
    checkinLocation: GeoPoint;
    checkoutLocation?: GeoPoint;
    checkinTime?: Date;
    checkoutTime?: Date;
  }>,
  radiusMeters: number = DEFAULT_GEOFENCE_RADIUS_METERS
): Array<{ visitId: string; result: GeofenceCheckResult }> {
  return visits
    .map((v) => ({
      visitId: v.visitId,
      result: validateGeofence(
        v.customerLocation,
        v.checkinLocation,
        v.checkoutLocation,
        v.checkinTime,
        v.checkoutTime,
        radiusMeters
      ),
    }))
    .filter((r) => !r.result.isValid);
}
