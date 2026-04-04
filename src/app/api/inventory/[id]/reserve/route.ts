import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { customerId } = await request.json();

  const item = await prisma.fieldInventory.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (item.status !== "IN_STOCK" || item.quantityAvailable <= 0) {
    return NextResponse.json({ error: "Item not available for reservation" }, { status: 400 });
  }

  const updated = await prisma.fieldInventory.update({
    where: { id },
    data: {
      status: "RESERVED",
      reservedForId: customerId,
      reservedDate: new Date(),
      quantityReserved: item.quantityReserved + 1,
      quantityAvailable: item.quantityAvailable - 1,
    },
  });

  return NextResponse.json(updated);
}
