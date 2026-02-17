import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    totalBlocks,
    blocksInProduction,
    totalSlabs,
    slabsByStage,
    totalInventory,
    inventoryInStock,
    recentGangSaw,
    recentEpoxy,
    recentPolishing,
    machineCount,
  ] = await Promise.all([
    prisma.block.count(),
    prisma.block.count({ where: { status: { in: ["IN_PRODUCTION", "PARTIALLY_CUT"] } } }),
    prisma.slab.count(),
    prisma.slab.groupBy({ by: ["currentStage"], _count: { id: true } }),
    prisma.inventoryItem.count(),
    prisma.inventoryItem.count({ where: { status: "IN_STOCK" } }),
    prisma.gangSawEntry.count({ where: { status: "IN_PROGRESS" } }),
    prisma.epoxyEntry.count({ where: { status: { in: ["IN_PROGRESS", "CURING"] } } }),
    prisma.polishingEntry.count({ where: { status: "IN_PROGRESS" } }),
    prisma.machine.count({ where: { status: "ACTIVE" } }),
  ]);

  // Recent activity
  const recentBlocks = await prisma.block.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { blockNumber: true, variety: true, color: true, status: true, createdAt: true },
  });

  const recentSlabs = await prisma.slab.findMany({
    take: 5,
    orderBy: { updatedAt: "desc" },
    select: {
      slabNumber: true,
      currentStage: true,
      status: true,
      updatedAt: true,
      block: { select: { variety: true } },
    },
  });

  const stageMap: Record<string, number> = {};
  slabsByStage.forEach((s) => {
    stageMap[s.currentStage] = s._count.id;
  });

  return NextResponse.json({
    stats: {
      totalBlocks,
      blocksInProduction,
      totalSlabs,
      slabsByStage: stageMap,
      totalInventory,
      inventoryInStock,
      activeProduction: {
        gangSaw: recentGangSaw,
        epoxy: recentEpoxy,
        polishing: recentPolishing,
      },
      activeMachines: machineCount,
    },
    recentBlocks,
    recentSlabs,
  });
}
