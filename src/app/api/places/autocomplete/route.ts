import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input");
  if (!input || input.length < 3) {
    return NextResponse.json({ predictions: [] });
  }

  if (!GOOGLE_API_KEY) {
    return NextResponse.json(
      { error: "Google Places API key not configured" },
      { status: 503 }
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", input);
  url.searchParams.set("key", GOOGLE_API_KEY);
  url.searchParams.set("components", "country:in"); // Restrict to India
  url.searchParams.set("types", "geocode|establishment");

  const res = await fetch(url.toString());
  const data = await res.json();

  return NextResponse.json({
    predictions: (data.predictions || []).map((p: { place_id: string; description: string }) => ({
      place_id: p.place_id,
      description: p.description,
    })),
  });
}
