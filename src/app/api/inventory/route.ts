import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const warehouseId = searchParams.get("warehouseId");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (warehouseId) where.warehouseId = warehouseId;

  const items = await prisma.inventoryItem.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      slab: {
        include: {
          block: {
            select: { blockNumber: true, variety: true, color: true, type: true },
          },
        },
      },
      warehouse: { select: { name: true } },
    },
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();

    const item = await prisma.inventoryItem.create({
      data: {
        slabId: body.slabId,
        warehouseId: body.warehouseId,
        bundleNumber: body.bundleNumber || null,
        rackLocation: body.rackLocation || null,
        status: "IN_STOCK",
        notes: body.notes || null,
      },
    });

    // Update slab status
    await prisma.slab.update({
      where: { id: body.slabId },
      data: { status: "IN_STOCK", currentStage: "WAREHOUSE" },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Error creating inventory item:", error);
    return NextResponse.json({ error: "Failed to create inventory item" }, { status: 500 });
  }
}
