import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const GEOFENCE_RADIUS = 100; // meters

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { visitId, location } = await request.json();
  if (!visitId || !location?.latitude || !location?.longitude) {
    return NextResponse.json({ error: "Missing visitId or location" }, { status: 400 });
  }

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: { customer: true },
  });
  if (!visit) return NextResponse.json({ error: "Visit not found" }, { status: 404 });

  // Geofence validation
  let distanceMeters = 0;
  let isValid = true;
  const flags: string[] = [];

  if (visit.customer.locationLat != null && visit.customer.locationLng != null) {
    distanceMeters = haversineDistance(
      location.latitude, location.longitude,
      visit.customer.locationLat, visit.customer.locationLng
    );
    isValid = distanceMeters <= GEOFENCE_RADIUS;
    if (!isValid) flags.push(`Distance ${Math.round(distanceMeters)}m exceeds ${GEOFENCE_RADIUS}m geofence`);
  }

  if (location.accuracy > 50) {
    flags.push(`GPS accuracy is ${Math.round(location.accuracy)}m (>50m threshold)`);
  }

  const now = new Date();
  await prisma.visit.update({
    where: { id: visitId },
    data: {
      status: isValid ? "CHECKED_IN" : "FLAGGED_FAKE",
      checkinTime: now,
      checkinLat: location.latitude,
      checkinLng: location.longitude,
      checkinAccuracy: location.accuracy,
      geofenceDistance: distanceMeters,
      geofenceValid: isValid,
    },
  });

  return NextResponse.json({
    visitId,
    status: isValid ? "CHECKED_IN" : "FLAGGED_FAKE",
    geofence: { isValid, distanceMeters, flags },
  });
}
