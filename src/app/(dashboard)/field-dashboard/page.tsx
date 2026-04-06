"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import StatCard from "@/components/ui/StatCard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";

// ─── API Response Types ───────────────────────────────────────────────────────

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

// ─── Pipeline status display config ──────────────────────────────────────────

const PIPELINE_CONFIG: Record<string, { label: string; color: string }> = {
  NEW: { label: "New", color: "bg-blue-400" },
  CONTACTED: { label: "Contacted", color: "bg-cyan-400" },
  QUALIFIED: { label: "Qualified", color: "bg-teal-400" },
  PROPOSAL_SENT: { label: "Proposal Sent", color: "bg-indigo-400" },
  NEGOTIATION: { label: "Negotiation", color: "bg-violet-400" },
  WON: { label: "Won", color: "bg-green-400" },
  LOST: { label: "Lost", color: "bg-red-400" },
  DORMANT: { label: "Dormant", color: "bg-stone-400" },
};

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PLATINUM: { label: "Platinum", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  GOLD: { label: "Gold", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  SILVER: { label: "Silver", color: "text-stone-600", bg: "bg-stone-50 border-stone-200" },
  BRONZE: { label: "Bronze", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
};

// ─── Component ────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true);
        setError(null);

        const today = new Date().toISOString().slice(0, 10);
        const [summaryRes, trendsRes, pipelineRes, visitsRes] = await Promise.all([
          api.get<{ data: FieldSummary }>("/analytics/field-summary"),
          api.get<{ data: VisitTrend[] }>("/analytics/visit-trends"),
          api.get<{ data: PipelineItem[] }>("/analytics/pipeline"),
          api.get<{ data: UpcomingVisit[] }>(`/visits?status=PLANNED&dateFrom=${today}&limit=20`),
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

  // ── Last 7 days of trends ───────────────────────────────────────────────────
  const last7Days = trends.slice(-7);
  const maxBarValue = Math.max(
    1,
    ...last7Days.map((d) => d.completed + d.flagged)
  );

  // ── Pipeline totals for proportional bar ───────────────────────────────────
  const totalPipelineCount = pipeline.reduce((acc, p) => acc + p.count, 0);

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          <p className="text-sm text-stone-500">Loading analytics…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm font-medium text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6 p-6">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Field CRM Dashboard</h1>
        <p className="mt-1 text-sm text-stone-500">
          Live KPIs for your region — current calendar month
        </p>
      </div>

      {/* ── Row 1: Stat Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Customers"
          value={summary.totalCustomers.toLocaleString("en-IN")}
          subtitle="across all tiers"
          color="amber"
        />
        <StatCard
          title="Visits This Month"
          value={summary.totalVisitsThisMonth.toLocaleString("en-IN")}
          subtitle={`${summary.completedVisits} completed · ${summary.flaggedVisits} flagged`}
          color="blue"
        />
        <StatCard
          title="Order Value This Month"
          value={formatCurrency(summary.totalOrderValueThisMonth)}
          subtitle="from completed visits"
          color="green"
        />
        <StatCard
          title="Geofence Compliance"
          value={`${summary.geofenceComplianceRate}%`}
          subtitle={`avg ${summary.avgVisitDurationMinutes} min per visit`}
          color="purple"
        />
      </div>

      {/* ── Row 2: Calendar + Upcoming Visits ────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Mini Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-800">Schedule</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCalendarMonth((prev) => {
                    const d = new Date(prev.year, prev.month - 1);
                    return { year: d.getFullYear(), month: d.getMonth() };
                  })}
                  className="rounded p-1 text-stone-400 hover:bg-stone-100"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </button>
                <span className="text-sm font-medium text-stone-700">
                  {new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                </span>
                <button
                  onClick={() => setCalendarMonth((prev) => {
                    const d = new Date(prev.year, prev.month + 1);
                    return { year: d.getFullYear(), month: d.getMonth() };
                  })}
                  className="rounded p-1 text-stone-400 hover:bg-stone-100"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const { year, month } = calendarMonth;
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const today = new Date();
              const todayStr = today.toISOString().slice(0, 10);

              // Visit dates in this month
              const visitDates = new Set(
                upcomingVisits
                  .map((v) => v.visitDate)
                  .filter((d) => d.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`))
              );

              const days = [];
              for (let i = 0; i < firstDay; i++) days.push(null);
              for (let d = 1; d <= daysInMonth; d++) days.push(d);

              return (
                <div>
                  <div className="grid grid-cols-7 gap-0.5 text-center text-xs font-medium text-stone-400 mb-1">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                      <div key={d} className="py-1">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5 text-center text-sm">
                    {days.map((day, i) => {
                      if (day === null) return <div key={`empty-${i}`} />;
                      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const isToday = dateStr === todayStr;
                      const hasVisit = visitDates.has(dateStr);
                      return (
                        <div
                          key={day}
                          className={`relative rounded-lg py-1.5 ${
                            isToday ? "bg-amber-500 font-bold text-white" : hasVisit ? "bg-amber-50 font-medium text-amber-800" : "text-stone-700"
                          }`}
                        >
                          {day}
                          {hasVisit && !isToday && (
                            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-amber-500" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Upcoming Visits */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-800">Upcoming Visits</h2>
              <button
                onClick={() => router.push("/visits")}
                className="text-xs text-amber-600 font-medium hover:underline"
              >
                View all
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-0 py-0">
            {upcomingVisits.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-stone-400">No upcoming visits scheduled</p>
            ) : (
              <div className="max-h-72 divide-y divide-stone-100 overflow-y-auto">
                {upcomingVisits.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => router.push(`/visits/${v.id}`)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left active:bg-stone-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                      <span className="text-xs font-bold leading-none">
                        {new Date(v.visitDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric" })}
                      </span>
                      <span className="text-[9px] uppercase leading-none">
                        {new Date(v.visitDate + "T00:00:00").toLocaleDateString("en-IN", { month: "short" })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-stone-900">{v.customer.businessName}</p>
                      <p className="text-xs text-stone-500">{v.purpose.replace(/_/g, " ")}</p>
                    </div>
                    <StatusBadge status={v.status} />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Lead Pipeline ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-stone-800">Lead Pipeline</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            {totalPipelineCount} customers · proportional by count
          </p>
        </CardHeader>
        <CardContent>
          {/* Proportional bar */}
          <div className="flex h-8 w-full overflow-hidden rounded-lg">
            {pipeline
              .filter((p) => p.count > 0)
              .map((p) => {
                const pct = totalPipelineCount > 0
                  ? (p.count / totalPipelineCount) * 100
                  : 0;
                const cfg = PIPELINE_CONFIG[p.status] ?? { label: p.status, color: "bg-stone-300" };
                return (
                  <div
                    key={p.status}
                    className={`${cfg.color} flex items-center justify-center transition-all`}
                    style={{ width: `${pct}%`, minWidth: pct > 0 ? "2px" : "0" }}
                    title={`${cfg.label}: ${p.count} (${formatCurrency(p.totalPotentialINR)})`}
                  />
                );
              })}
          </div>

          {/* Legend */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {pipeline.map((p) => {
              const cfg = PIPELINE_CONFIG[p.status] ?? { label: p.status, color: "bg-stone-300" };
              return (
                <div key={p.status} className="flex items-start gap-2">
                  <span className={`mt-0.5 h-3 w-3 shrink-0 rounded-sm ${cfg.color}`} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-stone-700">{cfg.label}</p>
                    <p className="text-xs text-stone-500">
                      {p.count} · {formatCurrency(p.totalPotentialINR)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Row 3: Visit Trends + Top Reps ───────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Visit Trends — last 7 days */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-stone-800">Visit Trends</h2>
            <p className="text-xs text-stone-500 mt-0.5">Last 7 days</p>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-2">
              {last7Days.map((day) => {
                const completedH = maxBarValue > 0
                  ? (day.completed / maxBarValue) * 100
                  : 0;
                const flaggedH = maxBarValue > 0
                  ? (day.flagged / maxBarValue) * 100
                  : 0;
                const dayLabel = new Date(day.date + "T00:00:00")
                  .toLocaleDateString("en-IN", { weekday: "short" });
                return (
                  <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                    {/* Stacked bar */}
                    <div className="flex w-full flex-col-reverse items-stretch justify-end" style={{ height: "120px" }}>
                      {day.flagged > 0 && (
                        <div
                          className="w-full rounded-t bg-red-400"
                          style={{ height: `${flaggedH}%` }}
                          title={`Flagged: ${day.flagged}`}
                        />
                      )}
                      {day.completed > 0 && (
                        <div
                          className="w-full bg-amber-500"
                          style={{ height: `${completedH}%` }}
                          title={`Completed: ${day.completed}`}
                        />
                      )}
                    </div>
                    <span className="text-[10px] text-stone-500">{dayLabel}</span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs text-stone-600">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                Completed
              </span>
              <span className="flex items-center gap-1.5 text-xs text-stone-600">
                <span className="h-2.5 w-2.5 rounded-sm bg-red-400" />
                Flagged
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Top Field Reps leaderboard */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-stone-800">Top Field Reps</h2>
            <p className="text-xs text-stone-500 mt-0.5">By completed visits this month</p>
          </CardHeader>
          <CardContent className="px-0 py-0">
            {summary.topFieldReps.length === 0 ? (
              <p className="px-6 py-6 text-sm text-stone-400">No visit data for this month yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-left">
                    <th className="px-6 py-3 text-xs font-medium text-stone-500">#</th>
                    <th className="px-2 py-3 text-xs font-medium text-stone-500">Name</th>
                    <th className="px-2 py-3 text-right text-xs font-medium text-stone-500">Visits</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500">Order Value</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.topFieldReps.map((rep) => (
                    <tr
                      key={rep.repId}
                      className="border-b border-stone-50 last:border-0 hover:bg-stone-50/60"
                    >
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            rep.rank === 1
                              ? "bg-amber-100 text-amber-700"
                              : rep.rank === 2
                              ? "bg-stone-100 text-stone-600"
                              : rep.rank === 3
                              ? "bg-orange-100 text-orange-700"
                              : "bg-stone-50 text-stone-500"
                          }`}
                        >
                          {rep.rank}
                        </span>
                      </td>
                      <td className="px-2 py-3 font-medium text-stone-800">{rep.name}</td>
                      <td className="px-2 py-3 text-right tabular-nums text-stone-700">
                        {rep.visitCount}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-stone-700">
                        {formatCurrency(rep.orderValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Customers by Tier ──────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-stone-800">Customers by Tier</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(["PLATINUM", "GOLD", "SILVER", "BRONZE"] as const).map((tier) => {
            const cfg = TIER_CONFIG[tier];
            const count = summary.customersByTier[tier] ?? 0;
            return (
              <div
                key={tier}
                className={`rounded-xl border p-5 ${cfg.bg}`}
              >
                <p className={`text-xs font-semibold uppercase tracking-wider ${cfg.color}`}>
                  {cfg.label}
                </p>
                <p className="mt-2 text-3xl font-bold text-stone-900">
                  {count.toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {summary.totalCustomers > 0
                    ? `${((count / summary.totalCustomers) * 100).toFixed(1)}% of total`
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
