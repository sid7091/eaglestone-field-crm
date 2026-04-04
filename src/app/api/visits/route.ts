import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const customerId = sp.get("customerId");
  const status = sp.get("status");
  const dateFrom = sp.get("dateFrom");
  const dateTo = sp.get("dateTo");
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(sp.get("limit") || "50", 10)));

  const where: Record<string, unknown> = {};
  if (customerId) where.customerId = customerId;
  if (status) where.status = status;
  if (dateFrom || dateTo) {
    where.visitDate = {};
    if (dateFrom) (where.visitDate as Record<string, string>).gte = dateFrom;
    if (dateTo) (where.visitDate as Record<string, string>).lte = dateTo;
  }

  const [data, total] = await Promise.all([
    prisma.visit.findMany({
      where,
      orderBy: { visitDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        customer: { select: { id: true, businessName: true, locationLat: true, locationLng: true } },
        fieldRep: { select: { id: true, name: true } },
      },
    }),
    prisma.visit.count({ where }),
  ]);

  return NextResponse.json({
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const visit = await prisma.visit.create({
    data: {
      ...body,
      fieldRepId: user.userId,
      status: "PLANNED",
    },
  });
  return NextResponse.json(visit, { status: 201 });
}
