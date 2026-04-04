"use client";

import { useEffect, useRef, useState } from "react";

interface MapPoint {
  latitude: number;
  longitude: number;
  label: string;
  color?: "blue" | "green" | "red" | "orange";
}

interface GeofenceMapProps {
  /** Customer location — geofence circle drawn here */
  center: { latitude: number; longitude: number };
  /** Geofence radius in meters */
  radiusMeters?: number;
  /** Points to show (rep location, checkin, checkout, etc.) */
  markers?: MapPoint[];
  /** Map height */
  height?: string;
  /** Show the geofence circle */
  showGeofence?: boolean;
}

// Leaflet loaded from CDN to avoid bloating the Next.js bundle
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

const MARKER_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  orange: "#f97316",
};

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function loadCSS(href: string): void {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

export default function GeofenceMap({
  center,
  radiusMeters = 100,
  markers = [],
  height = "300px",
  showGeofence = true,
}: GeofenceMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        loadCSS(LEAFLET_CSS);
        await loadScript(LEAFLET_JS);
        if (cancelled) return;
        setLoaded(true);
      } catch {
        setError("Failed to load map library");
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loaded || !mapRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    if (!L) return;

    // Cleanup previous instance
    if (mapInstanceRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mapInstanceRef.current as any).remove();
    }

    const map = L.map(mapRef.current).setView(
      [center.latitude, center.longitude],
      17 // Zoom level ~100m view
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Geofence circle
    if (showGeofence) {
      L.circle([center.latitude, center.longitude], {
        radius: radiusMeters,
        color: "#3b82f6",
        fillColor: "#3b82f680",
        fillOpacity: 0.15,
        weight: 2,
        dashArray: "5, 5",
      }).addTo(map);
    }

    // Customer marker (center)
    const customerIcon = L.divIcon({
      html: `<div style="background:${MARKER_COLORS.blue};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
      className: "",
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    L.marker([center.latitude, center.longitude], { icon: customerIcon })
      .addTo(map)
      .bindPopup("Customer Location");

    // Additional markers
    for (const point of markers) {
      const color = MARKER_COLORS[point.color || "green"];
      const icon = L.divIcon({
        html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
        className: "",
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      L.marker([point.latitude, point.longitude], { icon })
        .addTo(map)
        .bindPopup(point.label);
    }

    // Fit bounds to show all markers
    if (markers.length > 0) {
      const allPoints = [
        [center.latitude, center.longitude],
        ...markers.map((m) => [m.latitude, m.longitude]),
      ];
      map.fitBounds(allPoints, { padding: [50, 50], maxZoom: 17 });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [loaded, center, radiusMeters, markers, showGeofence]);

  if (error) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-lg bg-stone-100 text-sm text-stone-500"
      >
        {error}
      </div>
    );
  }

  if (!loaded) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-lg bg-stone-100"
      >
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
      </div>
    );
  }

  return <div ref={mapRef} style={{ height }} className="rounded-lg overflow-hidden" />;
}
