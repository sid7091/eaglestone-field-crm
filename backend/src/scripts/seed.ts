import "reflect-metadata";
import { AppDataSource } from "../config/database";
import { User } from "../entities/User";
import { Customer } from "../entities/Customer";
import { Visit } from "../entities/Visit";
import { Inventory } from "../entities/Inventory";
import {
  RegionCode,
  UserRole,
  CustomerType,
  CustomerTier,
  LeadStatus,
  VisitStatus,
  VisitPurpose,
  InventoryStatus,
} from "../types/enums";
import * as bcrypt from "bcryptjs";

const SEED_PASSWORD = "eaglestone2024";

async function seed() {
  await AppDataSource.initialize();
  console.log("[Seed] Database connected");

  const userRepo = AppDataSource.getRepository(User);
  const customerRepo = AppDataSource.getRepository(Customer);
  const visitRepo = AppDataSource.getRepository(Visit);
  const inventoryRepo = AppDataSource.getRepository(Inventory);

  // Check if already seeded
  const existingUsers = await userRepo.count();
  if (existingUsers > 0) {
    console.log("[Seed] Database already has data, skipping seed");
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  // ─── Users ──────────────────────────────────────────────────
  console.log("[Seed] Creating users...");
  const users = await userRepo.save([
    {
      email: "admin@eaglestone.in",
      passwordHash,
      fullName: "Rajesh Agarwal",
      phone: "+919876543210",
      role: UserRole.ADMIN,
      regionCode: RegionCode.RJ,
      district: "Udaipur",
      isActive: true,
      erpMetadata: {},
    },
    {
      email: "rm.rajasthan@eaglestone.in",
      passwordHash,
      fullName: "Vikram Singh",
      phone: "+919876543211",
      role: UserRole.REGIONAL_MANAGER,
      regionCode: RegionCode.RJ,
      district: "Jaipur",
      territory: "North Rajasthan",
      isActive: true,
      erpMetadata: {},
    },
    {
      email: "rep.jaipur@eaglestone.in",
      passwordHash,
      fullName: "Amit Sharma",
      phone: "+919876543212",
      role: UserRole.FIELD_REP,
      regionCode: RegionCode.RJ,
      district: "Jaipur",
      territory: "Jaipur Metro",
      isActive: true,
      erpMetadata: {},
    },
    {
      email: "rep.bangalore@eaglestone.in",
      passwordHash,
      fullName: "Priya Reddy",
      phone: "+919876543213",
      role: UserRole.FIELD_REP,
      regionCode: RegionCode.KA,
      district: "Bengaluru Urban",
      territory: "Bangalore South",
      isActive: true,
      erpMetadata: {},
    },
    {
      email: "rm.karnataka@eaglestone.in",
      passwordHash,
      fullName: "Suresh Kumar",
      phone: "+919876543214",
      role: UserRole.REGIONAL_MANAGER,
      regionCode: RegionCode.KA,
      district: "Bengaluru Urban",
      isActive: true,
      erpMetadata: {},
    },
    {
      email: "rep.hyderabad@eaglestone.in",
      passwordHash,
      fullName: "Ravi Teja",
      phone: "+919876543215",
      role: UserRole.FIELD_REP,
      regionCode: RegionCode.AP,
      district: "Hyderabad",
      territory: "Hyderabad Central",
      isActive: true,
      erpMetadata: {},
    },
    {
      email: "rep.mumbai@eaglestone.in",
      passwordHash,
      fullName: "Neha Patil",
      phone: "+919876543216",
      role: UserRole.FIELD_REP,
      regionCode: RegionCode.MH,
      district: "Mumbai",
      territory: "Mumbai South",
      isActive: true,
      erpMetadata: {},
    },
  ]);

  const [admin, rmRJ, repJaipur, repBangalore, , repHyderabad, repMumbai] = users;

  // Set reporting hierarchy
  await userRepo.update(rmRJ.id, { reportsTo: admin.id });
  await userRepo.update(repJaipur.id, { reportsTo: rmRJ.id });

  // ─── Customers ──────────────────────────────────────────────
  console.log("[Seed] Creating customers...");
  const customers = await customerRepo.save([
    // Rajasthan
    {
      businessName: "Sharma Marble Traders",
      contactPerson: "Dinesh Sharma",
      phone: "+919001234501",
      email: "dinesh@sharmamarble.com",
      gstin: "08AAACS1234A1Z5",
      customerType: CustomerType.DEALER,
      tier: CustomerTier.GOLD,
      leadStatus: LeadStatus.WON,
      regionCode: RegionCode.RJ,
      district: "Jaipur",
      city: "Jaipur",
      address: "42, Marble Market, MI Road, Jaipur",
      pincode: "302001",
      location: { latitude: 26.9124, longitude: 75.7873, accuracy: 10, timestamp: new Date().toISOString() },
      preferredMaterials: ["Italian Marble", "Statuario", "Calacatta"],
      annualPotentialINR: 5000000,
      lifetimeValueINR: 25000000,
      erpMetadata: { erpSystem: "odoo", erpReferenceId: "CUST-001" },
    },
    {
      businessName: "Royal Stones & Granites",
      contactPerson: "Karan Meena",
      phone: "+919001234502",
      customerType: CustomerType.BUILDER,
      tier: CustomerTier.PLATINUM,
      leadStatus: LeadStatus.NEGOTIATION,
      regionCode: RegionCode.RJ,
      district: "Udaipur",
      city: "Udaipur",
      address: "18, Industrial Area, Sukher, Udaipur",
      pincode: "313001",
      location: { latitude: 24.5854, longitude: 73.7125, accuracy: 15, timestamp: new Date().toISOString() },
      preferredMaterials: ["Indian Granite", "Black Galaxy"],
      annualPotentialINR: 12000000,
      erpMetadata: {},
    },
    // Karnataka
    {
      businessName: "Bangalore Stone Gallery",
      contactPerson: "Anand Rao",
      phone: "+919001234503",
      email: "anand@bsgallery.in",
      customerType: CustomerType.ARCHITECT,
      tier: CustomerTier.GOLD,
      leadStatus: LeadStatus.QUALIFIED,
      regionCode: RegionCode.KA,
      district: "Bengaluru Urban",
      city: "Bangalore",
      address: "22, Hosur Road, Koramangala, Bangalore",
      pincode: "560034",
      location: { latitude: 12.9352, longitude: 77.6245, accuracy: 8, timestamp: new Date().toISOString() },
      preferredMaterials: ["Italian Marble", "Onyx", "Travertine"],
      annualPotentialINR: 8000000,
      erpMetadata: {},
    },
    {
      businessName: "Deccan Interiors Pvt Ltd",
      contactPerson: "Meera Nair",
      phone: "+919001234504",
      customerType: CustomerType.CONTRACTOR,
      tier: CustomerTier.SILVER,
      leadStatus: LeadStatus.PROPOSAL_SENT,
      regionCode: RegionCode.KA,
      district: "Bengaluru Urban",
      city: "Whitefield",
      address: "Block C, ITPL Main Road, Whitefield",
      pincode: "560066",
      location: { latitude: 12.9698, longitude: 77.7500, accuracy: 12, timestamp: new Date().toISOString() },
      preferredMaterials: ["Quartzite", "Turkish Marble"],
      annualPotentialINR: 3500000,
      erpMetadata: {},
    },
    // Andhra Pradesh
    {
      businessName: "Heritage Marble House",
      contactPerson: "Srinivas Reddy",
      phone: "+919001234505",
      email: "srinivas@heritagemarble.com",
      customerType: CustomerType.DEALER,
      tier: CustomerTier.GOLD,
      leadStatus: LeadStatus.WON,
      regionCode: RegionCode.AP,
      district: "Hyderabad",
      city: "Hyderabad",
      address: "155, Begumpet, Hyderabad",
      pincode: "500016",
      location: { latitude: 17.4432, longitude: 78.4729, accuracy: 10, timestamp: new Date().toISOString() },
      preferredMaterials: ["Indian Marble", "Makrana", "Ambaji"],
      annualPotentialINR: 6000000,
      lifetimeValueINR: 18000000,
      erpMetadata: {},
    },
    // Maharashtra
    {
      businessName: "Mumbai Marble Emporium",
      contactPerson: "Suresh Jain",
      phone: "+919001234506",
      customerType: CustomerType.DEALER,
      tier: CustomerTier.PLATINUM,
      leadStatus: LeadStatus.WON,
      regionCode: RegionCode.MH,
      district: "Mumbai",
      city: "Mumbai",
      address: "23, Crawford Market, Mumbai",
      pincode: "400001",
      location: { latitude: 18.9477, longitude: 72.8323, accuracy: 10, timestamp: new Date().toISOString() },
      preferredMaterials: ["Italian Marble", "Statuario", "Emperador"],
      annualPotentialINR: 15000000,
      lifetimeValueINR: 50000000,
      erpMetadata: {},
    },
    {
      businessName: "Quarry King Exports",
      contactPerson: "Anil Patil",
      phone: "+919001234507",
      customerType: CustomerType.QUARRY_OWNER,
      tier: CustomerTier.BRONZE,
      leadStatus: LeadStatus.NEW,
      regionCode: RegionCode.MH,
      district: "Pune",
      city: "Pune",
      address: "Hadapsar Industrial Estate, Pune",
      pincode: "411013",
      location: { latitude: 18.5074, longitude: 73.9313, accuracy: 20, timestamp: new Date().toISOString() },
      preferredMaterials: ["Granite"],
      annualPotentialINR: 2000000,
      erpMetadata: {},
    },
  ]);

  // ─── Visits ─────────────────────────────────────────────────
  console.log("[Seed] Creating visits...");
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split("T")[0];

  await visitRepo.save([
    // Completed visit with valid geofence
    {
      regionCode: RegionCode.RJ,
      visitDate: twoDaysAgo,
      purpose: VisitPurpose.SALES_PITCH,
      status: VisitStatus.COMPLETED,
      fieldRepId: repJaipur.id,
      customerId: customers[0].id,
      checkinTime: new Date(Date.now() - 172800000 + 36000000),
      checkoutTime: new Date(Date.now() - 172800000 + 39600000),
      durationMinutes: 60,
      checkinLocation: { latitude: 26.9126, longitude: 75.7875, accuracy: 8, timestamp: new Date().toISOString() },
      checkoutLocation: { latitude: 26.9125, longitude: 75.7874, accuracy: 10, timestamp: new Date().toISOString() },
      geofenceValidation: {
        customerLocation: { latitude: 26.9124, longitude: 75.7873, accuracy: 10, timestamp: new Date().toISOString() },
        checkinLocation: { latitude: 26.9126, longitude: 75.7875, accuracy: 8, timestamp: new Date().toISOString() },
        distanceFromCustomerMeters: 28.4,
        isWithinGeofence: true,
        geofenceRadiusMeters: 100,
        validationTimestamp: new Date().toISOString(),
      },
      summary: "Discussed new Statuario slab collection. Client interested in 50 slabs for upcoming project.",
      actionItems: "Send updated price list by Friday. Arrange sample delivery.",
      orderValueINR: 2500000,
      erpMetadata: {},
    },
    // Yesterday — flagged fake visit
    {
      regionCode: RegionCode.RJ,
      visitDate: yesterday,
      purpose: VisitPurpose.PAYMENT_COLLECTION,
      status: VisitStatus.FLAGGED_FAKE,
      fieldRepId: repJaipur.id,
      customerId: customers[1].id,
      checkinTime: new Date(Date.now() - 86400000 + 36000000),
      checkinLocation: { latitude: 24.6100, longitude: 73.7400, accuracy: 45, timestamp: new Date().toISOString() },
      geofenceValidation: {
        customerLocation: { latitude: 24.5854, longitude: 73.7125, accuracy: 15, timestamp: new Date().toISOString() },
        checkinLocation: { latitude: 24.6100, longitude: 73.7400, accuracy: 45, timestamp: new Date().toISOString() },
        distanceFromCustomerMeters: 3842,
        isWithinGeofence: false,
        geofenceRadiusMeters: 100,
        validationTimestamp: new Date().toISOString(),
      },
      erpMetadata: {},
    },
    // Today — planned visits
    {
      regionCode: RegionCode.KA,
      visitDate: today,
      purpose: VisitPurpose.SAMPLE_DELIVERY,
      status: VisitStatus.PLANNED,
      fieldRepId: repBangalore.id,
      customerId: customers[2].id,
      erpMetadata: {},
    },
    {
      regionCode: RegionCode.KA,
      visitDate: today,
      purpose: VisitPurpose.ORDER_FOLLOWUP,
      status: VisitStatus.PLANNED,
      fieldRepId: repBangalore.id,
      customerId: customers[3].id,
      erpMetadata: {},
    },
    {
      regionCode: RegionCode.AP,
      visitDate: today,
      purpose: VisitPurpose.RELATIONSHIP_BUILDING,
      status: VisitStatus.PLANNED,
      fieldRepId: repHyderabad.id,
      customerId: customers[4].id,
      erpMetadata: {},
    },
    {
      regionCode: RegionCode.MH,
      visitDate: today,
      purpose: VisitPurpose.SITE_SURVEY,
      status: VisitStatus.PLANNED,
      fieldRepId: repMumbai.id,
      customerId: customers[5].id,
      erpMetadata: {},
    },
  ]);

  // ─── Inventory ──────────────────────────────────────────────
  console.log("[Seed] Creating inventory...");
  await inventoryRepo.save([
    {
      regionCode: RegionCode.RJ,
      sku: "STT-WHT-A-001",
      materialType: "Italian Marble",
      variety: "Statuario",
      color: "White",
      finishType: "POLISHED",
      grade: "A",
      lengthCm: 280,
      widthCm: 160,
      thicknessMm: 18,
      quantityAvailable: 24,
      quantityReserved: 4,
      pricePerSqftINR: 850,
      landedCostPerSqftINR: 620,
      warehouseCode: "WH-UDR-01",
      rackLocation: "A-3-2",
      bundleNumber: "BDL-2024-042",
      status: InventoryStatus.IN_STOCK,
      erpMetadata: { erpSystem: "odoo", erpReferenceId: "INV-001" },
    },
    {
      regionCode: RegionCode.RJ,
      sku: "CLC-WHT-A-002",
      materialType: "Italian Marble",
      variety: "Calacatta",
      color: "White",
      finishType: "POLISHED",
      grade: "A",
      lengthCm: 300,
      widthCm: 170,
      thicknessMm: 20,
      quantityAvailable: 12,
      pricePerSqftINR: 1200,
      landedCostPerSqftINR: 880,
      warehouseCode: "WH-UDR-01",
      rackLocation: "A-4-1",
      status: InventoryStatus.IN_STOCK,
      erpMetadata: {},
    },
    {
      regionCode: RegionCode.KA,
      sku: "BGX-BLK-A-003",
      materialType: "Granite",
      variety: "Black Galaxy",
      color: "Black",
      finishType: "POLISHED",
      grade: "A",
      lengthCm: 260,
      widthCm: 140,
      thicknessMm: 18,
      quantityAvailable: 40,
      pricePerSqftINR: 320,
      warehouseCode: "WH-BLR-01",
      rackLocation: "B-1-3",
      status: InventoryStatus.IN_STOCK,
      erpMetadata: {},
    },
    {
      regionCode: RegionCode.MH,
      sku: "EMP-BRN-B-004",
      materialType: "Turkish Marble",
      variety: "Emperador",
      color: "Brown",
      finishType: "HONED",
      grade: "B",
      lengthCm: 240,
      widthCm: 150,
      thicknessMm: 18,
      quantityAvailable: 18,
      pricePerSqftINR: 450,
      warehouseCode: "WH-MUM-01",
      rackLocation: "C-2-4",
      status: InventoryStatus.IN_STOCK,
      erpMetadata: {},
    },
    {
      regionCode: RegionCode.AP,
      sku: "RNF-GRN-A-005",
      materialType: "Indian Marble",
      variety: "Rainforest",
      color: "Green",
      finishType: "POLISHED",
      grade: "A",
      lengthCm: 270,
      widthCm: 155,
      thicknessMm: 18,
      quantityAvailable: 30,
      pricePerSqftINR: 280,
      warehouseCode: "WH-HYD-01",
      rackLocation: "A-1-1",
      status: InventoryStatus.IN_STOCK,
      erpMetadata: {},
    },
    {
      regionCode: RegionCode.RJ,
      sku: "MKR-WHT-B-006",
      materialType: "Indian Marble",
      variety: "Makrana",
      color: "White",
      finishType: "HONED",
      grade: "B",
      lengthCm: 220,
      widthCm: 130,
      thicknessMm: 16,
      quantityAvailable: 60,
      pricePerSqftINR: 180,
      warehouseCode: "WH-UDR-01",
      rackLocation: "D-2-1",
      status: InventoryStatus.IN_STOCK,
      erpMetadata: {},
    },
  ]);

  console.log("[Seed] Seed completed successfully!");
  console.log(`  - ${users.length} users (password: ${SEED_PASSWORD})`);
  console.log(`  - ${customers.length} customers across RJ, KA, AP, MH`);
  console.log("  - 6 visits (completed, flagged, planned)");
  console.log("  - 6 inventory items across 4 warehouses");

  process.exit(0);
}

seed().catch((err) => {
  console.error("[Seed] Failed:", err);
  process.exit(1);
});
