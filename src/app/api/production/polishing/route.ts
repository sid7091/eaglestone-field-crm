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

  const entries = await prisma.polishingEntry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      slab: {
        select: {
          slabNumber: true,
          block: { select: { blockNumber: true, variety: true, color: true } },
        },
      },
      machine: { select: { name: true, code: true } },
      operator: { select: { name: true } },
    },
  });

  return NextResponse.json({ entries });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();

    const count = await prisma.polishingEntry.count();
    const year = new Date().getFullYear();
    const entryNumber = `PL-${year}-${String(count + 1).padStart(4, "0")}`;

    const entry = await prisma.polishingEntry.create({
      data: {
        entryNumber,
        slabId: body.slabId,
        machineId: body.machineId,
        operatorId: body.operatorId || user.userId,
        startTime: new Date(body.startTime),
        endTime: body.endTime ? new Date(body.endTime) : null,
        finishType: body.finishType || "POLISHED",
        glossLevel: body.glossLevel ? parseInt(body.glossLevel) : null,
        abrasivesUsed: body.abrasivesUsed || null,
        abrasivesCostINR: body.abrasivesCostINR ? parseFloat(body.abrasivesCostINR) : null,
        status: body.status || "IN_PROGRESS",
        qualityCheck: body.qualityCheck || null,
        notes: body.notes || null,
      },
    });

    // Update slab status
    if (body.status === "COMPLETED") {
      await prisma.slab.update({
        where: { id: body.slabId },
        data: {
          status: "POLISHED",
          currentStage: "QC",
          finishType: body.finishType || "POLISHED",
          glossLevel: body.glossLevel ? parseInt(body.glossLevel) : null,
        },
      });
    }

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Error creating polishing entry:", error);
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
  }
}
