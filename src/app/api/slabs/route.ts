import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const currentStage = searchParams.get("currentStage");
  const blockId = searchParams.get("blockId");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (currentStage) where.currentStage = currentStage;
  if (blockId) where.blockId = blockId;

  const slabs = await prisma.slab.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      block: { select: { blockNumber: true, variety: true, color: true, type: true } },
      inventoryItem: { select: { warehouseId: true, status: true, rackLocation: true } },
    },
  });

  return NextResponse.json({ slabs });
}
