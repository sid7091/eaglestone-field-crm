/**
 * Combined script: pushes schema + seeds data to Turso.
 * Runs during Vercel build via vercel.json buildCommand.
 * Safe to re-run — uses CREATE TABLE IF NOT EXISTS and checks for existing data.
 */
import { createClient } from "@libsql/client";
import { fileURLToPath } from "node:url";
import path from "node:path";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
globalThis.__dirname = path.resolve(__dirname, "../src/generated/prisma");

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.log("No TURSO_DATABASE_URL/TURSO_AUTH_TOKEN — skipping Turso setup (dev mode).");
  process.exit(0);
}

const client = createClient({ url: tursoUrl, authToken: tursoToken });

// ── Schema ──────────────────────────────────────────────────────────────────

const schema = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "department" TEXT NOT NULL DEFAULT 'PRODUCTION',
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "regionCode" TEXT NOT NULL DEFAULT 'RJ',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,

  `CREATE TABLE IF NOT EXISTS "Block" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blockNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "variety" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "quarryName" TEXT,
    "supplierName" TEXT NOT NULL,
    "lengthCm" REAL NOT NULL,
    "widthCm" REAL NOT NULL,
    "heightCm" REAL NOT NULL,
    "weightKg" REAL NOT NULL,
    "grade" TEXT NOT NULL DEFAULT 'A',
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "arrivalDate" DATETIME NOT NULL,
    "importBatchNo" TEXT,
    "landedCostINR" REAL,
    "vehicleNumber" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Block_blockNumber_key" ON "Block"("blockNumber")`,

  `CREATE TABLE IF NOT EXISTS "Machine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastMaintenance" DATETIME,
    "nextMaintenance" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Machine_code_key" ON "Machine"("code")`,

  `CREATE TABLE IF NOT EXISTS "GangSawEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryNumber" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "numberOfSlabs" INTEGER NOT NULL,
    "slabThicknessMm" REAL NOT NULL DEFAULT 18,
    "bladesUsed" INTEGER,
    "wastageKg" REAL,
    "wastagePercent" REAL,
    "powerConsumptionKwh" REAL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GangSawEntry_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block" ("id"),
    CONSTRAINT "GangSawEntry_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine" ("id"),
    CONSTRAINT "GangSawEntry_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "GangSawEntry_entryNumber_key" ON "GangSawEntry"("entryNumber")`,

  `CREATE TABLE IF NOT EXISTS "Slab" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slabNumber" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "lengthCm" REAL NOT NULL,
    "widthCm" REAL NOT NULL,
    "thicknessMm" REAL NOT NULL DEFAULT 18,
    "weightKg" REAL,
    "grade" TEXT NOT NULL DEFAULT 'A',
    "status" TEXT NOT NULL DEFAULT 'RAW',
    "currentStage" TEXT NOT NULL DEFAULT 'GANG_SAW',
    "finishType" TEXT,
    "glossLevel" INTEGER,
    "qcStatus" TEXT,
    "qcNotes" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gangSawEntryId" TEXT,
    CONSTRAINT "Slab_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block" ("id"),
    CONSTRAINT "Slab_gangSawEntryId_fkey" FOREIGN KEY ("gangSawEntryId") REFERENCES "GangSawEntry" ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Slab_slabNumber_key" ON "Slab"("slabNumber")`,

  `CREATE TABLE IF NOT EXISTS "EpoxyEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryNumber" TEXT NOT NULL,
    "slabId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "epoxyType" TEXT,
    "epoxyQuantityMl" REAL,
    "vacuumPressure" REAL,
    "curingTimeMin" INTEGER,
    "temperatureC" REAL,
    "meshApplied" BOOLEAN NOT NULL DEFAULT false,
    "meshType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "qualityCheck" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EpoxyEntry_slabId_fkey" FOREIGN KEY ("slabId") REFERENCES "Slab" ("id"),
    CONSTRAINT "EpoxyEntry_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine" ("id"),
    CONSTRAINT "EpoxyEntry_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EpoxyEntry_entryNumber_key" ON "EpoxyEntry"("entryNumber")`,

  `CREATE TABLE IF NOT EXISTS "PolishingEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryNumber" TEXT NOT NULL,
    "slabId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "finishType" TEXT NOT NULL DEFAULT 'POLISHED',
    "glossLevel" INTEGER,
    "abrasivesUsed" TEXT,
    "abrasivesCostINR" REAL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "qualityCheck" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PolishingEntry_slabId_fkey" FOREIGN KEY ("slabId") REFERENCES "Slab" ("id"),
    CONSTRAINT "PolishingEntry_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine" ("id"),
    CONSTRAINT "PolishingEntry_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PolishingEntry_entryNumber_key" ON "PolishingEntry"("entryNumber")`,

  `CREATE TABLE IF NOT EXISTS "Warehouse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "capacity" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Warehouse_name_key" ON "Warehouse"("name")`,

  `CREATE TABLE IF NOT EXISTS "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slabId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "bundleNumber" TEXT,
    "rackLocation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "reservedFor" TEXT,
    "reservedDate" DATETIME,
    "soldDate" DATETIME,
    "soldPriceINR" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryItem_slabId_fkey" FOREIGN KEY ("slabId") REFERENCES "Slab" ("id"),
    CONSTRAINT "InventoryItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_slabId_key" ON "InventoryItem"("slabId")`,

  `CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessName" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT NOT NULL,
    "altPhone" TEXT,
    "email" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "customerType" TEXT NOT NULL DEFAULT 'DEALER',
    "tier" TEXT NOT NULL DEFAULT 'BRONZE',
    "leadStatus" TEXT NOT NULL DEFAULT 'NEW',
    "regionCode" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT NOT NULL,
    "pincode" TEXT,
    "locationLat" REAL,
    "locationLng" REAL,
    "locationAccuracy" REAL,
    "preferredMaterials" TEXT,
    "annualPotentialINR" REAL NOT NULL DEFAULT 0,
    "lifetimeValueINR" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "erpMetadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Customer_gstin_key" ON "Customer"("gstin")`,

  `CREATE TABLE IF NOT EXISTS "Visit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regionCode" TEXT NOT NULL,
    "visitDate" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "checkinTime" DATETIME,
    "checkoutTime" DATETIME,
    "durationMinutes" INTEGER,
    "checkinLat" REAL,
    "checkinLng" REAL,
    "checkinAccuracy" REAL,
    "checkoutLat" REAL,
    "checkoutLng" REAL,
    "checkoutAccuracy" REAL,
    "geofenceDistance" REAL,
    "geofenceValid" BOOLEAN,
    "summary" TEXT,
    "actionItems" TEXT,
    "nextSteps" TEXT,
    "followUpDate" TEXT,
    "orderValueINR" REAL,
    "photoUrls" TEXT,
    "createdOffline" BOOLEAN NOT NULL DEFAULT false,
    "offlineId" TEXT,
    "erpMetadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fieldRepId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    CONSTRAINT "Visit_fieldRepId_fkey" FOREIGN KEY ("fieldRepId") REFERENCES "User" ("id"),
    CONSTRAINT "Visit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Visit_offlineId_key" ON "Visit"("offlineId")`,

  `CREATE TABLE IF NOT EXISTS "FieldInventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regionCode" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "materialType" TEXT NOT NULL,
    "variety" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "finishType" TEXT NOT NULL,
    "grade" TEXT NOT NULL DEFAULT 'A',
    "lengthCm" REAL NOT NULL,
    "widthCm" REAL NOT NULL,
    "thicknessMm" REAL NOT NULL,
    "quantityAvailable" INTEGER NOT NULL DEFAULT 1,
    "quantityReserved" INTEGER NOT NULL DEFAULT 0,
    "pricePerSqftINR" REAL NOT NULL,
    "landedCostPerSqftINR" REAL,
    "warehouseCode" TEXT NOT NULL,
    "rackLocation" TEXT,
    "bundleNumber" TEXT,
    "blockReference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "reservedForId" TEXT,
    "reservedDate" DATETIME,
    "soldDate" DATETIME,
    "notes" TEXT,
    "erpMetadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FieldInventory_reservedForId_fkey" FOREIGN KEY ("reservedForId") REFERENCES "Customer" ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "FieldInventory_sku_key" ON "FieldInventory"("sku")`,
];

