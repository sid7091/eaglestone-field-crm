import { createClient } from "@libsql/client";

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables");
  process.exit(1);
}

const client = createClient({ url: tursoUrl, authToken: tursoToken });

const statements = [
  // User
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "department" TEXT NOT NULL DEFAULT 'PRODUCTION',
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,

  // Block
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
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Block_blockNumber_key" ON "Block"("blockNumber")`,

  // Machine
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
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Machine_code_key" ON "Machine"("code")`,

  // GangSawEntry
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GangSawEntry_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GangSawEntry_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GangSawEntry_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "GangSawEntry_entryNumber_key" ON "GangSawEntry"("entryNumber")`,

  // Slab
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
    "updatedAt" DATETIME NOT NULL,
    "gangSawEntryId" TEXT,
    CONSTRAINT "Slab_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Slab_gangSawEntryId_fkey" FOREIGN KEY ("gangSawEntryId") REFERENCES "GangSawEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Slab_slabNumber_key" ON "Slab"("slabNumber")`,

  // EpoxyEntry
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EpoxyEntry_slabId_fkey" FOREIGN KEY ("slabId") REFERENCES "Slab" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EpoxyEntry_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EpoxyEntry_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EpoxyEntry_entryNumber_key" ON "EpoxyEntry"("entryNumber")`,

  // PolishingEntry
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PolishingEntry_slabId_fkey" FOREIGN KEY ("slabId") REFERENCES "Slab" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PolishingEntry_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PolishingEntry_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PolishingEntry_entryNumber_key" ON "PolishingEntry"("entryNumber")`,

  // Warehouse
  `CREATE TABLE IF NOT EXISTS "Warehouse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "capacity" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Warehouse_name_key" ON "Warehouse"("name")`,

  // InventoryItem
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventoryItem_slabId_fkey" FOREIGN KEY ("slabId") REFERENCES "Slab" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_slabId_key" ON "InventoryItem"("slabId")`,
];

console.log("Pushing schema to Turso...");

for (const sql of statements) {
  const tableName = sql.match(/"(\w+)"/)?.[1] || "index";
  try {
    await client.execute(sql);
    console.log(`  OK: ${tableName}`);
  } catch (err) {
    console.error(`  FAIL: ${tableName} - ${err.message}`);
    process.exit(1);
  }
}

console.log("\nSchema pushed successfully!");
