import "reflect-metadata";
import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { AppDataSource } from "../config/database";
import { SyncQueueService, ErpAdapter } from "../services/sync-queue.service";
import { SyncEntityType, SyncStatus } from "../types/enums";
import { SyncQueue } from "../entities/SyncQueue";

// ─── Redis Connection ─────────────────────────────────────────

const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  maxRetriesPerRequest: null, // Required by BullMQ
});

// ─── No-op ERP Adapter (replace with Odoo/SAP implementation) ─

const noopErpAdapter: ErpAdapter = {
  async push(entityType: SyncEntityType, payload: Record<string, unknown>) {
    // Simulate ERP API call with realistic delay
    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 800));

    // Simulate ~5% failure rate for testing retry logic
    if (Math.random() < 0.05) {
      throw new Error(`ERP_TIMEOUT: ${entityType} sync timed out after 30s`);
    }

    const erpId = `ERP-${entityType}-${Date.now()}`;
    console.log(`[ERP] Pushed ${entityType} → ${erpId}`);
    return { erpId, receivedAt: new Date().toISOString(), payload };
  },
};

// ─── BullMQ Worker ────────────────────────────────────────────

const QUEUE_NAME = "erp-sync";

const worker = new Worker(
  QUEUE_NAME,
  async (job: Job<{ syncQueueId: string }>) => {
    const syncService = new SyncQueueService();
    const repo = AppDataSource.getRepository(SyncQueue);

    const item = await repo.findOne({ where: { id: job.data.syncQueueId } });
    if (!item) {
      console.warn(`[Worker] SyncQueue item ${job.data.syncQueueId} not found, skipping`);
      return;
    }

    if (item.status === SyncStatus.COMPLETED) {
      console.log(`[Worker] Item ${item.id} already completed, skipping`);
      return;
    }

    await syncService.processItem(item, noopErpAdapter);
    console.log(`[Worker] Processed ${item.entityType}:${item.entityId} → ${item.status}`);
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 100,
      duration: 60_000, // Max 100 jobs per minute
    },
  }
);

worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("[Worker] Error:", err.message);
});

// ─── Batch Cron (processes pending items not yet queued as jobs) ─

async function processPendingBatch(): Promise<void> {
  const syncService = new SyncQueueService();
  const result = await syncService.processNextBatch(noopErpAdapter, 50);
  if (result.processed > 0) {
    console.log(
      `[Cron] Batch: ${result.processed} processed, ${result.failed} failed, ${result.deadLettered} dead-lettered`
    );
  }
}

// ─── Bootstrap ────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log("[Worker] Database connected");
    console.log("[Worker] BullMQ worker started, listening on queue:", QUEUE_NAME);

    // Run batch cron every 2 minutes
    setInterval(processPendingBatch, 2 * 60_000);

    // Initial batch on startup
    await processPendingBatch();
  } catch (error) {
    console.error("[Worker] Fatal:", error);
    process.exit(1);
  }
}

bootstrap();

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[Worker] Shutting down...");
  await worker.close();
  await connection.quit();
  process.exit(0);
});
