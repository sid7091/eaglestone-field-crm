import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("place_id");
  if (!placeId) {
    return NextResponse.json({ error: "place_id required" }, { status: 400 });
  }

  if (!GOOGLE_API_KEY) {
    return NextResponse.json(
      { error: "Google Places API key not configured" },
      { status: 503 }
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("key", GOOGLE_API_KEY);
  url.searchParams.set("fields", "formatted_address,address_components,geometry");

  const res = await fetch(url.toString());
  const data = await res.json();

  return NextResponse.json({ result: data.result || null });
}
