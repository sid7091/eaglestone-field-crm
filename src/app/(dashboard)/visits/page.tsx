"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

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
        <Link
          href="/visits/new"
          className="w-fit rounded-lg bg-amber-500 px-4 py-2 font-medium text-white transition-colors hover:bg-amber-600"
        >
          + Plan Visit
        </Link>
      </div>

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
