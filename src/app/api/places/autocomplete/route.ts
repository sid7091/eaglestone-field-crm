import { NextRequest, NextResponse } from "next/server";

// Use OpenStreetMap Nominatim for geocoding (free, no API key needed)
export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input");
  if (!input || input.length < 3) {
    return NextResponse.json({ predictions: [] });
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", input);
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("countrycodes", "in");
    url.searchParams.set("limit", "5");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "EaglestoneFieldCRM/1.0" },
      cache: "no-store",
    });
    const data = await res.json();

    return NextResponse.json({
      predictions: data.map((item: {
        place_id: number;
        display_name: string;
        lat: string;
        lon: string;
        address: Record<string, string>;
      }) => ({
        place_id: String(item.place_id),
        description: item.display_name,
        lat: item.lat,
        lng: item.lon,
        city: item.address?.city || item.address?.town || item.address?.village || "",
        district: item.address?.state_district || item.address?.county || "",
        state: item.address?.state || "",
        pincode: item.address?.postcode || "",
      })),
    });
  } catch (err) {
    console.error("Nominatim fetch error:", err);
    return NextResponse.json({ predictions: [], error: "Failed to fetch suggestions" });
  }
}
