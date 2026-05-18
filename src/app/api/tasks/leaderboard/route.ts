import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await getCurrentUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!actor) return NextResponse.json({ error: "Unknown user" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "20", 10)));
  const regionFilter =
    actor.role === "ADMIN" ? sp.get("regionCode") : actor.regionCode;
  const department = sp.get("department");

  const rows = await prisma.userGamification.findMany({
    orderBy: [{ totalPoints: "desc" }, { currentStreak: "desc" }],
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
          department: true,
          regionCode: true,
        },
      },
    },
  });

  const data = rows
    .filter((r) => {
      if (regionFilter && r.user.regionCode !== regionFilter) return false;
      if (department && r.user.department !== department) return false;
      return true;
    })
    .slice(0, limit)
    .map((r) => ({
      userId: r.userId,
      name: r.user.name,
      role: r.user.role,
      department: r.user.department,
      regionCode: r.user.regionCode,
      totalPoints: r.totalPoints,
      currentStreak: r.currentStreak,
      bestStreak: r.bestStreak,
      badges: JSON.parse(r.badges || "[]"),
    }));

  return NextResponse.json({ data });
}
