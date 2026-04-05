import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// Transform DB record to frontend shape
function mapCustomer(c: Record<string, unknown>) {
  const { locationLat, locationLng, preferredMaterials, currentRequirements, ...rest } = c;

  let parsedMaterials: string[] = [];
  if (typeof preferredMaterials === "string") {
    try { parsedMaterials = JSON.parse(preferredMaterials); } catch { /* ignore */ }
  }

  let parsedRequirements: unknown[] = [];
  if (typeof currentRequirements === "string") {
    try { parsedRequirements = JSON.parse(currentRequirements); } catch { /* ignore */ }
  }

  return {
    ...rest,
    location: locationLat != null && locationLng != null
      ? { latitude: locationLat, longitude: locationLng }
      : null,
    preferredMaterials: parsedMaterials,
    currentRequirements: parsedRequirements,
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

  try {
    const { id } = await params;
    const body = await request.json();

    // Map frontend location object to flat Prisma fields
    if (body.location) {
      body.locationLat = body.location.latitude ?? null;
      body.locationLng = body.location.longitude ?? null;
      body.locationAccuracy = body.location.accuracy ?? null;
      delete body.location;
    }

    if (Array.isArray(body.preferredMaterials)) {
      body.preferredMaterials = JSON.stringify(body.preferredMaterials);
    }

    if (Array.isArray(body.currentRequirements)) {
      body.currentRequirements = JSON.stringify(body.currentRequirements);
    }

    const customer = await prisma.customer.update({ where: { id }, data: body });
    return NextResponse.json(mapCustomer(customer as unknown as Record<string, unknown>));
  } catch (err: unknown) {
    console.error("Customer update error:", err);
    const message = err instanceof Error ? err.message : "Failed to update customer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
