import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [customers, visits] = await Promise.all([
    prisma.customer.findMany({ select: { tier: true, leadStatus: true } }),
    prisma.visit.findMany({
      where: { visitDate: { gte: monthStart, lte: monthEnd } },
      select: {
        status: true,
        durationMinutes: true,
        orderValueINR: true,
        geofenceValid: true,
        fieldRepId: true,
        fieldRep: { select: { name: true } },
      },
    }),
  ]);

  const totalCustomers = customers.length;
  const customersByTier: Record<string, number> = {};
  const customersByStatus: Record<string, number> = {};
  for (const c of customers) {
    customersByTier[c.tier] = (customersByTier[c.tier] || 0) + 1;
    customersByStatus[c.leadStatus] = (customersByStatus[c.leadStatus] || 0) + 1;
  }

  const totalVisitsThisMonth = visits.length;
  const completedVisits = visits.filter((v) => v.status === "COMPLETED").length;
  const flaggedVisits = visits.filter((v) => v.status === "FLAGGED_FAKE").length;
  const durations = visits.filter((v) => v.durationMinutes != null).map((v) => v.durationMinutes!);
  const avgVisitDurationMinutes = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const totalOrderValueThisMonth = visits.reduce((sum, v) => sum + (v.orderValueINR || 0), 0);
  const geofenceChecked = visits.filter((v) => v.geofenceValid != null);
  const geofenceComplianceRate = geofenceChecked.length > 0
    ? Math.round((geofenceChecked.filter((v) => v.geofenceValid).length / geofenceChecked.length) * 100)
    : 100;

  // Top field reps
  const repStats: Record<string, { name: string; visitCount: number; orderValue: number }> = {};
  for (const v of visits) {
    if (v.status === "COMPLETED") {
      if (!repStats[v.fieldRepId]) repStats[v.fieldRepId] = { name: v.fieldRep.name, visitCount: 0, orderValue: 0 };
      repStats[v.fieldRepId].visitCount++;
      repStats[v.fieldRepId].orderValue += v.orderValueINR || 0;
    }
  }
  const topFieldReps = Object.entries(repStats)
    .sort((a, b) => b[1].visitCount - a[1].visitCount)
    .slice(0, 5)
    .map(([repId, stats], i) => ({ rank: i + 1, repId, ...stats }));

  return NextResponse.json({
    data: {
      totalCustomers,
      customersByTier,
      customersByStatus,
      totalVisitsThisMonth,
      completedVisits,
      flaggedVisits,
      avgVisitDurationMinutes,
      totalOrderValueThisMonth,
      geofenceComplianceRate,
      topFieldReps,
    },
  });
}
