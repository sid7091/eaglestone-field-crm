import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAssign } from "@/lib/tasks";

export async function GET(request: NextRequest) {
  const auth = await getCurrentUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!actor) return NextResponse.json({ error: "Unknown user" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const isAdmin = actor.role === "ADMIN";

  const where: Record<string, unknown> = { isActive: true };
  if (!(sp.get("all") === "true" && isAdmin) && !isAdmin) {
    where.regionCode = actor.regionCode;
  }
  if (sp.get("role")) where.role = sp.get("role");
  if (sp.get("department")) where.department = sp.get("department");
  if (sp.get("regionCode")) where.regionCode = sp.get("regionCode");
  if (sp.get("reportsTo")) where.reportsTo = sp.get("reportsTo");
  const q = sp.get("q");
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { name: "asc" },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      regionCode: true,
      department: true,
      reportsTo: true,
      isActive: true,
    },
  });

  const data = users.map((u) => ({
    ...u,
    assignable: canAssign(actor, u),
  }));
  return NextResponse.json({ data });
}
