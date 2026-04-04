import { Router, Response } from "express";
import { AppDataSource } from "../config/database";
import { UserRole, VisitStatus, LeadStatus, CustomerTier, VisitPurpose } from "../types/enums";
import {
  authenticateToken,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Builds a region-scoping SQL fragment and its bind param.
 *  Returns { clause, params } where clause is either empty or
 *  "AND table.\"regionCode\" = $N" with the next available param index. */
function regionScope(
  isAdmin: boolean,
  regionCode: string,
  alias: string,
  startIndex: number
): { clause: string; params: string[] } {
  if (isAdmin) return { clause: "", params: [] };
  return {
    clause: `AND ${alias}."regionCode" = $${startIndex}`,
    params: [regionCode],
  };
}

// ─── GET /field-summary ───────────────────────────────────────────────────────

router.get(
  "/field-summary",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      const isAdmin = user.role === UserRole.ADMIN;
      const regionParam = user.regionCode;

      const regionWhere = isAdmin ? "" : `AND c."regionCode" = $1`;
      const visitRegionWhere = isAdmin ? "" : `AND v."regionCode" = $1`;
      const bindParams: string[] = isAdmin ? [] : [regionParam];

      // ── Customer counts ──────────────────────────────────────────────────
      const totalCustomersResult: Array<{ count: string }> =
        await AppDataSource.query(
          `SELECT COUNT(*) AS count FROM customers c WHERE 1=1 ${regionWhere}`,
          bindParams
        );
      const totalCustomers = parseInt(totalCustomersResult[0]?.count ?? "0", 10);

      const customersByTierResult: Array<{ tier: string; count: string }> =
        await AppDataSource.query(
          `SELECT c.tier, COUNT(*) AS count
           FROM customers c
           WHERE 1=1 ${regionWhere}
           GROUP BY c.tier`,
          bindParams
        );
      const customersByTier: Record<string, number> = {};
      for (const tier of Object.values(CustomerTier)) {
        customersByTier[tier] = 0;
      }
      for (const row of customersByTierResult) {
        customersByTier[row.tier] = parseInt(row.count, 10);
      }

      const customersByStatusResult: Array<{ leadStatus: string; count: string }> =
        await AppDataSource.query(
          `SELECT c."leadStatus", COUNT(*) AS count
           FROM customers c
           WHERE 1=1 ${regionWhere}
           GROUP BY c."leadStatus"`,
          bindParams
        );
      const customersByStatus: Record<string, number> = {};
      for (const status of Object.values(LeadStatus)) {
        customersByStatus[status] = 0;
      }
      for (const row of customersByStatusResult) {
        customersByStatus[row.leadStatus] = parseInt(row.count, 10);
      }

      // ── Visit KPIs (this calendar month) ────────────────────────────────
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      // We need to decide param index dynamically
      const visitBaseParams: (string | Date)[] = isAdmin
        ? [monthStart]
        : [regionParam, monthStart];
      const monthIdx = isAdmin ? 1 : 2;

      const visitSummaryResult: Array<{
        total: string;
        completed: string;
        flagged: string;
        avg_duration: string | null;
        total_order_value: string | null;
        geofence_pass: string;
        geofence_total: string;
      }> = await AppDataSource.query(
        `SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE v.status = '${VisitStatus.COMPLETED}') AS completed,
           COUNT(*) FILTER (WHERE v.status = '${VisitStatus.FLAGGED_FAKE}') AS flagged,
           AVG(v."durationMinutes") FILTER (WHERE v."durationMinutes" IS NOT NULL) AS avg_duration,
           SUM(v."orderValueINR") FILTER (WHERE v.status = '${VisitStatus.COMPLETED}') AS total_order_value,
           COUNT(*) FILTER (WHERE (v."geofenceValidation"->>'passed')::boolean = true) AS geofence_pass,
           COUNT(*) FILTER (WHERE v."geofenceValidation" IS NOT NULL) AS geofence_total
         FROM visits v
         WHERE v."visitDate" >= $${monthIdx} ${visitRegionWhere}`,
        visitBaseParams
      );

      const vs = visitSummaryResult[0];
      const totalVisitsThisMonth = parseInt(vs?.total ?? "0", 10);
      const completedVisits = parseInt(vs?.completed ?? "0", 10);
      const flaggedVisits = parseInt(vs?.flagged ?? "0", 10);
      const avgVisitDurationMinutes = vs?.avg_duration
        ? Math.round(parseFloat(vs.avg_duration))
        : 0;
      const totalOrderValueThisMonth = vs?.total_order_value
        ? Math.round(parseFloat(vs.total_order_value))
        : 0;

      const geofencePass = parseInt(vs?.geofence_pass ?? "0", 10);
      const geofenceTotal = parseInt(vs?.geofence_total ?? "0", 10);
      const geofenceComplianceRate =
        geofenceTotal > 0
          ? Math.round((geofencePass / geofenceTotal) * 100)
          : 0;

      // ── Top 5 field reps by completed visits this month ──────────────────
      const topRepsResult: Array<{
        repId: string;
        fullName: string;
        visitCount: string;
        orderValue: string | null;
      }> = await AppDataSource.query(
        `SELECT
           v."fieldRepId" AS "repId",
           u."fullName",
           COUNT(*) AS "visitCount",
           SUM(v."orderValueINR") AS "orderValue"
         FROM visits v
         JOIN users u ON u.id = v."fieldRepId"
         WHERE v.status = '${VisitStatus.COMPLETED}'
           AND v."visitDate" >= $${monthIdx} ${visitRegionWhere}
         GROUP BY v."fieldRepId", u."fullName"
         ORDER BY "visitCount" DESC
         LIMIT 5`,
        visitBaseParams
      );

      const topFieldReps = topRepsResult.map((row, idx) => ({
        rank: idx + 1,
        repId: row.repId,
        name: row.fullName,
        visitCount: parseInt(row.visitCount, 10),
        orderValue: row.orderValue ? Math.round(parseFloat(row.orderValue)) : 0,
      }));

      res.json({
        data: {
          totalCustomers,
          customersByTier,
          customersByStatus,
          totalVisitsThisMonth,
          completedVisits,
          flaggedVisits,
          avgVisitDurationMinutes,
          totalOrderValueThisMonth,
          geofenceComplianceRate,
          topFieldReps,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal error";
      console.error("[Analytics] /field-summary error:", error);
      res.status(500).json({ error: message });
    }
  }
);

// ─── GET /visit-trends ────────────────────────────────────────────────────────

router.get(
  "/visit-trends",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      const isAdmin = user.role === UserRole.ADMIN;
      const regionParam = user.regionCode;

      const visitRegionWhere = isAdmin ? "" : `AND v."regionCode" = $2`;
      const bindParams: (string | Date)[] = isAdmin
        ? [new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)]
        : [new Date(Date.now() - 29 * 24 * 60 * 60 * 1000), regionParam];

      const rows: Array<{
        day: string;
        planned: string;
        completed: string;
        flagged: string;
      }> = await AppDataSource.query(
        `SELECT
           TO_CHAR(v."visitDate"::date, 'YYYY-MM-DD') AS day,
           COUNT(*) FILTER (WHERE v.status = '${VisitStatus.PLANNED}') AS planned,
           COUNT(*) FILTER (WHERE v.status = '${VisitStatus.COMPLETED}') AS completed,
           COUNT(*) FILTER (WHERE v.status = '${VisitStatus.FLAGGED_FAKE}') AS flagged
         FROM visits v
         WHERE v."visitDate"::date >= $1 ${visitRegionWhere}
         GROUP BY day
         ORDER BY day ASC`,
        bindParams
      );

      const trends = rows.map((row) => ({
        date: row.day,
        planned: parseInt(row.planned, 10),
        completed: parseInt(row.completed, 10),
        flagged: parseInt(row.flagged, 10),
      }));

      res.json({ data: trends });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal error";
      console.error("[Analytics] /visit-trends error:", error);
      res.status(500).json({ error: message });
    }
  }
);

