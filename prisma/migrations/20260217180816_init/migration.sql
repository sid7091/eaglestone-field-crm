-- CreateTable
CREATE TABLE "User" (
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
);

-- CreateTable
CREATE TABLE "Block" (
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
);

-- CreateTable
CREATE TABLE "Slab" (
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
);

-- CreateTable
CREATE TABLE "Machine" (
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
);

-- CreateTable
CREATE TABLE "GangSawEntry" (
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
);

-- CreateTable
CREATE TABLE "EpoxyEntry" (
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
);

-- CreateTable
CREATE TABLE "PolishingEntry" (
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
);

-- CreateTable
CREATE TABLE "InventoryItem" (
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
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "capacity" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Block_blockNumber_key" ON "Block"("blockNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Slab_slabNumber_key" ON "Slab"("slabNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Machine_code_key" ON "Machine"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GangSawEntry_entryNumber_key" ON "GangSawEntry"("entryNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EpoxyEntry_entryNumber_key" ON "EpoxyEntry"("entryNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PolishingEntry_entryNumber_key" ON "PolishingEntry"("entryNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_slabId_key" ON "InventoryItem"("slabId");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_name_key" ON "Warehouse"("name");
