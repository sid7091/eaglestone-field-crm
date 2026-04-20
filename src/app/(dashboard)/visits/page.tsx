"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";
import PlanVisitModal from "@/components/ui/PlanVisitModal";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

const NEW_CLIENT_PURPOSES = new Set(["SALES_PITCH", "SITE_SURVEY"]);

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
  customer: { id: string; businessName: string } | null;
  fieldRep: { id: string; fullName: string } | null;
  regionCode: string;
}

interface PaginatedResponse {
  data: VisitRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function todayISO(): string { return new Date().toISOString().slice(0, 10); }
function weekStartISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

type DatePreset = "today" | "week" | "custom";
type StatusTab = "" | "PLANNED" | "COMPLETED" | "FLAGGED_FAKE";

const INPUT_CLS = "rounded-sm border border-brand-brown/20 bg-surface px-3 py-1.5 text-[13px] text-brand-brown focus:border-brand-tan focus:outline-none focus:ring-2 focus:ring-brand-tan/20 transition-colors";

export default function VisitsPage() {
  const router = useRouter();
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
    if (datePreset === "today") { const t = todayISO(); return { dateFrom: t, dateTo: t }; }
    if (datePreset === "week") return { dateFrom: weekStartISO(), dateTo: todayISO() };
    return { dateFrom: customFrom, dateTo: customTo };
  }, [datePreset, customFrom, customTo]);

  const fetchVisits = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { dateFrom, dateTo } = effectiveDates();
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (statusTab) params.set("status", statusTab);
      params.set("page", String(page));
      params.set("limit", "20");
      const res = await api.get<PaginatedResponse>(`/visits?${params.toString()}`);
      setVisits(res.data); setMeta(res.meta);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load visits");
    } finally { setLoading(false); }
  }, [effectiveDates, statusTab, page]);

  useEffect(() => { fetchVisits(); }, [fetchVisits]);

  const handlePreset = (preset: DatePreset) => { setDatePreset(preset); setPage(1); };
  const handleTabChange = (tab: StatusTab) => { setStatusTab(tab); setPage(1); };

  const STATUS_TABS: { label: string; value: StatusTab }[] = [
    { label: "All", value: "" },
    { label: "Planned", value: "PLANNED" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Flagged", value: "FLAGGED_FAKE" },
  ];

  const columns = [
    {
      header: "Date",
      accessor: (row: VisitRow) => <span className="font-medium text-brand-brown">{formatDate(row.visitDate)}</span>,
    },
    {
      header: "Customer",
      accessor: (row: VisitRow) => (
        <span className="font-medium text-brand-brown">
          {row.customer?.businessName ?? <span className="text-brand-olive/30">—</span>}
        </span>
      ),
    },
    {
      header: "Purpose",
      accessor: (row: VisitRow) => <span className="text-[12px] text-brand-olive">{row.purpose.replace(/_/g, " ")}</span>,
    },
    {
      header: "Status",
      accessor: (row: VisitRow) => <StatusBadge status={row.status} />,
    },
    {
      header: "Duration",
      accessor: (row: VisitRow) =>
        row.durationMinutes != null
          ? <span className="font-mono text-[12px] text-brand-brown/80">{row.durationMinutes} min</span>
          : <span className="text-brand-olive/30">—</span>,
    },
    {
      header: "Geofence",
      accessor: (row: VisitRow) => {
        if (!row.geofenceValidation) return <span className="text-brand-olive/30 text-[12px]">—</span>;
        return row.geofenceValidation.isWithinGeofence ? (
          <span className="inline-flex items-center gap-1 font-semibold text-success text-[12px]">✓ Valid</span>
        ) : (
          <span className="inline-flex items-center gap-1 font-semibold text-danger text-[12px]">✕ Invalid</span>
        );
      },
    },
    {
      header: "Rep",
      accessor: (row: VisitRow) => <span className="text-[12px] text-brand-olive/60">{row.fieldRep?.fullName ?? "—"}</span>,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-[10px] font-semibold tracking-[.2em] text-brand-olive/50">OPERATIONS</p>
          <h1 className="mt-1 font-display text-[28px] font-bold leading-tight text-brand-brown">Visits</h1>
          <p className="mt-1 text-[13px] text-brand-olive/60">
            {meta.total > 0 ? `${meta.total} visits found` : "Schedule and track field visits"}
          </p>
        </div>
        <Button size="sm" onClick={() => setPlanModalOpen(true)}>+ PLAN VISIT</Button>
      </div>

      <PlanVisitModal open={planModalOpen} onClose={() => setPlanModalOpen(false)} onCreated={() => fetchVisits()} />

      {/* Calendar */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-display text-[15px] font-bold text-brand-brown">Schedule</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setCalMonth((p) => { const d = new Date(p.year, p.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })} className="rounded-sm p-1 text-brand-olive/50 hover:bg-brand-brown/5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <span className="font-display text-[13px] font-semibold text-brand-brown/80">
              {new Date(calMonth.year, calMonth.month).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </span>
            <button onClick={() => setCalMonth((p) => { const d = new Date(p.year, p.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })} className="rounded-sm p-1 text-brand-olive/50 hover:bg-brand-brown/5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
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
                <div className="mb-1 grid grid-cols-7 gap-0.5 text-center font-display text-[10px] font-semibold tracking-wide text-brand-olive/40">
                  {["SU","MO","TU","WE","TH","FR","SA"].map((d) => <div key={d} className="py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-0.5 text-center text-[13px]">
                  {days.map((day, i) => {
                    if (day === null) return <div key={`e-${i}`} />;
                    const ds = `${monthPrefix}-${String(day).padStart(2, "0")}`;
                    const isToday = ds === todayStr;
                    const isSel = ds === selDate;
                    const hasN = dateHasNew.has(ds);
                    const hasF = dateHasFollowUp.has(ds);
                    return (
                      <button key={day} type="button" onClick={() => setSelDate(isSel ? null : ds)}
                        className={`relative rounded-sm py-1.5 font-medium transition-colors ${isToday ? "bg-brand-tan font-bold text-brand-brown" : isSel ? "bg-brand-brown/10 text-brand-brown" : (hasN||hasF) ? "bg-surface-2 text-brand-brown" : "text-brand-brown/70 hover:bg-brand-brown/5"}`}>
                        {day}
                        {(hasN || hasF) && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {hasN && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
                          {hasF && <span className="h-1.5 w-1.5 rounded-full bg-warning" />}
                        </span>}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center gap-4 border-t border-brand-brown/8 pt-3">
                  <span className="flex items-center gap-1.5 text-[11px] text-brand-olive/60"><span className="h-2 w-2 rounded-full bg-success" />New Client</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-brand-olive/60"><span className="h-2 w-2 rounded-full bg-warning" />Follow Up</span>
                </div>
                {selDate && (() => {
                  const dayVisits = visits.filter((v) => v.visitDate === selDate);
                  const dateLabel = new Date(selDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }).toUpperCase();
                  return (
                    <div className="mt-3 rounded-sm border border-brand-brown/10 bg-surface-2 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-display text-[11px] font-semibold tracking-[.1em] text-brand-olive/70">{dateLabel} · {dayVisits.length} VISIT{dayVisits.length !== 1 ? "S" : ""}</h3>
                        <button onClick={() => setSelDate(null)} className="text-brand-olive/40 hover:text-brand-olive"><svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg></button>
                      </div>
                      {dayVisits.length === 0 ? <p className="text-[12px] text-brand-olive/40">No visits</p> : (
                        <div className="space-y-2">
                          {dayVisits.map((v) => (
                            <button key={v.id} onClick={() => router.push(`/visits/${v.id}`)} className="flex w-full items-center gap-2 rounded-sm border border-brand-brown/8 bg-surface p-2 text-left transition-colors active:bg-brand-brown/5">
                              <span className={`h-2 w-2 shrink-0 rounded-full ${NEW_CLIENT_PURPOSES.has(v.purpose) ? "bg-success" : "bg-warning"}`} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-medium text-brand-brown">{v.customer?.businessName || "—"}</p>
                                <p className="text-[11px] text-brand-olive/60">{v.purpose.replace(/_/g, " ")}</p>
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

      {/* Date presets */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["today", "week", "custom"] as DatePreset[]).map((preset) => (
          <button
            key={preset}
            onClick={() => handlePreset(preset)}
            className={`rounded-sm px-3 py-1.5 font-display text-[12px] font-semibold tracking-wide transition-colors ${
              datePreset === preset
                ? "bg-brand-brown text-brand-cream"
                : "bg-brand-brown/5 text-brand-olive hover:bg-brand-brown/10"
            }`}
          >
            {preset === "today" ? "TODAY" : preset === "week" ? "THIS WEEK" : "CUSTOM"}
          </button>
        ))}
        {datePreset === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }} className={INPUT_CLS} />
            <span className="text-brand-olive/40 text-[12px]">to</span>
            <input type="date" value={customTo} onChange={(e) => { setCustomTo(e.target.value); setPage(1); }} className={INPUT_CLS} />
          </div>
        )}
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex gap-1 border-b border-brand-brown/10">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={`rounded-t-xs px-4 py-2 font-display text-[12px] font-semibold tracking-wide transition-colors ${
              statusTab === tab.value
                ? "border-b-2 border-brand-tan text-brand-tan-dark"
                : "text-brand-olive/50 hover:text-brand-brown"
            }`}
          >
            {tab.label.toUpperCase()}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-sm bg-danger/5 p-3 text-[13px] text-danger">{error}</div>
      )}

      {/* Table */}
      <Card>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-tan/30 border-t-brand-tan" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-brown/10">
                  {columns.map((col, i) => (
                    <th key={i} className="px-4 py-3 text-left font-display text-[10px] font-semibold tracking-[.12em] text-brand-olive/60 uppercase">
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-brown/6">
                {visits.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center text-[13px] text-brand-olive/40">
                      No visits found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  visits.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => router.push(`/visits/${row.id}`)}
                      className={`cursor-pointer transition-colors ${
                        row.status === "FLAGGED_FAKE" ? "bg-danger/5 hover:bg-danger/8" : "hover:bg-brand-brown/3"
                      }`}
                    >
                      {columns.map((col, i) => (
                        <td key={i} className="px-4 py-3 text-[13px] text-brand-brown">{col.accessor(row)}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[12px] text-brand-olive/50">Page {meta.page} of {meta.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