// ─── GET /pipeline ────────────────────────────────────────────────────────────

router.get(
  "/pipeline",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      const isAdmin = user.role === UserRole.ADMIN;
      const regionParam = user.regionCode;

      const regionWhere = isAdmin ? "" : `AND c."regionCode" = $1`;
      const bindParams: string[] = isAdmin ? [] : [regionParam];

      const rows: Array<{
        leadStatus: string;
        count: string;
        totalPotential: string | null;
      }> = await AppDataSource.query(
        `SELECT
           c."leadStatus",
           COUNT(*) AS count,
           SUM(c."annualPotentialINR") AS "totalPotential"
         FROM customers c
         WHERE 1=1 ${regionWhere}
         GROUP BY c."leadStatus"
         ORDER BY COUNT(*) DESC`,
        bindParams
      );

      // Ensure all LeadStatus values are represented
      const statusMap = new Map<string, { count: number; totalPotentialINR: number }>();
      for (const status of Object.values(LeadStatus)) {
        statusMap.set(status, { count: 0, totalPotentialINR: 0 });
      }
      for (const row of rows) {
        statusMap.set(row.leadStatus, {
          count: parseInt(row.count, 10),
          totalPotentialINR: row.totalPotential
            ? Math.round(parseFloat(row.totalPotential))
            : 0,
        });
      }

      const pipeline = Array.from(statusMap.entries()).map(([status, val]) => ({
        status,
        count: val.count,
        totalPotentialINR: val.totalPotentialINR,
      }));

      res.json({ data: pipeline });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal error";
      console.error("[Analytics] /pipeline error:", error);
      res.status(500).json({ error: message });
    }
  }
);

