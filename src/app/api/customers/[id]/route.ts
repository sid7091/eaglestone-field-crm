import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// Transform flat locationLat/Lng to nested location object for frontend
function mapCustomer(c: Record<string, unknown>) {
  const { locationLat, locationLng, ...rest } = c;
  return {
    ...rest,
    location: locationLat != null && locationLng != null
      ? { latitude: locationLat, longitude: locationLng }
      : null,
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { visits: { orderBy: { createdAt: "desc" }, take: 10 } },
  });

  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(mapCustomer(customer as unknown as Record<string, unknown>));
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  // Map frontend location object to flat Prisma fields
  if (body.location) {
    body.locationLat = body.location.latitude ?? null;
    body.locationLng = body.location.longitude ?? null;
    delete body.location;
  }

  const customer = await prisma.customer.update({ where: { id }, data: body });
  return NextResponse.json(mapCustomer(customer as unknown as Record<string, unknown>));
}
