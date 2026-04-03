import { Router, Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { SyncQueue } from "../entities/SyncQueue";
import { SyncQueueService } from "../services/sync-queue.service";
import { SyncStatus, SyncEntityType, RegionCode } from "../types/enums";
import { z } from "zod";

const router = Router();

// ─── Validation Schemas ──────────────────────────────────────

const enqueueSchema = z.object({
  entityType: z.nativeEnum(SyncEntityType),
  entityId: z.string().uuid(),
  regionCode: z.nativeEnum(RegionCode),
  targetSystem: z.string().optional(),
});

const batchProcessSchema = z.object({
  batchSize: z.number().int().min(1).max(200).optional(),
});

const regionParam = z.object({
  regionCode: z.nativeEnum(RegionCode),
});

// ─── Routes ──────────────────────────────────────────────────

/**
 * POST /api/v1/erp-sync/enqueue
 * Manually enqueue a record for ERP sync.
 */
router.post("/enqueue", async (req: Request, res: Response) => {
  try {
    const parsed = enqueueSchema.parse(req.body);
    const service = new SyncQueueService();

    // Build the appropriate payload
    let payload: Record<string, unknown>;
    switch (parsed.entityType) {
      case SyncEntityType.CUSTOMER:
        payload = await service.buildCustomerPayload(parsed.entityId);
        break;
      case SyncEntityType.VISIT:
        payload = await service.buildVisitPayload(parsed.entityId);
        break;
      case SyncEntityType.INVENTORY:
        payload = await service.buildInventoryPayload(parsed.entityId);
        break;
      default:
        res.status(400).json({ error: `Unsupported entity type: ${parsed.entityType}` });
        return;
    }

    const entry = await service.enqueue({
      entityType: parsed.entityType,
      entityId: parsed.entityId,
      regionCode: parsed.regionCode,
      payload,
      targetSystem: parsed.targetSystem,
    });

    res.status(201).json({
      message: "Enqueued for ERP sync",
      syncId: entry.id,
      idempotencyKey: entry.idempotencyKey,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.errors });
      return;
    }
    const message = error instanceof Error ? error.message : "Internal error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/v1/erp-sync/queue
 * List pending sync queue items with optional filters.
 */
router.get("/queue", async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(SyncQueue);
    const { status, entityType, regionCode, limit } = req.query;

    const qb = repo.createQueryBuilder("sq").orderBy("sq.scheduledAt", "ASC");

    if (status && Object.values(SyncStatus).includes(status as SyncStatus)) {
      qb.andWhere("sq.status = :status", { status });
    }
    if (entityType && Object.values(SyncEntityType).includes(entityType as SyncEntityType)) {
      qb.andWhere("sq.entityType = :entityType", { entityType });
    }
    if (regionCode && Object.values(RegionCode).includes(regionCode as RegionCode)) {
      qb.andWhere("sq.regionCode = :regionCode", { regionCode });
    }

    qb.take(Math.min(parseInt(String(limit) || "100", 10), 500));

    const items = await qb.getMany();
    res.json({ count: items.length, items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/v1/erp-sync/stats
 * Sync queue statistics by status, optionally filtered by region.
 */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const service = new SyncQueueService();
    const regionCode = req.query.regionCode as RegionCode | undefined;
    const stats = await service.getStats(regionCode);
    res.json({ regionCode: regionCode ?? "ALL", stats });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/v1/erp-sync/process
 * Trigger batch processing of pending sync items (called by cron/worker).
 */
router.post("/process", async (req: Request, res: Response) => {
  try {
    const parsed = batchProcessSchema.parse(req.body);
    const service = new SyncQueueService();

    // Use a no-op adapter for now — real implementation would inject Odoo/SAP adapter
    const noopAdapter = {
      async push(_type: SyncEntityType, payload: Record<string, unknown>) {
        // In production, replace with actual ERP HTTP call
        return { erpId: `ERP-${Date.now()}`, received: true, payload };
      },
    };

    const result = await service.processNextBatch(noopAdapter, parsed.batchSize);
    res.json({ message: "Batch processed", ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/v1/erp-sync/retry-dead-letters/:regionCode
 * Re-queue all dead-lettered items for a region.
 */
router.post("/retry-dead-letters/:regionCode", async (req: Request, res: Response) => {
  try {
    const { regionCode } = regionParam.parse(req.params);
    const service = new SyncQueueService();
    const count = await service.retryDeadLetters(regionCode);
    res.json({ message: `Re-queued ${count} dead-lettered items`, count });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid region code", details: error.errors });
      return;
    }
    const message = error instanceof Error ? error.message : "Internal error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/v1/erp-sync/entity/:entityType/:entityId
 * Get sync history for a specific entity (audit trail).
 */
router.get("/entity/:entityType/:entityId", async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const repo = AppDataSource.getRepository(SyncQueue);

    const items = await repo.find({
      where: {
        entityType: entityType as SyncEntityType,
        entityId,
      },
      order: { createdAt: "DESC" },
      take: 50,
    });

    res.json({ entityType, entityId, syncHistory: items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    res.status(500).json({ error: message });
  }
});

export default router;
