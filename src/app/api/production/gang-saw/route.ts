import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const entries = await prisma.gangSawEntry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      block: { select: { blockNumber: true, variety: true, color: true } },
      machine: { select: { name: true, code: true } },
      operator: { select: { name: true } },
      _count: { select: { slabs: true } },
    },
  });

  return NextResponse.json({ entries });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();

    // Generate entry number
    const count = await prisma.gangSawEntry.count();
    const year = new Date().getFullYear();
    const entryNumber = `GS-${year}-${String(count + 1).padStart(4, "0")}`;

    // Create the gang saw entry
    const entry = await prisma.gangSawEntry.create({
      data: {
        entryNumber,
        blockId: body.blockId,
        machineId: body.machineId,
        operatorId: body.operatorId || user.userId,
        startTime: new Date(body.startTime),
        endTime: body.endTime ? new Date(body.endTime) : null,
        numberOfSlabs: parseInt(body.numberOfSlabs),
        slabThicknessMm: parseFloat(body.slabThicknessMm || "18"),
        bladesUsed: body.bladesUsed ? parseInt(body.bladesUsed) : null,
        wastageKg: body.wastageKg ? parseFloat(body.wastageKg) : null,
        wastagePercent: body.wastagePercent ? parseFloat(body.wastagePercent) : null,
        powerConsumptionKwh: body.powerConsumptionKwh ? parseFloat(body.powerConsumptionKwh) : null,
        status: body.status || "IN_PROGRESS",
        notes: body.notes || null,
      },
    });

    // Update block status
    await prisma.block.update({
      where: { id: body.blockId },
      data: { status: "IN_PRODUCTION" },
    });

    // If completed, generate slabs
    if (body.status === "COMPLETED" && body.numberOfSlabs > 0) {
      const block = await prisma.block.findUnique({ where: { id: body.blockId } });
      if (block) {
        const slabCount = await prisma.slab.count();
        const slabs = [];
        for (let i = 0; i < parseInt(body.numberOfSlabs); i++) {
          slabs.push({
            slabNumber: `SLB-${year}-${String(slabCount + i + 1).padStart(5, "0")}`,
            blockId: body.blockId,
            gangSawEntryId: entry.id,
            lengthCm: block.lengthCm,
            widthCm: block.heightCm, // height becomes width when cut
            thicknessMm: parseFloat(body.slabThicknessMm || "18"),
            status: "RAW",
            currentStage: "EPOXY",
            grade: block.grade,
          });
        }
        await prisma.slab.createMany({ data: slabs });

        // Update block status based on whether all material is used
        await prisma.block.update({
          where: { id: body.blockId },
          data: { status: body.blockFullyCut ? "FULLY_CUT" : "PARTIALLY_CUT" },
        });
      }
    }

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Error creating gang saw entry:", error);
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
  }
}