console.log("Pushing schema to Turso...");
for (const sql of schema) {
  const name = sql.match(/"(\w+)"/)?.[1] || "index";
  try {
    await client.execute(sql);
    console.log(`  OK: ${name}`);
  } catch (err) {
    if (err.message?.includes("duplicate") || err.message?.includes("already exists")) {
      console.log(`  SKIP: ${name} (already exists)`);
    } else {
      console.error(`  FAIL: ${name} - ${err.message}`);
      process.exit(1);
    }
  }
}

// ── Seed (only if empty) ────────────────────────────────────────────────────

const { rows } = await client.execute("SELECT COUNT(*) as cnt FROM User");
if (rows[0].cnt > 0) {
  console.log("\nDatabase already seeded — skipping seed step.");
  process.exit(0);
}

console.log("\nSeeding Turso database...");

const { PrismaClient } = await import("../src/generated/prisma/client.ts");
const { PrismaLibSql } = await import("@prisma/adapter-libsql");

const adapter = new PrismaLibSql({ url: tursoUrl, authToken: tursoToken });
const prisma = new PrismaClient({ adapter });

const adminPassword = await bcrypt.hash("admin123", 12);
const operatorPassword = await bcrypt.hash("operator123", 12);
const managerPassword = await bcrypt.hash("manager123", 12);
const fieldRepPassword = await bcrypt.hash("fieldrep123", 12);

