"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import StatCard from "@/components/ui/StatCard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";

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
  const [summary, setSummary] = useState<FieldSummary | null>(null);
  const [trends, setTrends] = useState<VisitTrend[]>([]);
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true);
        setError(null);

        const [summaryRes, trendsRes, pipelineRes] = await Promise.all([
          api.get<{ data: FieldSummary }>("/analytics/field-summary"),
          api.get<{ data: VisitTrend[] }>("/analytics/visit-trends"),
          api.get<{ data: PipelineItem[] }>("/analytics/pipeline"),
        ]);

        setSummary(summaryRes.data);
        setTrends(trendsRes.data);
        setPipeline(pipelineRes.data);
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

      {/* ── Row 2: Lead Pipeline ──────────────────────────────────────────── */}
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
