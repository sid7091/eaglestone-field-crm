import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const visit = await prisma.visit.findUnique({
    where: { id },
    include: {
      customer: true,
      fieldRep: { select: { id: true, name: true, email: true } },
    },
  });

  if (!visit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Map to expected shape
  return NextResponse.json({
    ...visit,
    checkinLocation: visit.checkinLat ? { latitude: visit.checkinLat, longitude: visit.checkinLng, accuracy: visit.checkinAccuracy, timestamp: visit.checkinTime?.toISOString() } : null,
    checkoutLocation: visit.checkoutLat ? { latitude: visit.checkoutLat, longitude: visit.checkoutLng, accuracy: visit.checkoutAccuracy, timestamp: visit.checkoutTime?.toISOString() } : null,
    geofenceValidation: visit.geofenceDistance != null ? {
      customerLocation: { latitude: visit.customer.locationLat, longitude: visit.customer.locationLng },
      checkinLocation: { latitude: visit.checkinLat, longitude: visit.checkinLng },
      distanceFromCustomerMeters: visit.geofenceDistance,
      isWithinGeofence: visit.geofenceValid ?? false,
      geofenceRadiusMeters: 100,
      validationTimestamp: visit.checkinTime?.toISOString(),
    } : null,
    fieldRep: { ...visit.fieldRep, fullName: visit.fieldRep.name },
    photoUrls: visit.photoUrls ? JSON.parse(visit.photoUrls) : [],
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const visit = await prisma.visit.update({ where: { id }, data: body });
  return NextResponse.json(visit);
}