const admin = await prisma.user.create({
  data: { email: "admin@eaglestone.in", password: adminPassword, name: "Siddharth (Admin)", role: "ADMIN", department: "ADMIN", phone: "+91-9876543210" },
});
await prisma.user.create({
  data: { email: "manager@eaglestone.in", password: managerPassword, name: "Rajesh Kumar", role: "MANAGER", department: "PRODUCTION", phone: "+91-9876543211" },
});
await prisma.user.create({
  data: { email: "operator@eaglestone.in", password: operatorPassword, name: "Venkat Rao", role: "OPERATOR", department: "PRODUCTION", phone: "+91-9876543212" },
});
await prisma.user.create({
  data: { email: "operator2@eaglestone.in", password: operatorPassword, name: "Suresh Reddy", role: "OPERATOR", department: "PRODUCTION", phone: "+91-9876543213" },
});
const fieldRep1 = await prisma.user.create({
  data: { email: "fieldrep@eaglestone.in", password: fieldRepPassword, name: "Arjun Sharma", role: "OPERATOR", department: "SALES", phone: "+91-9876543214", regionCode: "RJ" },
});
console.log("  Users created");

// Customers
const customer1 = await prisma.customer.create({
  data: { businessName: "Rajasthan Marble House", contactPerson: "Vikram Singh", phone: "+91-9412345678", email: "vikram@rajmarble.in", customerType: "DEALER", tier: "GOLD", leadStatus: "QUALIFIED", regionCode: "RJ", district: "Jaipur", city: "Jaipur", address: "123 MI Road, Jaipur", pincode: "302001", locationLat: 26.9124, locationLng: 75.7873, annualPotentialINR: 5000000 },
});
const customer2 = await prisma.customer.create({
  data: { businessName: "Mehta Constructions", contactPerson: "Priya Mehta", phone: "+91-9823456789", email: "priya@mehtaconstruction.in", customerType: "BUILDER", tier: "PLATINUM", leadStatus: "NEGOTIATION", regionCode: "MH", district: "Mumbai", city: "Mumbai", address: "45 Marine Drive, Mumbai", pincode: "400020", locationLat: 18.9440, locationLng: 72.8234, annualPotentialINR: 15000000 },
});
const customer3 = await prisma.customer.create({
  data: { businessName: "Stone Age Interiors", contactPerson: "Karan Patel", phone: "+91-9734567890", customerType: "ARCHITECT", tier: "SILVER", leadStatus: "PROPOSAL_SENT", regionCode: "KA", district: "Bangalore", city: "Bangalore", address: "78 MG Road, Bangalore", pincode: "560001", locationLat: 12.9716, locationLng: 77.5946, annualPotentialINR: 3000000 },
});
await prisma.customer.create({
  data: { businessName: "Andhra Granite Works", contactPerson: "Srinivas Reddy", phone: "+91-9645678901", customerType: "DEALER", tier: "BRONZE", leadStatus: "NEW", regionCode: "AP", district: "Guntur", city: "Ongole", address: "Plot 12, Industrial Area, Ongole", pincode: "523001", locationLat: 15.5057, locationLng: 80.0499, annualPotentialINR: 1500000 },
});
const customer5 = await prisma.customer.create({
  data: { businessName: "Delhi Marble Emporium", contactPerson: "Ankit Gupta", phone: "+91-9556789012", email: "ankit@delhimarble.com", customerType: "DEALER", tier: "GOLD", leadStatus: "WON", regionCode: "DL", district: "New Delhi", city: "New Delhi", address: "22 Chandni Chowk, Delhi", pincode: "110006", locationLat: 28.6505, locationLng: 77.2303, annualPotentialINR: 8000000, lifetimeValueINR: 12000000 },
});
console.log("  Customers created");

