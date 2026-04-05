import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input");
  if (!input || input.length < 3) {
    return NextResponse.json({ predictions: [] });
  }

  if (!GOOGLE_API_KEY) {
    console.error("GOOGLE_PLACES_API_KEY not set");
    return NextResponse.json({ predictions: [], error: "API key not configured" });
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", input);
    url.searchParams.set("key", GOOGLE_API_KEY);
    url.searchParams.set("components", "country:in");

    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Places API error:", data.status, data.error_message);
      return NextResponse.json({ predictions: [], error: data.error_message || data.status });
    }

    return NextResponse.json({
      predictions: (data.predictions || []).map((p: { place_id: string; description: string }) => ({
        place_id: p.place_id,
        description: p.description,
      })),
    });
  } catch (err) {
    console.error("Places autocomplete fetch error:", err);
    return NextResponse.json({ predictions: [], error: "Failed to fetch suggestions" });
  }
}
