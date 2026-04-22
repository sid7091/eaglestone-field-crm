import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  if (GOOGLE_API_KEY) {
    try {
      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.searchParams.set("latlng", `${lat},${lng}`);
      url.searchParams.set("key", GOOGLE_API_KEY);
      url.searchParams.set("language", "en");

      const res = await fetch(url.toString());
      const data = await res.json();

      if (data.status === "OK" && data.results?.length > 0) {
        const result = data.results[0];
        const components = result.address_components || [];

        const get = (type: string) =>
          components.find((c: { types: string[] }) => c.types.includes(type))?.long_name || "";

        return NextResponse.json({
          address: result.formatted_address || "",
          city: get("locality") || get("sublocality_level_1") || get("administrative_area_level_3"),
          district: get("administrative_area_level_2"),
          state: get("administrative_area_level_1"),
          pincode: get("postal_code"),
          lat,
          lng,
          source: "google",
        });
      }
    } catch (err) {
      console.error("Google reverse geocode error:", err);
    }
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lng);
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "EaglestoneFieldCRM/1.0" },
    });
    const data = await res.json();
    const addr = data.address || {};

    return NextResponse.json({
      address: data.display_name || "",
      city: addr.city || addr.town || addr.village || "",
      district: addr.state_district || addr.county || "",
      state: addr.state || "",
      pincode: addr.postcode || "",
      lat,
      lng,
      source: "nominatim",
    });
  } catch (err) {
    console.error("Nominatim reverse geocode error:", err);
    return NextResponse.json({ error: "Reverse geocoding failed" }, { status: 500 });
  }
}