// Visits
const today = new Date();
const todayStr = today.toISOString().slice(0, 10);
const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
const yesterdayStr = yesterday.toISOString().slice(0, 10);
const twoDaysAgo = new Date(today); twoDaysAgo.setDate(today.getDate() - 2);

await prisma.visit.create({
  data: { regionCode: "RJ", visitDate: yesterdayStr, purpose: "SALES_PITCH", status: "COMPLETED", fieldRepId: fieldRep1.id, customerId: customer1.id, checkinTime: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 10, 0), checkoutTime: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 11, 30), durationMinutes: 90, checkinLat: 26.9125, checkinLng: 75.7874, checkinAccuracy: 8, checkoutLat: 26.9125, checkoutLng: 75.7873, checkoutAccuracy: 10, geofenceDistance: 12, geofenceValid: true, summary: "Showed premium Italian marble samples.", orderValueINR: 500000 },
});
await prisma.visit.create({
  data: { regionCode: "MH", visitDate: todayStr, purpose: "ORDER_FOLLOWUP", status: "PLANNED", fieldRepId: admin.id, customerId: customer2.id },
});
await prisma.visit.create({
  data: { regionCode: "KA", visitDate: twoDaysAgo.toISOString().slice(0, 10), purpose: "SAMPLE_DELIVERY", status: "COMPLETED", fieldRepId: fieldRep1.id, customerId: customer3.id, checkinTime: new Date(twoDaysAgo.getFullYear(), twoDaysAgo.getMonth(), twoDaysAgo.getDate(), 14, 0), checkoutTime: new Date(twoDaysAgo.getFullYear(), twoDaysAgo.getMonth(), twoDaysAgo.getDate(), 15, 0), durationMinutes: 60, checkinLat: 12.9717, checkinLng: 77.5947, checkinAccuracy: 5, geofenceDistance: 15, geofenceValid: true, summary: "Delivered 3 marble samples.", orderValueINR: 300000 },
});
await prisma.visit.create({
  data: { regionCode: "DL", visitDate: yesterdayStr, purpose: "SALES_PITCH", status: "FLAGGED_FAKE", fieldRepId: admin.id, customerId: customer5.id, checkinTime: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 16, 0), checkinLat: 28.6300, checkinLng: 77.2100, checkinAccuracy: 45, geofenceDistance: 2500, geofenceValid: false },
});
console.log("  Visits created");

