"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import StatCard from "@/components/ui/StatCard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";

interface FieldSummary {
  totalCustomers: number;
  customersByTier: Record<string, number>;
  customersByStatus: Record<string, number>;
  totalVisitsThisMonth: number;
  completedVisits: number;
  flaggedVisits: number;
  avgVisitDurationMinutes: number;
  totalOrderValueThisMonth: number;
  geofenceComplianceRate: number;
  topFieldReps: {
    rank: number;
    repId: string;
    name: string;
    visitCount: number;
    orderValue: number;
  }[];
}

interface VisitTrend {
  date: string;
  planned: number;
  completed: number;
  flagged: number;
}

interface PipelineItem {
  status: string;
  count: number;
  totalPotentialINR: number;
}

interface UpcomingVisit {
  id: string;
  visitDate: string;
  purpose: string;
  status: string;
  customer: { id: string; businessName: string };
}

const PIPELINE_CONFIG: Record<string, { label: string; color: string }> = {
  NEW:           { label: "New",           color: "bg-info" },
  CONTACTED:     { label: "Contacted",     color: "bg-brand-tan-dark" },
  QUALIFIED:     { label: "Qualified",     color: "bg-mod-sales" },
  PROPOSAL_SENT: { label: "Proposal Sent", color: "bg-mod-visit" },
  NEGOTIATION:   { label: "Negotiation",   color: "bg-warning" },
  WON:           { label: "Won",           color: "bg-success" },
  LOST:          { label: "Lost",          color: "bg-danger" },
  DORMANT:       { label: "Dormant",       color: "bg-brand-olive" },
};

const NEW_CLIENT_PURPOSES = new Set(["SALES_PITCH", "SITE_SURVEY"]);

const TIER_STYLES: Record<string, string> = {
  PLATINUM: "border-brand-olive/30 bg-brand-olive/8",
  GOLD:     "border-mod-sales/30 bg-mod-sales/8",
  SILVER:   "border-brand-olive/15 bg-brand-olive/5",
  BRONZE:   "border-mod-inventory/30 bg-mod-inventory/8",
};

