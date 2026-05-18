import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getCurrentUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.reportsTo !== undefined && body.reportsTo !== null) {
    if (body.reportsTo === id) {
      return NextResponse.json(
        { error: "A user cannot report to themselves" },
        { status: 400 },
      );
    }
    // Cycle detection: walk up the proposed chain
    let cursor: string | null = body.reportsTo;
    const seen = new Set<string>([id]);
    while (cursor) {
      if (seen.has(cursor)) {
        return NextResponse.json(
          { error: "Reporting change would create a cycle" },
          { status: 400 },
        );
      }
      seen.add(cursor);
      const mgr: { reportsTo: string | null } | null =
        await prisma.user.findUnique({
          where: { id: cursor },
          select: { reportsTo: true },
        });
      cursor = mgr?.reportsTo ?? null;
    }
    data.reportsTo = body.reportsTo;
  } else if (body.reportsTo === null) {
    data.reportsTo = null;
  }

  if (body.role !== undefined) data.role = body.role;
  if (body.department !== undefined) data.department = body.department;
  if (body.regionCode !== undefined) data.regionCode = body.regionCode;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      regionCode: true,
      reportsTo: true,
      isActive: true,
    },
  });
  return NextResponse.json(updated);
}
