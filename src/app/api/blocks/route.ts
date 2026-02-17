import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (search) {
    where.OR = [
      { blockNumber: { contains: search } },
      { variety: { contains: search } },
      { supplierName: { contains: search } },
    ];
  }

  const blocks = await prisma.block.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { slabs: true, gangSawEntries: true } },
    },
  });

  return NextResponse.json({ blocks });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();

    // Generate block number
    const count = await prisma.block.count();
    const year = new Date().getFullYear();
    const blockNumber = `BLK-${year}-${String(count + 1).padStart(4, "0")}`;

    const block = await prisma.block.create({
      data: {
        blockNumber,
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
        grade: body.grade || "A",
        arrivalDate: new Date(body.arrivalDate),
        importBatchNo: body.importBatchNo || null,
        landedCostINR: body.landedCostINR ? parseFloat(body.landedCostINR) : null,
        vehicleNumber: body.vehicleNumber || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json({ block }, { status: 201 });
  } catch (error) {
    console.error("Error creating block:", error);
    return NextResponse.json({ error: "Failed to create block" }, { status: 500 });
  }
}
