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

  const body = await request.json();

  // Map frontend location object to flat Prisma fields
  if (body.location) {
    body.locationLat = body.location.latitude ?? null;
    body.locationLng = body.location.longitude ?? null;
    delete body.location;
  }

  const customer = await prisma.customer.create({ data: body });
  return NextResponse.json(mapCustomer(customer as unknown as Record<string, unknown>), { status: 201 });
}
