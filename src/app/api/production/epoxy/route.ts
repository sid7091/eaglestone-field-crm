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

  const entries = await prisma.epoxyEntry.findMany({
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

    const count = await prisma.epoxyEntry.count();
    const year = new Date().getFullYear();
    const entryNumber = `EP-${year}-${String(count + 1).padStart(4, "0")}`;

    const entry = await prisma.epoxyEntry.create({
      data: {
        entryNumber,
        slabId: body.slabId,
        machineId: body.machineId,
        operatorId: body.operatorId || user.userId,
        startTime: new Date(body.startTime),
        endTime: body.endTime ? new Date(body.endTime) : null,
        epoxyType: body.epoxyType || null,
        epoxyQuantityMl: body.epoxyQuantityMl ? parseFloat(body.epoxyQuantityMl) : null,
        vacuumPressure: body.vacuumPressure ? parseFloat(body.vacuumPressure) : null,
        curingTimeMin: body.curingTimeMin ? parseInt(body.curingTimeMin) : null,
        temperatureC: body.temperatureC ? parseFloat(body.temperatureC) : null,
        meshApplied: body.meshApplied || false,
        meshType: body.meshType || null,
        status: body.status || "IN_PROGRESS",
        qualityCheck: body.qualityCheck || null,
        notes: body.notes || null,
      },
    });

    // Update slab status
    if (body.status === "COMPLETED") {
      await prisma.slab.update({
        where: { id: body.slabId },
        data: { status: "EPOXY_DONE", currentStage: "POLISHING" },
      });
    }

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Error creating epoxy entry:", error);
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
  }
}
