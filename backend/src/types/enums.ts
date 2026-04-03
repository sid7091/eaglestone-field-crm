/**
 * Region codes for multi-tenant/state partitioning across pan-India operations.
 */
export enum RegionCode {
  AP = "AP",   // Andhra Pradesh
  AR = "AR",   // Arunachal Pradesh
  AS = "AS",   // Assam
  BR = "BR",   // Bihar
  CG = "CG",   // Chhattisgarh
  GA = "GA",   // Goa
  GJ = "GJ",   // Gujarat
  HR = "HR",   // Haryana
  HP = "HP",   // Himachal Pradesh
  JH = "JH",   // Jharkhand
  KA = "KA",   // Karnataka
  KL = "KL",   // Kerala
  MP = "MP",   // Madhya Pradesh
  MH = "MH",   // Maharashtra
  MN = "MN",   // Manipur
  ML = "ML",   // Meghalaya
  MZ = "MZ",   // Mizoram
  NL = "NL",   // Nagaland
  OD = "OD",   // Odisha
  PB = "PB",   // Punjab
  RJ = "RJ",   // Rajasthan
  SK = "SK",   // Sikkim
  TN = "TN",   // Tamil Nadu
  TG = "TG",   // Telangana
  TR = "TR",   // Tripura
  UP = "UP",   // Uttar Pradesh
  UK = "UK",   // Uttarakhand
  WB = "WB",   // West Bengal
  DL = "DL",   // Delhi
  JK = "JK",   // Jammu & Kashmir
}

export enum UserRole {
  ADMIN = "ADMIN",
  REGIONAL_MANAGER = "REGIONAL_MANAGER",
  AREA_MANAGER = "AREA_MANAGER",
  FIELD_REP = "FIELD_REP",
  VIEWER = "VIEWER",
}

export enum CustomerType {
  DEALER = "DEALER",
  ARCHITECT = "ARCHITECT",
  BUILDER = "BUILDER",
  CONTRACTOR = "CONTRACTOR",
  DIRECT_CLIENT = "DIRECT_CLIENT",
  QUARRY_OWNER = "QUARRY_OWNER",
}

export enum CustomerTier {
  PLATINUM = "PLATINUM",
  GOLD = "GOLD",
  SILVER = "SILVER",
  BRONZE = "BRONZE",
}

export enum LeadStatus {
  NEW = "NEW",
  CONTACTED = "CONTACTED",
  QUALIFIED = "QUALIFIED",
  PROPOSAL_SENT = "PROPOSAL_SENT",
  NEGOTIATION = "NEGOTIATION",
  WON = "WON",
  LOST = "LOST",
  DORMANT = "DORMANT",
}

export enum VisitStatus {
  PLANNED = "PLANNED",
  CHECKED_IN = "CHECKED_IN",
  IN_PROGRESS = "IN_PROGRESS",
  CHECKED_OUT = "CHECKED_OUT",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  FLAGGED_FAKE = "FLAGGED_FAKE",
}

export enum VisitPurpose {
  SALES_PITCH = "SALES_PITCH",
  SAMPLE_DELIVERY = "SAMPLE_DELIVERY",
  ORDER_FOLLOWUP = "ORDER_FOLLOWUP",
  COMPLAINT_RESOLUTION = "COMPLAINT_RESOLUTION",
  PAYMENT_COLLECTION = "PAYMENT_COLLECTION",
  RELATIONSHIP_BUILDING = "RELATIONSHIP_BUILDING",
  SITE_SURVEY = "SITE_SURVEY",
}

export enum InventoryStatus {
  IN_STOCK = "IN_STOCK",
  RESERVED = "RESERVED",
  IN_TRANSIT = "IN_TRANSIT",
  DELIVERED = "DELIVERED",
  RETURNED = "RETURNED",
  DAMAGED = "DAMAGED",
}

export enum SyncStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  DEAD_LETTER = "DEAD_LETTER",
}

export enum SyncEntityType {
  CUSTOMER = "CUSTOMER",
  VISIT = "VISIT",
  INVENTORY = "INVENTORY",
  USER = "USER",
  ORDER = "ORDER",
}

export enum SyncDirection {
  OUTBOUND = "OUTBOUND",  // CRM → ERP
  INBOUND = "INBOUND",    // ERP → CRM
}
