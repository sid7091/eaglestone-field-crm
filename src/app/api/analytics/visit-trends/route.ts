import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Last 7 days
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const visits = await prisma.visit.findMany({
    where: { visitDate: { gte: dates[0], lte: dates[6] } },
    select: { visitDate: true, status: true },
  });

  const trends = dates.map((date) => {
    const dayVisits = visits.filter((v) => v.visitDate === date);
    return {
      date,
      planned: dayVisits.filter((v) => v.status === "PLANNED").length,
      completed: dayVisits.filter((v) => v.status === "COMPLETED").length,
      flagged: dayVisits.filter((v) => v.status === "FLAGGED_FAKE").length,
    };
  });

  return NextResponse.json({ data: trends });
}