// ─── GET /rep-performance/:repId ──────────────────────────────────────────────

router.get(
  "/rep-performance/:repId",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { repId } = req.params;
      const user = req.user;
      const isAdmin = user.role === UserRole.ADMIN;
      const regionParam = user.regionCode;

      // Non-admins can only query their own region's reps
      const regionWhere = isAdmin ? "" : `AND v."regionCode" = $2`;
      const baseParams: (string | Date)[] = isAdmin
        ? [repId]
        : [repId, regionParam];

      // This month and last month date boundaries
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

      const nextParamIdx = baseParams.length + 1;
      const paramsWithDates = [
        ...baseParams,
        thisMonthStart,
        lastMonthStart,
        lastMonthEnd,
      ];

      const summaryResult: Array<{
        visits_this_month: string;
        visits_last_month: string;
        completed_count: string;
        flagged_count: string;
        avg_duration: string | null;
        total_order_value: string | null;
        customers_covered: string;
      }> = await AppDataSource.query(
        `SELECT
           COUNT(*) FILTER (WHERE v."visitDate"::date >= $${nextParamIdx}) AS visits_this_month,
           COUNT(*) FILTER (WHERE v."visitDate"::date >= $${nextParamIdx + 1} AND v."visitDate"::date < $${nextParamIdx + 2}) AS visits_last_month,
           COUNT(*) FILTER (WHERE v.status = '${VisitStatus.COMPLETED}') AS completed_count,
           COUNT(*) FILTER (WHERE v.status = '${VisitStatus.FLAGGED_FAKE}') AS flagged_count,
           AVG(v."durationMinutes") FILTER (WHERE v."durationMinutes" IS NOT NULL) AS avg_duration,
           SUM(v."orderValueINR") FILTER (WHERE v.status = '${VisitStatus.COMPLETED}') AS total_order_value,
           COUNT(DISTINCT v."customerId") FILTER (WHERE v."visitDate"::date >= $${nextParamIdx}) AS customers_covered
         FROM visits v
         WHERE v."fieldRepId" = $1 ${regionWhere}`,
        paramsWithDates
      );

      const summary = summaryResult[0];

      // Geofence compliance for this rep
      const geofenceResult: Array<{
        pass: string;
        total: string;
      }> = await AppDataSource.query(
        `SELECT
           COUNT(*) FILTER (WHERE (v."geofenceValidation"->>'passed')::boolean = true) AS pass,
           COUNT(*) FILTER (WHERE v."geofenceValidation" IS NOT NULL) AS total
         FROM visits v
         WHERE v."fieldRepId" = $1 ${regionWhere}`,
        baseParams
      );

      const gf = geofenceResult[0];
      const gfPass = parseInt(gf?.pass ?? "0", 10);
      const gfTotal = parseInt(gf?.total ?? "0", 10);
      const geofenceComplianceRate =
        gfTotal > 0 ? Math.round((gfPass / gfTotal) * 100) : 0;

      // Visits by purpose
      const purposeResult: Array<{ purpose: string; count: string }> =
        await AppDataSource.query(
          `SELECT v.purpose, COUNT(*) AS count
           FROM visits v
           WHERE v."fieldRepId" = $1 ${regionWhere}
           GROUP BY v.purpose`,
          baseParams
        );

      const visitsByPurpose: Record<string, number> = {};
      for (const purpose of Object.values(VisitPurpose)) {
        visitsByPurpose[purpose] = 0;
      }
      for (const row of purposeResult) {
        visitsByPurpose[row.purpose] = parseInt(row.count, 10);
      }

      const avgDuration = summary?.avg_duration
        ? Math.round(parseFloat(summary.avg_duration))
        : 0;

      res.json({
        data: {
          repId,
          visitsThisMonth: parseInt(summary?.visits_this_month ?? "0", 10),
          visitsLastMonth: parseInt(summary?.visits_last_month ?? "0", 10),
          completedCount: parseInt(summary?.completed_count ?? "0", 10),
          flaggedCount: parseInt(summary?.flagged_count ?? "0", 10),
          avgDuration,
          totalOrderValue: summary?.total_order_value
            ? Math.round(parseFloat(summary.total_order_value))
            : 0,
          geofenceComplianceRate,
          customersCovered: parseInt(summary?.customers_covered ?? "0", 10),
          visitsByPurpose,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal error";
      console.error("[Analytics] /rep-performance error:", error);
      res.status(500).json({ error: message });
    }
  }
);

export default router;
