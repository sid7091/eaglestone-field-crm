import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input");
  if (!input || input.length < 3) {
    return NextResponse.json({ predictions: [] });
  }

  if (!GOOGLE_API_KEY) {
    return NextResponse.json(
      { predictions: [], error: "Google Places API key not configured" },
      { status: 503 }
    );
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", input);
    url.searchParams.set("key", GOOGLE_API_KEY);
    // Restrict to India to match existing behavior
    url.searchParams.set("components", "country:in");

    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Google Places API error:", data);
      return NextResponse.json({ predictions: [], error: data.error_message || "API error" }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return NextResponse.json({
      predictions: (data.predictions || []).map((item: any) => ({
        place_id: item.place_id,
        description: item.description,
      })),
    });
  } catch (err) {
    console.error("Google Places autocomplete error:", err);
    return NextResponse.json({ predictions: [], error: "Failed to fetch suggestions" }, { status: 500 });
  }
}
