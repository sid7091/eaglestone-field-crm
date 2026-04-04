"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import GeofenceMap from "@/components/ui/GeofenceMap";
import { api, ApiError } from "@/lib/api-client";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeoPoint {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

interface GeofenceValidation {
  customerLocation: GeoPoint;
  checkinLocation: GeoPoint;
  checkoutLocation?: GeoPoint;
  distanceFromCustomerMeters: number;
  isWithinGeofence: boolean;
  geofenceRadiusMeters: number;
  validationTimestamp: string;
}

interface VisitDetail {
  id: string;
  visitDate: string;
  purpose: string;
  status: string;
  regionCode: string;
  checkinTime: string | null;
  checkoutTime: string | null;
  durationMinutes: number | null;
  checkinLocation: GeoPoint | null;
  checkoutLocation: GeoPoint | null;
  geofenceValidation: GeofenceValidation | null;
  summary: string | null;
  actionItems: string | null;
  nextSteps: string | null;
  followUpDate: string | null;
  orderValueINR: number | null;
  photoUrls: string[];
  createdOffline: boolean;
  customer: {
    id: string;
    businessName: string;
    contactPerson: string | null;
    phone: string;
    city: string | null;
    district: string;
    regionCode: string;
  } | null;
  fieldRep: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Status timeline config ───────────────────────────────────────────────────

const TIMELINE_STEPS = [
  { status: "PLANNED", label: "Planned" },
  { status: "CHECKED_IN", label: "Checked In" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "CHECKED_OUT", label: "Checked Out" },
  { status: "COMPLETED", label: "Completed" },
] as const;

const STATUS_ORDER: Record<string, number> = {
  PLANNED: 0,
  CHECKED_IN: 1,
  IN_PROGRESS: 2,
  CHECKED_OUT: 3,
  COMPLETED: 4,
  CANCELLED: -1,
  FLAGGED_FAKE: -1,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Inline edit state
  const [editMode, setEditMode] = useState(false);
  const [summary, setSummary] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    async function fetchVisit() {
      setLoading(true);
      setError("");
      try {
        const data = await api.get<VisitDetail>(`/visits/${id}`);
        setVisit(data);
        setSummary(data.summary ?? "");
        setActionItems(data.actionItems ?? "");
        setNextSteps(data.nextSteps ?? "");
        setFollowUpDate(data.followUpDate ?? "");
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 404) {
          setError("Visit not found.");
        } else {
          setError(err instanceof Error ? err.message : "Failed to load visit");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchVisit();
  }, [id]);

  const handleSave = async () => {
    if (!visit) return;
    setSaving(true);
    setSaveError("");
    try {
      const body: Record<string, unknown> = {
        summary: summary || null,
        actionItems: actionItems || null,
        nextSteps: nextSteps || null,
        followUpDate: followUpDate || null,
      };
      const updated = await api.put<VisitDetail>(`/visits/${id}`, body);
      setVisit(updated);
      setEditMode(false);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!visit) return;
    setSummary(visit.summary ?? "");
    setActionItems(visit.actionItems ?? "");
    setNextSteps(visit.nextSteps ?? "");
    setFollowUpDate(visit.followUpDate ?? "");
    setSaveError("");
    setEditMode(false);
  };

  // ─── Render states ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
        <button
          onClick={() => router.push("/visits")}
          className="mt-4 text-sm text-stone-600 hover:underline"
        >
          ← Back to Visits
        </button>
      </div>
    );
  }

  if (!visit) return null;

  const currentStatusOrder = STATUS_ORDER[visit.status] ?? -1;
  const isFlagged = visit.status === "FLAGGED_FAKE";
  const isCancelled = visit.status === "CANCELLED";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back + header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/visits"
            className="mt-1 rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-stone-900">
                Visit — {visit.customer?.businessName ?? "Unknown Customer"}
              </h1>
              <StatusBadge status={visit.status} />
            </div>
            <p className="text-sm text-stone-500">
              {formatDate(visit.visitDate)} ·{" "}
              {visit.purpose.replace(/_/g, " ")} ·{" "}
              {visit.fieldRep?.fullName ?? "Unknown Rep"}
            </p>
          </div>
        </div>

        {/* Edit toggle */}
        {!isCancelled && !isFlagged && (
          <button
            onClick={() => setEditMode((v) => !v)}
            className="w-fit rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            {editMode ? "Discard" : "Edit Notes"}
          </button>
        )}
      </div>

      {/* Flagged banner */}
      {isFlagged && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-semibold text-red-700">This visit has been flagged as potentially fake.</p>
          <p className="text-sm text-red-600">
            The check-in location did not pass geofence validation. Review the geofence details below.
          </p>
        </div>
      )}

      {/* Timeline */}
      {!isCancelled && !isFlagged && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
              Visit Progress
            </h2>
          </CardHeader>
          <CardContent>
            <ol className="flex items-center">
              {TIMELINE_STEPS.map((step, idx) => {
                const stepOrder = STATUS_ORDER[step.status] ?? 0;
                const isDone = currentStatusOrder > stepOrder;
                const isCurrent = currentStatusOrder === stepOrder;
                const isLast = idx === TIMELINE_STEPS.length - 1;

                return (
                  <li key={step.status} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                          isDone
                            ? "border-amber-500 bg-amber-500 text-white"
                            : isCurrent
                            ? "border-amber-500 bg-white text-amber-600"
                            : "border-stone-300 bg-white text-stone-400"
                        }`}
                      >
                        {isDone ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <span
                        className={`mt-1 text-center text-xs font-medium ${
                          isDone || isCurrent ? "text-stone-700" : "text-stone-400"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {!isLast && (
                      <div
                        className={`h-0.5 flex-1 ${
                          isDone ? "bg-amber-500" : "bg-stone-200"
                        }`}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Visit info */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-stone-800">Visit Information</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Customer">
              <Link
                href={`/customers/${visit.customer?.id}`}
                className="font-medium text-amber-600 hover:underline"
              >
                {visit.customer?.businessName}
              </Link>
            </InfoRow>
            {visit.customer?.contactPerson && (
              <InfoRow label="Contact">{visit.customer.contactPerson}</InfoRow>
            )}
            {visit.customer?.phone && (
              <InfoRow label="Phone">
                <span className="font-mono">{visit.customer.phone}</span>
              </InfoRow>
            )}
            <InfoRow label="Date">{formatDate(visit.visitDate)}</InfoRow>
            <InfoRow label="Purpose">{visit.purpose.replace(/_/g, " ")}</InfoRow>
            <InfoRow label="Region">
              <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                {visit.regionCode}
              </span>
            </InfoRow>
            <InfoRow label="Field Rep">{visit.fieldRep?.fullName ?? "—"}</InfoRow>
            {visit.checkinTime && (
              <InfoRow label="Check-in">{formatDateTime(visit.checkinTime)}</InfoRow>
            )}
            {visit.checkoutTime && (
              <InfoRow label="Check-out">{formatDateTime(visit.checkoutTime)}</InfoRow>
            )}
            {visit.durationMinutes != null && (
              <InfoRow label="Duration">{visit.durationMinutes} minutes</InfoRow>
            )}
            {visit.orderValueINR != null && (
              <InfoRow label="Order Value">
                <span className="font-semibold text-green-700">
                  {formatCurrency(visit.orderValueINR)}
                </span>
              </InfoRow>
            )}
            {visit.followUpDate && (
              <InfoRow label="Follow-up">{formatDate(visit.followUpDate)}</InfoRow>
            )}
            {visit.createdOffline && (
              <InfoRow label="Created">
                <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">
                  Offline Sync
                </span>
              </InfoRow>
            )}
          </CardContent>
        </Card>

        {/* Geofence validation */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-800">Geofence Validation</h2>
              {visit.geofenceValidation && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    visit.geofenceValidation.isWithinGeofence
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {visit.geofenceValidation.isWithinGeofence ? (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Valid
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      Invalid
                    </>
                  )}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {visit.geofenceValidation ? (
              <div className="space-y-3">
                <InfoRow label="Distance from Customer">
                  <span
                    className={`font-semibold ${
                      visit.geofenceValidation.isWithinGeofence
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {Math.round(visit.geofenceValidation.distanceFromCustomerMeters)} m
                  </span>
                </InfoRow>
                <InfoRow label="Geofence Radius">
                  {visit.geofenceValidation.geofenceRadiusMeters} m
                </InfoRow>
                {visit.checkinLocation && (
                  <>
                    <InfoRow label="Check-in Coords">
                      <span className="font-mono text-xs text-stone-600">
                        {visit.checkinLocation.latitude.toFixed(6)}, {visit.checkinLocation.longitude.toFixed(6)}
                      </span>
                    </InfoRow>
                    {visit.checkinLocation.accuracy && (
                      <InfoRow label="GPS Accuracy">±{Math.round(visit.checkinLocation.accuracy)} m</InfoRow>
                    )}
                  </>
                )}
                {visit.checkoutLocation && (
                  <InfoRow label="Check-out Coords">
                    <span className="font-mono text-xs text-stone-600">
                      {visit.checkoutLocation.latitude.toFixed(6)}, {visit.checkoutLocation.longitude.toFixed(6)}
                    </span>
                  </InfoRow>
                )}
                <InfoRow label="Validated At">
                  {formatDateTime(visit.geofenceValidation.validationTimestamp)}
                </InfoRow>
              </div>
            ) : (
              <p className="text-sm text-stone-500">
                Geofence data will be recorded when the field rep checks in.
              </p>
            )}

            {/* Geofence Map */}
            <div className="mt-4">
              {visit.geofenceValidation ? (
                <GeofenceMap
                  center={visit.geofenceValidation.customerLocation}
                  radiusMeters={visit.geofenceValidation.geofenceRadiusMeters}
                  showGeofence
                  height="240px"
                  markers={[
                    ...(visit.checkinLocation
                      ? [{
                          latitude: visit.checkinLocation.latitude,
                          longitude: visit.checkinLocation.longitude,
                          label: "Check-in",
                          color: "green" as const,
                        }]
                      : []),
                    ...(visit.checkoutLocation
                      ? [{
                          latitude: visit.checkoutLocation.latitude,
                          longitude: visit.checkoutLocation.longitude,
                          label: "Check-out",
                          color: "orange" as const,
                        }]
                      : []),
                  ]}
                />
              ) : (
                <div className="flex h-40 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-200 bg-stone-50 text-center">
                  <svg className="mb-2 h-8 w-8 text-stone-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <p className="text-xs text-stone-400">Map will show once check-in is recorded</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary & action items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-stone-800">Notes & Outcomes</h2>
            {editMode && (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={handleCancel}
                  className="rounded-lg border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {saveError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{saveError}</div>
          )}

          {/* Summary */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-stone-700">Summary</label>
            {editMode ? (
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
                placeholder="What happened during the visit?"
                className="w-full resize-none rounded-lg border border-stone-300 px-4 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            ) : (
              <p className="text-sm text-stone-700 whitespace-pre-wrap">
                {visit.summary || <span className="italic text-stone-400">No summary recorded yet.</span>}
              </p>
            )}
          </div>

          {/* Action items */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-stone-700">Action Items</label>
            {editMode ? (
              <textarea
                value={actionItems}
                onChange={(e) => setActionItems(e.target.value)}
                rows={3}
                placeholder="List tasks to follow up on…"
                className="w-full resize-none rounded-lg border border-stone-300 px-4 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            ) : (
              <p className="text-sm text-stone-700 whitespace-pre-wrap">
                {visit.actionItems || <span className="italic text-stone-400">No action items recorded.</span>}
              </p>
            )}
          </div>

          {/* Next steps */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-stone-700">Next Steps</label>
            {editMode ? (
              <textarea
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                rows={2}
                placeholder="Planned next steps…"
                className="w-full resize-none rounded-lg border border-stone-300 px-4 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            ) : (
              <p className="text-sm text-stone-700 whitespace-pre-wrap">
                {visit.nextSteps || <span className="italic text-stone-400">—</span>}
              </p>
            )}
          </div>

          {/* Follow-up date (edit) */}
          {editMode && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-stone-700">Follow-up Date</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meta footer */}
      <p className="text-center text-xs text-stone-400">
        Created {formatDateTime(visit.createdAt)} · Last updated {formatDateTime(visit.updatedAt)}
      </p>
    </div>
  );
}

// ─── Helper component ─────────────────────────────────────────────────────────

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="min-w-[110px] text-xs font-medium uppercase tracking-wider text-stone-400">
        {label}
      </span>
      <span className="text-right text-sm text-stone-800">{children}</span>
    </div>
  );
}
