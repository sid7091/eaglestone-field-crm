"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import PlanVisitModal from "@/components/ui/PlanVisitModal";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

const NEW_CLIENT_PURPOSES = new Set(["SALES_PITCH", "SITE_SURVEY"]);

// ─── Types ────────────────────────────────────────────────────────────────────

interface VisitRow {
  id: string;
  visitDate: string;
  purpose: string;
  status: string;
  durationMinutes: number | null;
  geofenceValidation: {
    isWithinGeofence: boolean;
    distanceFromCustomerMeters: number;
  } | null;
  customer: {
    id: string;
    businessName: string;
  } | null;
  fieldRep: {
    id: string;
    fullName: string;
  } | null;
  regionCode: string;
}

interface PaginatedResponse {
  data: VisitRow[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Date range helpers ───────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function weekStartISO(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

type DatePreset = "today" | "week" | "custom";
type StatusTab = "" | "PLANNED" | "COMPLETED" | "FLAGGED_FAKE";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VisitsPage() {
  const router = useRouter();

  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("");
  const [page, setPage] = useState(1);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selDate, setSelDate] = useState<string | null>(null);

  const effectiveDates = useCallback((): { dateFrom: string; dateTo: string } => {
    if (datePreset === "today") {
      const t = todayISO();
      return { dateFrom: t, dateTo: t };
    }
    if (datePreset === "week") {
      return { dateFrom: weekStartISO(), dateTo: todayISO() };
    }
    return { dateFrom: customFrom, dateTo: customTo };
  }, [datePreset, customFrom, customTo]);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { dateFrom, dateTo } = effectiveDates();
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (statusTab) params.set("status", statusTab);
      params.set("page", String(page));
      params.set("limit", "20");

      const res = await api.get<PaginatedResponse>(`/visits?${params.toString()}`);
      setVisits(res.data);
      setMeta(res.meta);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load visits");
    } finally {
      setLoading(false);
    }
  }, [effectiveDates, statusTab, page]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const handlePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    setPage(1);
  };

  const handleTabChange = (tab: StatusTab) => {
    setStatusTab(tab);
    setPage(1);
  };

  const STATUS_TABS: { label: string; value: StatusTab }[] = [
    { label: "All", value: "" },
    { label: "Planned", value: "PLANNED" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Flagged", value: "FLAGGED_FAKE" },
  ];

  const columns = [
    {
      header: "Date",
      accessor: (row: VisitRow) => (
        <span className="text-sm font-medium text-stone-900">
          {formatDate(row.visitDate)}
        </span>
      ),
    },
    {
      header: "Customer",
      accessor: (row: VisitRow) => (
        <span className="font-medium text-stone-900">
          {row.customer?.businessName ?? <span className="text-stone-400">—</span>}
        </span>
      ),
    },
    {
      header: "Purpose",
      accessor: (row: VisitRow) => (
        <span className="text-xs text-stone-600">
          {row.purpose.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: (row: VisitRow) => <StatusBadge status={row.status} />,
    },
    {
      header: "Duration",
      accessor: (row: VisitRow) =>
        row.durationMinutes != null ? (
          <span className="text-sm text-stone-700">{row.durationMinutes} min</span>
        ) : (
          <span className="text-stone-400">—</span>
        ),
    },
    {
      header: "Geofence",
      accessor: (row: VisitRow) => {
        if (!row.geofenceValidation) {
          return <span className="text-stone-400 text-xs">—</span>;
        }
        return row.geofenceValidation.isWithinGeofence ? (
          <span className="inline-flex items-center gap-1 text-green-700 text-sm font-medium">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Valid
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-red-600 text-sm font-medium">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Invalid
          </span>
        );
      },
    },
    {
      header: "Rep",
      accessor: (row: VisitRow) => (
        <span className="text-xs text-stone-500">
          {row.fieldRep?.fullName ?? "—"}
        </span>
      ),
    },
  ];

  // Wrap DataTable to support red row for FLAGGED_FAKE
  const renderTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-stone-200">
            {columns.map((col, i) => (
              <th
                key={i}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {visits.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-sm text-stone-500"
              >
                No visits found for the selected filters.
              </td>
            </tr>
          ) : (
            visits.map((row) => (
              <tr
                key={row.id}
                onClick={() => router.push(`/visits/${row.id}`)}
                className={`cursor-pointer transition-colors ${
                  row.status === "FLAGGED_FAKE"
                    ? "bg-red-50 hover:bg-red-100"
                    : "hover:bg-stone-50"
                }`}
              >
                {columns.map((col, i) => (
                  <td
                    key={i}
                    className="px-4 py-3 text-sm text-stone-900"
                  >
                    {col.accessor(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Visits</h1>
          <p className="text-sm text-stone-500">
            {meta.total > 0 ? `${meta.total} visits found` : "Schedule and track field visits"}
          </p>
        </div>
        <button
          onClick={() => setPlanModalOpen(true)}
          className="w-fit rounded-lg bg-amber-500 px-4 py-2 font-medium text-white transition-colors hover:bg-amber-600"
        >
          + Plan Visit
        </button>
      </div>

      <PlanVisitModal open={planModalOpen} onClose={() => setPlanModalOpen(false)} onCreated={() => fetchVisits()} />

      {/* ── Mini Calendar ──────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-stone-800">Schedule</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setCalMonth((p) => { const d = new Date(p.year, p.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })} className="rounded p-1 text-stone-400 hover:bg-stone-100">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
              <span className="text-sm font-medium text-stone-700">
                {new Date(calMonth.year, calMonth.month).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
              </span>
              <button onClick={() => setCalMonth((p) => { const d = new Date(p.year, p.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })} className="rounded p-1 text-stone-400 hover:bg-stone-100">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const { year, month } = calMonth;
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const todayStr = new Date().toISOString().slice(0, 10);
            const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
            const dateHasNew = new Set<string>();
            const dateHasFollowUp = new Set<string>();
            for (const v of visits) {
              if (!v.visitDate.startsWith(monthPrefix)) continue;
              if (NEW_CLIENT_PURPOSES.has(v.purpose)) dateHasNew.add(v.visitDate);
              else dateHasFollowUp.add(v.visitDate);
            }
            const days: (number | null)[] = [];
            for (let i = 0; i < firstDay; i++) days.push(null);
            for (let d = 1; d <= daysInMonth; d++) days.push(d);
            return (
              <div>
                <div className="grid grid-cols-7 gap-0.5 text-center text-xs font-medium text-stone-400 mb-1">
                  {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => <div key={d} className="py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-0.5 text-center text-sm">
                  {days.map((day, i) => {
                    if (day === null) return <div key={`e-${i}`} />;
                    const ds = `${monthPrefix}-${String(day).padStart(2, "0")}`;
                    const isToday = ds === todayStr;
                    const isSel = ds === selDate;
                    const hasN = dateHasNew.has(ds);
                    const hasF = dateHasFollowUp.has(ds);
                    return (
                      <button key={day} type="button" onClick={() => setSelDate(isSel ? null : ds)}
                        className={`relative rounded-lg py-1.5 transition-colors ${isToday ? "bg-amber-500 font-bold text-white" : isSel ? "bg-stone-200 font-medium text-stone-900" : (hasN||hasF) ? "bg-stone-50 font-medium text-stone-800" : "text-stone-700 hover:bg-stone-50"}`}>
                        {day}
                        {(hasN || hasF) && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {hasN && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                          {hasF && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                        </span>}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center gap-4 border-t border-stone-100 pt-3">
                  <span className="flex items-center gap-1.5 text-xs text-stone-600"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />New Client</span>
                  <span className="flex items-center gap-1.5 text-xs text-stone-600"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Follow Up</span>
                </div>
                {selDate && (() => {
                  const dayVisits = visits.filter((v) => v.visitDate === selDate);
                  const dateLabel = new Date(selDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
                  return (
                    <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-stone-800">{dateLabel}</h3>
                        <button onClick={() => setSelDate(null)} className="text-stone-400"><svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg></button>
                      </div>
                      {dayVisits.length === 0 ? <p className="text-xs text-stone-400">No visits</p> : (
                        <div className="space-y-2">
                          {dayVisits.map((v) => (
                            <button key={v.id} onClick={() => router.push(`/visits/${v.id}`)} className="flex w-full items-center gap-2 rounded-lg bg-white p-2 text-left active:bg-stone-100 border border-stone-100">
                              <span className={`h-2 w-2 rounded-full shrink-0 ${NEW_CLIENT_PURPOSES.has(v.purpose) ? "bg-emerald-500" : "bg-amber-400"}`} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-stone-900 truncate">{v.customer?.businessName || "—"}</p>
                                <p className="text-xs text-stone-500">{v.purpose.replace(/_/g, " ")}</p>
                              </div>
                              <StatusBadge status={v.status} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Date preset buttons + custom range */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["today", "week", "custom"] as DatePreset[]).map((preset) => (
          <button
            key={preset}
            onClick={() => handlePreset(preset)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              datePreset === preset
                ? "bg-amber-500 text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            {preset === "today" ? "Today" : preset === "week" ? "This Week" : "Custom"}
          </button>
        ))}
        {datePreset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <span className="text-stone-400 text-sm">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => { setCustomTo(e.target.value); setPage(1); }}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        )}
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex gap-1 border-b border-stone-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={`rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
              statusTab === tab.value
                ? "border-b-2 border-amber-500 text-amber-600"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Table */}
      <Card>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          </div>
        ) : (
          renderTable()
        )}
      </Card>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-stone-500">
            Page {meta.page} of {meta.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page === meta.totalPages}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