// Field Inventory
const items = [
  { sku: "FLD-STT-001", materialType: "Italian Marble", variety: "Statuario", color: "White", finishType: "POLISHED", grade: "A", lengthCm: 300, widthCm: 150, thicknessMm: 18, quantityAvailable: 5, pricePerSqftINR: 850, landedCostPerSqftINR: 600, warehouseCode: "WH-ONG-01", rackLocation: "A-1-1", bundleNumber: "BDL-STT-01", blockReference: "BLK-2026-0001", regionCode: "AP" },
  { sku: "FLD-BOT-001", materialType: "Italian Marble", variety: "Bottochino", color: "Beige", finishType: "POLISHED", grade: "A", lengthCm: 280, widthCm: 150, thicknessMm: 18, quantityAvailable: 8, pricePerSqftINR: 650, landedCostPerSqftINR: 420, warehouseCode: "WH-ONG-01", rackLocation: "A-2-1", bundleNumber: "BDL-BOT-01", regionCode: "AP" },
  { sku: "FLD-EMP-001", materialType: "Turkish Marble", variety: "Emperador", color: "Brown", finishType: "POLISHED", grade: "B", lengthCm: 300, widthCm: 170, thicknessMm: 20, quantityAvailable: 3, pricePerSqftINR: 550, landedCostPerSqftINR: 380, warehouseCode: "WH-ONG-01", rackLocation: "B-1-1", regionCode: "AP" },
  { sku: "FLD-MKR-001", materialType: "Indian Marble", variety: "Makrana", color: "White", finishType: "HONED", grade: "A", lengthCm: 260, widthCm: 150, thicknessMm: 18, quantityAvailable: 12, pricePerSqftINR: 350, landedCostPerSqftINR: 200, warehouseCode: "WH-JPR-01", rackLocation: "C-1-1", bundleNumber: "BDL-MKR-01", regionCode: "RJ" },
  { sku: "FLD-BLK-GRN-001", materialType: "Granite", variety: "Black Galaxy", color: "Black", finishType: "POLISHED", grade: "A", lengthCm: 280, widthCm: 160, thicknessMm: 20, quantityAvailable: 6, pricePerSqftINR: 450, landedCostPerSqftINR: 280, warehouseCode: "WH-ONG-01", rackLocation: "D-1-1", regionCode: "AP" },
  { sku: "FLD-CLC-001", materialType: "Italian Marble", variety: "Calacatta", color: "White", finishType: "POLISHED", grade: "A", lengthCm: 310, widthCm: 160, thicknessMm: 18, quantityAvailable: 2, pricePerSqftINR: 1200, landedCostPerSqftINR: 900, warehouseCode: "WH-ONG-01", rackLocation: "A-3-1", bundleNumber: "BDL-CLC-01", regionCode: "AP" },
  { sku: "FLD-ONX-001", materialType: "Onyx", variety: "Honey Onyx", color: "Gold", finishType: "POLISHED", grade: "A", lengthCm: 240, widthCm: 120, thicknessMm: 18, quantityAvailable: 4, pricePerSqftINR: 1500, landedCostPerSqftINR: 1100, warehouseCode: "WH-JPR-01", rackLocation: "E-1-1", regionCode: "RJ" },
  { sku: "FLD-TRV-001", materialType: "Travertine", variety: "Classic Travertine", color: "Cream", finishType: "HONED", grade: "B", lengthCm: 300, widthCm: 150, thicknessMm: 20, quantityAvailable: 10, pricePerSqftINR: 400, landedCostPerSqftINR: 250, warehouseCode: "WH-ONG-01", rackLocation: "F-1-1", regionCode: "AP" },
];
for (const item of items) {
  await prisma.fieldInventory.create({ data: item });
}
console.log("  Field inventory created");

await prisma.$disconnect();
console.log("\nTurso setup complete!");
