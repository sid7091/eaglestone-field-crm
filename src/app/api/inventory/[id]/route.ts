import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.fieldInventory.findUnique({
    where: { id },
    include: { reservedFor: { select: { id: true, businessName: true } } },
  });

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...item,
    reservedForCustomer: item.reservedFor ? { id: item.reservedFor.id, businessName: item.reservedFor.businessName } : null,
  });
}
