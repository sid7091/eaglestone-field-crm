import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { visitId, location, summary, actionItems, orderValueINR } = await request.json();
  if (!visitId || !location?.latitude || !location?.longitude) {
    return NextResponse.json({ error: "Missing visitId or location" }, { status: 400 });
  }

  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit) return NextResponse.json({ error: "Visit not found" }, { status: 404 });

  const now = new Date();
  const durationMinutes = visit.checkinTime
    ? Math.round((now.getTime() - visit.checkinTime.getTime()) / 60000)
    : 0;

  await prisma.visit.update({
    where: { id: visitId },
    data: {
      status: "COMPLETED",
      checkoutTime: now,
      checkoutLat: location.latitude,
      checkoutLng: location.longitude,
      checkoutAccuracy: location.accuracy,
      durationMinutes,
      summary: summary || null,
      actionItems: actionItems || null,
      orderValueINR: orderValueINR ?? null,
    },
  });

  return NextResponse.json({
    visitId,
    status: "COMPLETED",
    durationMinutes,
    geofence: null,
  });
}