export default function FieldDashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<FieldSummary | null>(null);
  const [trends, setTrends] = useState<VisitTrend[]>([]);
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [upcomingVisits, setUpcomingVisits] = useState<UpcomingVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true);
        setError(null);
        const [summaryRes, trendsRes, pipelineRes, visitsRes] = await Promise.all([
          api.get<{ data: FieldSummary }>("/analytics/field-summary"),
          api.get<{ data: VisitTrend[] }>("/analytics/visit-trends"),
          api.get<{ data: PipelineItem[] }>("/analytics/pipeline"),
          api.get<{ data: UpcomingVisit[] }>("/visits?limit=50"),
        ]);
        setSummary(summaryRes.data);
        setTrends(trendsRes.data);
        setPipeline(pipelineRes.data);
        setUpcomingVisits(visitsRes.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics data");
      } finally {
        setLoading(false);
      }
    }
    void fetchAll();
  }, []);

  const last7Days = trends.slice(-7);
  const maxBarValue = Math.max(1, ...last7Days.map((d) => d.completed + d.flagged));
  const totalPipelineCount = pipeline.reduce((acc, p) => acc + p.count, 0);
  const totalPipelineValue = pipeline.reduce((acc, p) => acc + p.totalPotentialINR, 0);

  const currentMonthLabel = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }).toUpperCase();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-tan/30 border-t-brand-tan" />
          <p className="font-display text-[11px] font-semibold tracking-[.15em] text-brand-olive/50">
            LOADING DASHBOARD…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-lg border border-danger/20 bg-danger/5 p-8 text-center">
          <p className="text-[13px] font-medium text-danger">{error}</p>
          <Button variant="danger" size="sm" onClick={() => window.location.reload()} className="mt-4">
            RETRY
          </Button>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-[10px] font-semibold tracking-[.2em] text-brand-olive/50">
            LIVE KPIS · {currentMonthLabel}
          </p>
          <h1 className="mt-1 font-display text-[28px] font-bold leading-tight text-brand-brown">
            Field CRM Dashboard
          </h1>
          <p className="mt-1 text-[13px] text-brand-olive/60">
            Operational pulse — visits, orders, pipeline health and team performance at a glance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">EXPORT</Button>
          <Button variant="primary" size="sm" onClick={() => router.push("/visits/new")}>NEW VISIT</Button>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="TOTAL CUSTOMERS"
          value={summary.totalCustomers.toLocaleString("en-IN")}
          subtitle="across all tiers"
        />
        <StatCard
          title="VISITS THIS MONTH"
          value={summary.totalVisitsThisMonth.toLocaleString("en-IN")}
          subtitle={`${summary.completedVisits} completed · ${summary.flaggedVisits} flagged`}
        />
        <StatCard
          title="ORDER VALUE · MONTH"
          value={formatCurrency(summary.totalOrderValueThisMonth)}
          subtitle="from completed visits"
        />
        <StatCard
          title="GEOFENCE COMPLIANCE"
          value={`${summary.geofenceComplianceRate}%`}
          subtitle={`avg ${summary.avgVisitDurationMinutes} min per visit`}
        />
      </div>

      {/* ── Calendar + Upcoming Visits ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Mini Calendar */}
        <Card>
          <CardHeader>
            <h2 className="font-display text-[15px] font-bold text-brand-brown">Visits Calendar</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCalendarMonth((prev) => {
                  const d = new Date(prev.year, prev.month - 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })}
                className="rounded-sm p-1 text-brand-olive/50 transition-colors hover:bg-brand-brown/5"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <span className="font-display text-[13px] font-semibold text-brand-brown/80">
                {new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
              </span>
              <button
                onClick={() => setCalendarMonth((prev) => {
                  const d = new Date(prev.year, prev.month + 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })}
                className="rounded-sm p-1 text-brand-olive/50 transition-colors hover:bg-brand-brown/5"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const { year, month } = calendarMonth;
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const today = new Date();
              const todayStr = today.toISOString().slice(0, 10);
              const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;

              const dateHasNew = new Set<string>();
              const dateHasFollowUp = new Set<string>();
              for (const v of upcomingVisits) {
                if (!v.visitDate.startsWith(monthPrefix)) continue;
                if (NEW_CLIENT_PURPOSES.has(v.purpose)) {
                  dateHasNew.add(v.visitDate);
                } else {
                  dateHasFollowUp.add(v.visitDate);
                }
              }

              const days: (number | null)[] = [];
              for (let i = 0; i < firstDay; i++) days.push(null);
              for (let d = 1; d <= daysInMonth; d++) days.push(d);

              return (
                <div>
                  <div className="mb-1 grid grid-cols-7 gap-0.5 text-center font-display text-[10px] font-semibold tracking-wide text-brand-olive/40">
                    {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((d) => (
                      <div key={d} className="py-1">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5 text-center text-[13px]">
                    {days.map((day, i) => {
                      if (day === null) return <div key={`empty-${i}`} />;
                      const dateStr = `${monthPrefix}-${String(day).padStart(2, "0")}`;
                      const isToday = dateStr === todayStr;
                      const isSelected = dateStr === selectedDate;
                      const hasNew = dateHasNew.has(dateStr);
                      const hasFollowUp = dateHasFollowUp.has(dateStr);
                      const hasAny = hasNew || hasFollowUp;
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                          className={`relative rounded-sm py-1.5 font-medium transition-colors ${
                            isToday
                              ? "bg-brand-tan font-bold text-brand-brown"
                              : isSelected
                              ? "bg-brand-brown/10 text-brand-brown"
                              : hasAny
                              ? "bg-surface-2 text-brand-brown"
                              : "text-brand-brown/70 hover:bg-brand-brown/5"
                          }`}
                        >
                          {day}
                          {(hasNew || hasFollowUp) && (
                            <span className="absolute bottom-0.5 left-1/2 flex -translate-x-1/2 gap-0.5">
                              {hasNew && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
                              {hasFollowUp && <span className="h-1.5 w-1.5 rounded-full bg-warning" />}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="mt-3 flex items-center gap-4 border-t border-brand-brown/8 pt-3">
                    <span className="flex items-center gap-1.5 text-[11px] text-brand-olive/60">
                      <span className="h-2 w-2 rounded-full bg-success" />
                      New Client Visit
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-brand-olive/60">
                      <span className="h-2 w-2 rounded-full bg-warning" />
                      Follow-up
                    </span>
                    {upcomingVisits.length > 0 && (
                      <span className="ml-auto font-display text-[11px] font-semibold text-brand-olive/50">
                        {summary.totalVisitsThisMonth} total this month
                      </span>
                    )}
                  </div>

                  {/* Selected date detail */}
                  {selectedDate && (() => {
                    const dayVisits = upcomingVisits.filter((v) => v.visitDate === selectedDate);
                    const dateLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }).toUpperCase();
                    return (
                      <div className="mt-3 rounded-sm border border-brand-brown/10 bg-surface-2 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="font-display text-[11px] font-semibold tracking-[.1em] text-brand-olive/70">
                            {dateLabel} · {dayVisits.length} VISIT{dayVisits.length !== 1 ? "S" : ""}
                          </h3>
                          <button onClick={() => setSelectedDate(null)} className="text-brand-olive/40 hover:text-brand-olive">
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                          </button>
                        </div>
                        {dayVisits.length === 0 ? (
                          <p className="text-[12px] text-brand-olive/40">No visits scheduled</p>
                        ) : (
                          <div className="space-y-2">
                            {dayVisits.map((v) => (
                              <button
                                key={v.id}
                                onClick={() => router.push(`/visits/${v.id}`)}
                                className="flex w-full items-center gap-2 rounded-sm border border-brand-brown/8 bg-surface p-2 text-left transition-colors active:bg-brand-brown/5"
                              >
                                <span className={`h-2 w-2 shrink-0 rounded-full ${NEW_CLIENT_PURPOSES.has(v.purpose) ? "bg-success" : "bg-warning"}`} />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[13px] font-medium text-brand-brown">{v.customer.businessName}</p>
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

        {/* Upcoming Visits */}
        <Card>
          <CardHeader>
            <h2 className="font-display text-[15px] font-bold text-brand-brown">Upcoming Visits</h2>
            <button
              onClick={() => router.push("/visits")}
              className="font-display text-[11px] font-semibold tracking-wide text-brand-tan-dark transition-colors hover:text-brand-tan"
            >
              VIEW ALL →
            </button>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingVisits.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-brand-olive/40">No upcoming visits scheduled</p>
            ) : (
              <div className="max-h-80 divide-y divide-brand-brown/6 overflow-y-auto">
                {upcomingVisits.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => router.push(`/visits/${v.id}`)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors active:bg-brand-brown/3"
                  >
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-sm bg-brand-tan/15 text-brand-tan-dark">
                      <span className="font-display text-[13px] font-bold leading-none">
                        {new Date(v.visitDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric" })}
                      </span>
                      <span className="font-display text-[8px] font-semibold uppercase leading-none tracking-wider">
                        {new Date(v.visitDate + "T00:00:00").toLocaleDateString("en-IN", { month: "short" })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-brand-brown">{v.customer.businessName}</p>
                      <p className="text-[11px] text-brand-olive/60">{v.purpose.replace(/_/g, " ")}</p>
                    </div>
                    <StatusBadge status={v.status} />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Lead Pipeline ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div>
            <h2 className="font-display text-[15px] font-bold text-brand-brown">Lead Pipeline</h2>
            <p className="mt-0.5 text-[11px] text-brand-olive/50">
              {totalPipelineCount} active leads · {formatCurrency(totalPipelineValue)} projected
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {/* Proportional bar */}
          <div className="flex h-8 w-full overflow-hidden rounded-sm">
            {pipeline
              .filter((p) => p.count > 0)
              .map((p) => {
                const pct = totalPipelineCount > 0 ? (p.count / totalPipelineCount) * 100 : 0;
                const cfg = PIPELINE_CONFIG[p.status] ?? { label: p.status, color: "bg-brand-olive" };
                return (
                  <div
                    key={p.status}
                    className={`${cfg.color} flex items-center justify-center text-[10px] font-bold text-white/80 transition-all`}
                    style={{ width: `${pct}%`, minWidth: pct > 0 ? "2px" : "0" }}
                    title={`${cfg.label}: ${p.count} (${formatCurrency(p.totalPotentialINR)})`}
                  >
                    {pct > 8 ? p.count : ""}
                  </div>
                );
              })}
          </div>

          {/* Legend grid */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {pipeline.map((p) => {
              const cfg = PIPELINE_CONFIG[p.status] ?? { label: p.status, color: "bg-brand-olive" };
              return (
                <div key={p.status} className="flex items-start gap-2">
                  <span className={`mt-0.5 h-3 w-3 shrink-0 rounded-xs ${cfg.color}`} />
                  <div className="min-w-0">
                    <p className="truncate font-display text-[11px] font-semibold text-brand-brown/80">{cfg.label}</p>
                    <p className="text-[11px] text-brand-olive/50">
                      {p.count} leads · {formatCurrency(p.totalPotentialINR)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Visit Trends + Top Reps ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Visit Trends */}
        <Card>
          <CardHeader>
            <div>
              <h2 className="font-display text-[15px] font-bold text-brand-brown">Visit Trends · Last 7 Days</h2>
              <p className="mt-0.5 text-[11px] text-brand-olive/50">
                {summary.completedVisits} completed · {summary.flaggedVisits} flagged
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-2">
              {last7Days.map((day) => {
                const completedH = maxBarValue > 0 ? (day.completed / maxBarValue) * 100 : 0;
                const flaggedH = maxBarValue > 0 ? (day.flagged / maxBarValue) * 100 : 0;
                const dayLabel = new Date(day.date + "T00:00:00")
                  .toLocaleDateString("en-IN", { weekday: "short" })
                  .toUpperCase();
                return (
                  <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-col-reverse items-stretch justify-end" style={{ height: "120px" }}>
                      {day.flagged > 0 && (
                        <div
                          className="w-full rounded-t-xs bg-danger"
                          style={{ height: `${flaggedH}%` }}
                          title={`Flagged: ${day.flagged}`}
                        />
                      )}
                      {day.completed > 0 && (
                        <div
                          className="w-full bg-brand-tan"
                          style={{ height: `${completedH}%` }}
                          title={`Completed: ${day.completed}`}
                        />
                      )}
                    </div>
                    <span className="font-display text-[9px] font-semibold text-brand-olive/40">{dayLabel}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-4 border-t border-brand-brown/8 pt-3">
              <span className="flex items-center gap-1.5 text-[11px] text-brand-olive/60">
                <span className="h-2 w-2 rounded-xs bg-brand-tan" />
                Completed
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-brand-olive/60">
                <span className="h-2 w-2 rounded-xs bg-danger" />
                Flagged
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Top Field Reps */}
        <Card>
          <CardHeader>
            <div>
              <h2 className="font-display text-[15px] font-bold text-brand-brown">Top Field Reps · This Month</h2>
              <p className="mt-0.5 text-[11px] text-brand-olive/50">Ranked by order value</p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {summary.topFieldReps.length === 0 ? (
              <p className="px-5 py-6 text-[13px] text-brand-olive/40">No visit data for this month yet.</p>
            ) : (
              <div className="divide-y divide-brand-brown/6">
                {summary.topFieldReps.map((rep) => (
                  <div key={rep.repId} className="flex items-center gap-3 px-5 py-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-[12px] font-bold ${
                        rep.rank === 1
                          ? "bg-brand-tan/20 text-brand-tan-dark"
                          : rep.rank === 2
                          ? "bg-brand-olive/10 text-brand-olive"
                          : rep.rank === 3
                          ? "bg-mod-inventory/15 text-mod-inventory"
                          : "bg-brand-brown/5 text-brand-olive/50"
                      }`}
                    >
                      {rep.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-brand-brown">{rep.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[12px] font-medium text-brand-brown">{formatCurrency(rep.orderValue)}</p>
                      <p className="text-[10px] text-brand-olive/50">{rep.visitCount} visits</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Customers by Tier ────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 font-display text-[15px] font-bold text-brand-brown">Customers by Tier</h2>
        <p className="mb-4 text-[11px] text-brand-olive/50">Assigned based on annual potential &amp; payment history</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(["PLATINUM", "GOLD", "SILVER", "BRONZE"] as const).map((tier) => {
            const count = summary.customersByTier[tier] ?? 0;
            const style = TIER_STYLES[tier];
            return (
              <div key={tier} className={`rounded-lg border p-5 ${style}`}>
                <StatusBadge status={tier} variant="tier" />
                <p className="mt-3 font-display text-[28px] font-bold leading-none text-brand-brown">
                  {count.toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-[11px] text-brand-olive/50">
                  {summary.totalCustomers > 0
                    ? `${((count / summary.totalCustomers) * 100).toFixed(0)}% of customers`
                    : "—"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
