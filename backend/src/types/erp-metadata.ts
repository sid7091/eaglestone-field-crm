/**
 * JSONB metadata schema for ERP backward integration.
 * Every core entity stores external ERP reference IDs in this structure.
 */
export interface ErpMetadata {
  /** External ERP system name (e.g., "odoo", "sap_b1", "tally") */
  erpSystem?: string;

  /** External reference ID in the ERP system */
  erpReferenceId?: string;

  /** Secondary external ID (e.g., SAP Business Partner number) */
  erpSecondaryId?: string;

  /** Timestamp of last successful sync to/from ERP */
  lastSyncedAt?: string;

  /** Version/revision counter for optimistic conflict resolution */
  syncVersion?: number;

  /** Arbitrary key-value pairs for ERP-specific fields */
  customFields?: Record<string, unknown>;
}

/**
 * Geolocation data captured during visits.
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
  accuracy?: number;      // GPS accuracy in meters
  altitude?: number;
  timestamp: string;       // ISO 8601
}

/**
 * Visit geofence validation result stored alongside each visit.
 */
export interface GeofenceValidation {
  customerLocation: GeoPoint;
  checkinLocation: GeoPoint;
  checkoutLocation?: GeoPoint;
  distanceFromCustomerMeters: number;
  isWithinGeofence: boolean;
  geofenceRadiusMeters: number;
  validationTimestamp: string;
}
