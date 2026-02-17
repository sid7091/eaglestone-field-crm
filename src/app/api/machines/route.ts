import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type");

  const where: Record<string, unknown> = {};
  if (type) where.type = type;

  const machines = await prisma.machine.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ machines });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();

    const machine = await prisma.machine.create({
      data: {
        name: body.name,
        code: body.code,
        type: body.type,
        manufacturer: body.manufacturer || null,
        model: body.model || null,
        location: body.location || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json({ machine }, { status: 201 });
  } catch (error) {
    console.error("Error creating machine:", error);
    return NextResponse.json({ error: "Failed to create machine" }, { status: 500 });
  }
}
