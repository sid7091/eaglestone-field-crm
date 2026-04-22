"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import PhotoCapture from "@/components/ui/PhotoCapture";
import { api, NetworkError } from "@/lib/api-client";
import { addToPendingQueue } from "@/lib/offline-store";
import { requestBackgroundSync } from "@/lib/sync-manager";

interface Visit {
  id: string;
  visitDate: string;
  purpose: string;
  status: string;
  customerId: string;
  customer: { id: string; businessName: string; location: { latitude: number; longitude: number } | null };
}

interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
}

interface GeofenceResult {
  isValid: boolean;
  distanceMeters: number;
  flags: string[];
}

type Phase = "locate" | "confirming" | "checkedin" | "inprogress" | "checkout" | "done";

const INPUT_CLS =
  "mt-1 w-full rounded-sm border border-brand-brown/20 px-3 py-2 text-sm text-brand-brown bg-white focus:border-brand-tan focus:outline-none focus:ring-1 focus:ring-brand-tan/20";

const MICRO_LABEL_CLS =
  "font-display text-[10px] font-semibold tracking-[.12em] text-brand-olive/50 uppercase";

export default function CheckinPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-tan border-t-transparent" />
      </div>
    }>
      <CheckinPage />
    </Suspense>
  );
}

function CheckinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const visitId = searchParams.get("visitId");
  const [visit, setVisit] = useState<Visit | null>(null);
  const [phase, setPhase] = useState<Phase>("locate");
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [geofence, setGeofence] = useState<GeofenceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [summary, setSummary] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [orderValue, setOrderValue] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    if (!visitId) return;
    api.get<Visit>(`/visits/${visitId}`).then(setVisit).catch(() => {});
  }, [visitId]);

  const startGpsWatch = useCallback(() => {
    if (!navigator.geolocation) { setGpsError("Geolocation not supported by this browser"); return; }
    setGpsError(null);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy, altitude: pos.coords.altitude });
        setGpsError(null);
      },
      (err) => {
        setGpsError(
          err.code === 1 ? "Location permission denied. Please enable GPS." :
          err.code === 2 ? "Location unavailable. Move to an open area." :
          "GPS timeout. Retrying..."
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  }, []);

  useEffect(() => {
    startGpsWatch();
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startGpsWatch]);

  function startTimer() {
    timerRef.current = setInterval(() => setTimer((prev) => prev + 1), 1000);
  }

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  async function handleCheckin() {
    if (!visitId || !position) return;
    setLoading(true);
    try {
      const res = await api.post<{ visitId: string; status: string; geofence: GeofenceResult }>("/visits/checkin", {
        visitId,
        location: { latitude: position.latitude, longitude: position.longitude, accuracy: position.accuracy, altitude: position.altitude, timestamp: new Date().toISOString() },
      });
      setGeofence(res.geofence);
      if (res.geofence.isValid) { setPhase("checkedin"); startTimer(); }
      else { setPhase("confirming"); }
    } catch (err) {
      if (err instanceof NetworkError) {
        await addToPendingQueue("pending-visits", { type: "checkin", visitId, location: { latitude: position.latitude, longitude: position.longitude, accuracy: position.accuracy, timestamp: new Date().toISOString() } });
        await requestBackgroundSync("sync-visits");
        setPhase("checkedin"); startTimer();
      } else {
        alert("Check-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout() {
    if (!visitId || !position) return;
    setLoading(true);
    stopTimer();
    try {
      const res = await api.post<{ visitId: string; status: string; durationMinutes: number; geofence: GeofenceResult | null }>("/visits/checkout", {
        visitId,
        location: { latitude: position.latitude, longitude: position.longitude, accuracy: position.accuracy, altitude: position.altitude, timestamp: new Date().toISOString() },
        summary: summary || undefined,
        actionItems: actionItems || undefined,
        orderValueINR: orderValue ? parseFloat(orderValue) : undefined,
      });
      setGeofence(res.geofence);
      setPhase("done");
    } catch (err) {
      if (err instanceof NetworkError) {
        await addToPendingQueue("pending-visits", { type: "checkout", visitId, location: { latitude: position.latitude, longitude: position.longitude, accuracy: position.accuracy, timestamp: new Date().toISOString() }, summary, actionItems, orderValueINR: orderValue ? parseFloat(orderValue) : undefined });
        await requestBackgroundSync("sync-visits");
        setPhase("done");
      } else {
        alert("Checkout failed.");
        startTimer();
      }
    } finally {
      setLoading(false);
    }
  }

  if (!visitId) {
    return (
      <Card>
        <div className="p-8 text-center text-brand-olive/60">
          No visit ID specified. Go to{" "}
          <button onClick={() => router.push("/visits")} className="text-brand-tan underline">
            Visits
          </button>{" "}
          to select one.
        </div>
      </Card>
    );
  }

  const gpsDotColor = position
    ? position.accuracy <= 50 ? "bg-success" : "bg-warning"
    : "bg-danger";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Visit Header */}
      {visit && (
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-[18px] font-bold text-brand-brown">{visit.customer.businessName}</h2>
                <p className="text-sm text-brand-olive/60">{visit.purpose.replace(/_/g, " ")}</p>
              </div>
              <StatusBadge status={visit.status} />
            </div>
          </div>
        </Card>
      )}

      {/* GPS Status */}
      <Card>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${gpsDotColor} animate-pulse`} />
            <div>
              <p className="text-sm font-medium text-brand-brown">
                {!position ? "Acquiring GPS signal..." : `GPS locked (±${Math.round(position.accuracy)}m)`}
              </p>
              {position && (
                <p className="text-xs text-brand-olive/60">
                  {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
                </p>
              )}
              {gpsError && <p className="text-xs text-danger mt-1">{gpsError}</p>}
            </div>
          </div>
          {position && position.accuracy > 50 && (
            <div className="mt-3 rounded-sm bg-warning/10 p-3 text-xs text-warning">
              GPS accuracy is low ({Math.round(position.accuracy)}m). Move to an open area for better accuracy. Geofence validation requires ≤50m accuracy.
            </div>
          )}
        </div>
      </Card>

      {/* Geofence Status */}
      {geofence && (
        <Card>
          <div className={`p-4 rounded-lg ${geofence.isValid ? "bg-success/10" : "bg-danger/10"}`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${geofence.isValid ? "bg-success/20 text-success" : "bg-danger/20 text-danger"}`}>
                {geofence.isValid ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                )}
              </div>
              <div>
                <p className={`font-semibold ${geofence.isValid ? "text-success" : "text-danger"}`}>
                  {geofence.isValid ? "Geofence Verified" : "Outside Geofence"}
                </p>
                <p className={`text-sm ${geofence.isValid ? "text-success/80" : "text-danger/80"}`}>
                  {Math.round(geofence.distanceMeters)}m from customer location
                </p>
              </div>
            </div>
            {geofence.flags.length > 0 && (
              <div className="mt-3 space-y-1">
                {geofence.flags.map((flag, i) => (
                  <p key={i} className="text-xs text-danger">{flag}</p>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Timer (shown during visit) */}
      {(phase === "checkedin" || phase === "inprogress" || phase === "checkout") && (
        <Card>
          <div className="p-6 text-center">
            <p className={`${MICRO_LABEL_CLS} tracking-wider`}>Visit Duration</p>
            <p className="mt-2 font-mono text-4xl font-bold text-brand-brown">{formatTimer(timer)}</p>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Phase: Locate */}
        {phase === "locate" && (
          <button
            onClick={handleCheckin}
            disabled={!position || loading}
            className="w-full rounded-sm bg-success py-4 font-display text-lg font-bold text-white shadow-2 hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Verifying Location...
              </span>
            ) : "Check In"}
          </button>
        )}

        {/* Phase: Confirming — outside geofence */}
        {phase === "confirming" && (
          <>
            <div className="rounded-sm bg-danger/10 p-4 text-sm text-danger">
              You appear to be outside the 100m geofence radius. This visit will be flagged for review. Continue anyway?
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setPhase("checkedin"); startTimer(); }}
                className="flex-1 rounded-sm bg-warning py-3 font-display font-bold text-white hover:bg-warning/90"
              >
                Continue Anyway
              </button>
              <button
                onClick={() => { setPhase("locate"); setGeofence(null); }}
                className="flex-1 rounded-sm border border-brand-brown/20 py-3 font-display font-bold text-brand-olive hover:bg-brand-brown/5"
              >
                Retry Location
              </button>
            </div>
          </>
        )}

        {/* Phase: Checked in */}
        {(phase === "checkedin" || phase === "inprogress") && (
          <button
            onClick={() => setPhase("checkout")}
            className="w-full rounded-sm bg-brand-brown py-4 font-display text-lg font-bold text-white shadow-2 hover:bg-brand-brown/90"
          >
            Ready to Check Out
          </button>
        )}

        {/* Phase: Checkout — fill summary */}
        {phase === "checkout" && (
          <Card>
            <div className="p-4 space-y-4">
              <h3 className="font-display text-[15px] font-bold text-brand-brown">Visit Summary</h3>
              <div>
                <label className={MICRO_LABEL_CLS}>Summary</label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="What was discussed? Key outcomes..."
                  rows={3}
                  className={INPUT_CLS + " resize-none"}
                />
              </div>
              <div>
                <label className={MICRO_LABEL_CLS}>Action Items</label>
                <textarea
                  value={actionItems}
                  onChange={(e) => setActionItems(e.target.value)}
                  placeholder="Follow-up tasks, samples to send..."
                  rows={2}
                  className={INPUT_CLS + " resize-none"}
                />
              </div>
              <div>
                <label className={MICRO_LABEL_CLS}>Order Value (INR)</label>
                <input
                  type="number"
                  value={orderValue}
                  onChange={(e) => setOrderValue(e.target.value)}
                  placeholder="0"
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={`mb-2 block ${MICRO_LABEL_CLS}`}>Site Photos</label>
                {visitId && <PhotoCapture visitId={visitId} />}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="flex-1 rounded-sm bg-danger py-3 font-display font-bold text-white hover:bg-danger/90 disabled:opacity-50"
                >
                  {loading ? "Checking out..." : "Check Out"}
                </button>
                <button
                  onClick={() => setPhase("inprogress")}
                  className="rounded-sm border border-brand-brown/20 px-4 py-3 text-sm text-brand-olive hover:bg-brand-brown/5"
                >
                  Back
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Phase: Done */}
        {phase === "done" && (
          <Card>
            <div className="p-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
                  <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="font-display text-[18px] font-bold text-brand-brown">Visit Completed!</h3>
              <p className="text-sm text-brand-olive/60">Duration: {formatTimer(timer)}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/visits/${visitId}`)}
                  className="flex-1 rounded-sm bg-brand-tan py-2 font-display text-[13px] font-bold text-brand-brown hover:bg-brand-tan-dark"
                >
                  View Details
                </button>
                <button
                  onClick={() => router.push("/visits")}
                  className="flex-1 rounded-sm border border-brand-brown/20 py-2 text-sm text-brand-olive hover:bg-brand-brown/5"
                >
                  All Visits
                </button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Map placeholder */}
      {position && visit?.customer.location && (
        <Card>
          <div className="p-4">
            <div className="flex h-40 items-center justify-center rounded-sm bg-brand-brown/5 text-sm text-brand-olive/40">
              <div className="text-center">
                <p>Map View</p>
                <p className="mt-1 text-xs">
                  You: {position.latitude.toFixed(4)}, {position.longitude.toFixed(4)} |
                  Customer: {visit.customer.location.latitude.toFixed(4)}, {visit.customer.location.longitude.toFixed(4)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
