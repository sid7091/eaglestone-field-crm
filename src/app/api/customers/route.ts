import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// Transform DB record to frontend shape
function mapCustomer(c: Record<string, unknown>) {
  const { locationLat, locationLng, preferredMaterials, currentRequirements, ...rest } = c;

  // Parse JSON string arrays back to arrays
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

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const search = sp.get("search");
  const customerType = sp.get("customerType");
  const tier = sp.get("tier");
  const leadStatus = sp.get("leadStatus");
  const regionCode = sp.get("regionCode");
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(sp.get("limit") || "50", 10)));

  const where: Record<string, unknown> = {};
  if (customerType) where.customerType = customerType;
  if (tier) where.tier = tier;
  if (leadStatus) where.leadStatus = leadStatus;
  if (regionCode) where.regionCode = regionCode;
  if (search) {
    where.OR = [
      { businessName: { contains: search } },
      { contactPerson: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({
    data: data.map((c) => mapCustomer(c as unknown as Record<string, unknown>)),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();

    // Map frontend location object to flat Prisma fields
    if (body.location) {
      body.locationLat = body.location.latitude ?? null;
      body.locationLng = body.location.longitude ?? null;
      body.locationAccuracy = body.location.accuracy ?? null;
      delete body.location;
    }

    // preferredMaterials comes as string[] from frontend, Prisma expects String? (JSON)
    if (Array.isArray(body.preferredMaterials)) {
      body.preferredMaterials = JSON.stringify(body.preferredMaterials);
    }

    // currentRequirements comes as array from frontend, Prisma expects String? (JSON)
    if (Array.isArray(body.currentRequirements)) {
      body.currentRequirements = JSON.stringify(body.currentRequirements);
    }

    const customer = await prisma.customer.create({ data: body });
    return NextResponse.json(mapCustomer(customer as unknown as Record<string, unknown>), { status: 201 });
  } catch (err: unknown) {
    console.error("Customer create error:", err);
    const message = err instanceof Error ? err.message : "Failed to create customer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
