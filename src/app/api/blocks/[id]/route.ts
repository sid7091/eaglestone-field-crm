import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const block = await prisma.block.findUnique({
    where: { id },
    include: {
      slabs: {
        orderBy: { slabNumber: "asc" },
        include: { inventoryItem: true },
      },
      gangSawEntries: {
        orderBy: { createdAt: "desc" },
        include: { operator: { select: { name: true } }, machine: { select: { name: true } } },
      },
    },
  });

  if (!block) {
    return NextResponse.json({ error: "Block not found" }, { status: 404 });
  }

  return NextResponse.json({ block });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const block = await prisma.block.update({
    where: { id },
    data: {
      type: body.type,
      color: body.color,
      variety: body.variety,
      origin: body.origin,
      quarryName: body.quarryName || null,
      supplierName: body.supplierName,
      lengthCm: parseFloat(body.lengthCm),
      widthCm: parseFloat(body.widthCm),
      heightCm: parseFloat(body.heightCm),
      weightKg: parseFloat(body.weightKg),
      grade: body.grade,
      status: body.status,
      landedCostINR: body.landedCostINR ? parseFloat(body.landedCostINR) : null,
      vehicleNumber: body.vehicleNumber || null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json({ block });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.block.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
