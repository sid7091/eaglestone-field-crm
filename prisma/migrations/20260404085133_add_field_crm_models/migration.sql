-- CreateTable
CREATE TABLE "Customer" (
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Visit" (
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
    "updatedAt" DATETIME NOT NULL,
    "fieldRepId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    CONSTRAINT "Visit_fieldRepId_fkey" FOREIGN KEY ("fieldRepId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Visit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FieldInventory" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FieldInventory_reservedForId_fkey" FOREIGN KEY ("reservedForId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
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
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "department", "email", "id", "isActive", "name", "password", "phone", "role", "updatedAt") SELECT "createdAt", "department", "email", "id", "isActive", "name", "password", "phone", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_gstin_key" ON "Customer"("gstin");

-- CreateIndex
CREATE UNIQUE INDEX "Visit_offlineId_key" ON "Visit"("offlineId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldInventory_sku_key" ON "FieldInventory"("sku");
