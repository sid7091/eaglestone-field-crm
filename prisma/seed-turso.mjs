import { fileURLToPath } from "node:url";
import path from "node:path";
import bcrypt from "bcryptjs";
import { createClient } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Prisma 7 generated client needs __dirname set for ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));
globalThis.__dirname = path.resolve(__dirname, "../src/generated/prisma");

const { PrismaClient } = await import("../src/generated/prisma/client.ts");

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables");
  console.error("Usage: TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npx tsx prisma/seed-turso.mjs");
  process.exit(1);
}

const libsql = createClient({ url: tursoUrl, authToken: tursoToken });
const adapter = new PrismaLibSql(libsql);
const prisma = new PrismaClient({ adapter, datasourceUrl: tursoUrl });

async function main() {
  console.log("Seeding Turso database...");

  // Create Users
  const adminPassword = await bcrypt.hash("admin123", 12);
  const operatorPassword = await bcrypt.hash("operator123", 12);
  const managerPassword = await bcrypt.hash("manager123", 12);

  const admin = await prisma.user.create({
    data: {
      email: "admin@eaglestone.in",
      password: adminPassword,
      name: "Siddharth (Admin)",
      role: "ADMIN",
      department: "ADMIN",
      phone: "+91-9876543210",
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: "manager@eaglestone.in",
      password: managerPassword,
      name: "Rajesh Kumar",
      role: "MANAGER",
      department: "PRODUCTION",
      phone: "+91-9876543211",
    },
  });

  const operator1 = await prisma.user.create({
    data: {
      email: "operator@eaglestone.in",
      password: operatorPassword,
      name: "Venkat Rao",
      role: "OPERATOR",
      department: "PRODUCTION",
      phone: "+91-9876543212",
    },
  });

  const operator2 = await prisma.user.create({
    data: {
      email: "operator2@eaglestone.in",
      password: operatorPassword,
      name: "Suresh Reddy",
      role: "OPERATOR",
      department: "PRODUCTION",
      phone: "+91-9876543213",
    },
  });

  console.log("Users created");

  // Create Machines
  const gangSaw1 = await prisma.machine.create({
    data: { name: "Gang Saw 1", code: "GS-01", type: "GANG_SAW", manufacturer: "Breton", model: "GS-2000", location: "Section A, Bay 1", status: "ACTIVE" },
  });
  const gangSaw2 = await prisma.machine.create({
    data: { name: "Gang Saw 2", code: "GS-02", type: "GANG_SAW", manufacturer: "Breton", model: "GS-3000", location: "Section A, Bay 2", status: "ACTIVE" },
  });
  const epoxyLine1 = await prisma.machine.create({
    data: { name: "Epoxy Line A", code: "EP-01", type: "EPOXY_LINE", manufacturer: "Comandulli", model: "VacuSeal 500", location: "Section B, Bay 1", status: "ACTIVE" },
  });
  await prisma.machine.create({
    data: { name: "Epoxy Line B", code: "EP-02", type: "EPOXY_LINE", manufacturer: "Comandulli", model: "VacuSeal 500", location: "Section B, Bay 2", status: "ACTIVE" },
  });
  const polisher1 = await prisma.machine.create({
    data: { name: "Polishing Machine 1", code: "PL-01", type: "POLISHING_MACHINE", manufacturer: "Pedrini", model: "Galaxy B220", location: "Section C, Bay 1", status: "ACTIVE" },
  });
  await prisma.machine.create({
    data: { name: "Polishing Machine 2", code: "PL-02", type: "POLISHING_MACHINE", manufacturer: "Pedrini", model: "Galaxy B220", location: "Section C, Bay 2", status: "MAINTENANCE" },
  });

  console.log("Machines created");

  // Create Warehouses
  const warehouse1 = await prisma.warehouse.create({
    data: { name: "Main Warehouse", location: "Ongole Factory - Section D", capacity: 500 },
  });
  await prisma.warehouse.create({
    data: { name: "Finished Goods Store", location: "Ongole Factory - Section E", capacity: 300 },
  });

  console.log("Warehouses created");

  // Create Blocks
  const block1 = await prisma.block.create({
    data: {
      blockNumber: "BLK-2026-0001", type: "Italian Marble", color: "White", variety: "Statuario",
      origin: "Italy", quarryName: "Carrara Quarry", supplierName: "Marmi Bruno Zanet",
      lengthCm: 300, widthCm: 180, heightCm: 150, weightKg: 22000, grade: "A", status: "FULLY_CUT",
      arrivalDate: new Date("2026-01-15"), importBatchNo: "IMP-2026-001", landedCostINR: 2500000,
      vehicleNumber: "AP-09-AB-1234",
    },
  });
  const block2 = await prisma.block.create({
    data: {
      blockNumber: "BLK-2026-0002", type: "Italian Marble", color: "Beige", variety: "Bottochino",
      origin: "Italy", quarryName: "Verona Quarry", supplierName: "Marmi Bruno Zanet",
      lengthCm: 280, widthCm: 170, heightCm: 140, weightKg: 18000, grade: "A", status: "IN_PRODUCTION",
      arrivalDate: new Date("2026-01-20"), importBatchNo: "IMP-2026-001", landedCostINR: 1800000,
      vehicleNumber: "AP-09-CD-5678",
    },
  });
  await prisma.block.create({
    data: {
      blockNumber: "BLK-2026-0003", type: "Turkish Marble", color: "Grey", variety: "Emperador",
      origin: "Turkey", supplierName: "Anatolian Stone",
      lengthCm: 310, widthCm: 190, heightCm: 160, weightKg: 25000, grade: "B", status: "RECEIVED",
      arrivalDate: new Date("2026-02-10"), importBatchNo: "IMP-2026-003", landedCostINR: 1500000,
      vehicleNumber: "AP-09-EF-9012",
    },
  });
  await prisma.block.create({
    data: {
      blockNumber: "BLK-2026-0004", type: "Indian Marble", color: "White", variety: "Makrana",
      origin: "India", quarryName: "Makrana Mines", supplierName: "Rajasthan Marble Corp",
      lengthCm: 260, widthCm: 160, heightCm: 130, weightKg: 14500, grade: "A", status: "RECEIVED",
      arrivalDate: new Date("2026-02-14"), landedCostINR: 800000, vehicleNumber: "RJ-14-XY-4567",
    },
  });

  console.log("Blocks created");

  // Gang Saw Entry for Block 1
  const gsEntry1 = await prisma.gangSawEntry.create({
    data: {
      entryNumber: "GS-2026-0001", blockId: block1.id, machineId: gangSaw1.id, operatorId: operator1.id,
      startTime: new Date("2026-01-18T08:00:00"), endTime: new Date("2026-01-19T16:00:00"),
      numberOfSlabs: 8, slabThicknessMm: 18, bladesUsed: 9, wastageKg: 800, wastagePercent: 3.6,
      powerConsumptionKwh: 450, status: "COMPLETED", notes: "Clean cut, good quality throughout",
    },
  });

  // Create slabs
  const slabsBlock1 = [];
  for (let i = 1; i <= 8; i++) {
    const slabNum = String(i).padStart(5, "0");
    const slab = await prisma.slab.create({
      data: {
        slabNumber: `SLB-2026-${slabNum}`, blockId: block1.id, gangSawEntryId: gsEntry1.id,
        lengthCm: 300, widthCm: 150, thicknessMm: 18, weightKg: 2200, grade: "A",
        status: i <= 4 ? "IN_STOCK" : i <= 6 ? "POLISHED" : "EPOXY_DONE",
        currentStage: i <= 4 ? "WAREHOUSE" : i <= 6 ? "QC" : "POLISHING",
        finishType: i <= 6 ? "POLISHED" : null,
        glossLevel: i <= 6 ? 85 : null,
      },
    });
    slabsBlock1.push(slab);
  }
  console.log("Slabs created");

  // Epoxy entries
  for (let i = 0; i < 8; i++) {
    await prisma.epoxyEntry.create({
      data: {
        entryNumber: `EP-2026-${String(i + 1).padStart(4, "0")}`, slabId: slabsBlock1[i].id,
        machineId: epoxyLine1.id, operatorId: operator2.id,
        startTime: new Date(`2026-01-20T${String(8 + i).padStart(2, "0")}:00:00`),
        endTime: new Date(`2026-01-20T${String(9 + i).padStart(2, "0")}:30:00`),
        epoxyType: "Premium", epoxyQuantityMl: 350, vacuumPressure: 0.85,
        curingTimeMin: 45, temperatureC: 35, meshApplied: true, meshType: "Fiberglass",
        status: "COMPLETED", qualityCheck: "PASS",
      },
    });
  }
  console.log("Epoxy entries created");

  // Polishing entries
  for (let i = 0; i < 6; i++) {
    await prisma.polishingEntry.create({
      data: {
        entryNumber: `PL-2026-${String(i + 1).padStart(4, "0")}`, slabId: slabsBlock1[i].id,
        machineId: polisher1.id, operatorId: operator1.id,
        startTime: new Date(`2026-01-22T${String(8 + i).padStart(2, "0")}:00:00`),
        endTime: new Date(`2026-01-22T${String(9 + i).padStart(2, "0")}:00:00`),
        finishType: "POLISHED", glossLevel: 85,
        abrasivesUsed: "120, 220, 400, 800, 1500 grit sequence", abrasivesCostINR: 450,
        status: "COMPLETED", qualityCheck: "PASS",
      },
    });
  }
  console.log("Polishing entries created");

  // Inventory items
  for (let i = 0; i < 4; i++) {
    await prisma.inventoryItem.create({
      data: {
        slabId: slabsBlock1[i].id, warehouseId: warehouse1.id,
        bundleNumber: "BDL-001", rackLocation: `A-${i + 1}-1`, status: "IN_STOCK",
      },
    });
  }
  console.log("Inventory items created");

  // Gang Saw Entry for Block 2 (in progress)
  await prisma.gangSawEntry.create({
    data: {
      entryNumber: "GS-2026-0002", blockId: block2.id, machineId: gangSaw2.id, operatorId: operator2.id,
      startTime: new Date("2026-02-15T08:00:00"), numberOfSlabs: 6, slabThicknessMm: 18,
      status: "IN_PROGRESS", notes: "Cutting in progress - Bottochino block",
    },
  });

  console.log("\nSeeding completed!");
  console.log("\nLogin Credentials:");
  console.log("  Admin:    admin@eaglestone.in / admin123");
  console.log("  Manager:  manager@eaglestone.in / manager123");
  console.log("  Operator: operator@eaglestone.in / operator123");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
