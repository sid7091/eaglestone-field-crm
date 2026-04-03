import { Repository, LessThanOrEqual, In } from "typeorm";
import { SyncQueue } from "../entities/SyncQueue";
import { Customer } from "../entities/Customer";
import { Visit } from "../entities/Visit";
import { Inventory } from "../entities/Inventory";
import { AppDataSource } from "../config/database";
import {
  SyncStatus,
  SyncEntityType,
  SyncDirection,
  RegionCode,
} from "../types/enums";

/**
 * SyncQueueService — Transactional outbox pattern for ERP integration.
 *
 * Flow:
 *  1. Any CRM write (create/update) calls `enqueue()` within the same transaction.
 *  2. A BullMQ worker calls `processNextBatch()` on a cron schedule.
 *  3. Each item is serialized and POSTed to the target ERP's webhook/API.
 *  4. On success → COMPLETED. On failure → retry with exponential backoff.
 *  5. After max retries → DEAD_LETTER for manual intervention.
 */
export class SyncQueueService {
  private repo: Repository<SyncQueue>;

  constructor() {
    this.repo = AppDataSource.getRepository(SyncQueue);
  }

  /**
   * Enqueue a record for outbound ERP sync.
   * Call this inside the same DB transaction as the CRM write.
   */
  async enqueue(params: {
    entityType: SyncEntityType;
    entityId: string;
    regionCode: RegionCode;
    payload: Record<string, unknown>;
    targetSystem?: string;
    direction?: SyncDirection;
  }): Promise<SyncQueue> {
    const idempotencyKey = `${params.entityType}:${params.entityId}:${Date.now()}`;

    const entry = this.repo.create({
      entityType: params.entityType,
      entityId: params.entityId,
      regionCode: params.regionCode,
      payload: params.payload,
      targetSystem: params.targetSystem ?? "odoo",
      direction: params.direction ?? SyncDirection.OUTBOUND,
      status: SyncStatus.PENDING,
      scheduledAt: new Date(),
      idempotencyKey,
    });

    return this.repo.save(entry);
  }

  /**
   * Fetch the next batch of PENDING items ready for processing.
   */
  async fetchPendingBatch(batchSize: number = 50): Promise<SyncQueue[]> {
    return this.repo.find({
      where: {
        status: In([SyncStatus.PENDING, SyncStatus.FAILED]),
        scheduledAt: LessThanOrEqual(new Date()),
      },
      order: { scheduledAt: "ASC" },
      take: batchSize,
    });
  }

  /**
   * Process a single sync queue item.
   * In production, this would call the actual ERP API.
   */
  async processItem(
    item: SyncQueue,
    erpAdapter: ErpAdapter
  ): Promise<void> {
    // Mark as in-progress
    item.status = SyncStatus.IN_PROGRESS;
    item.processedAt = new Date();
    await this.repo.save(item);

    try {
      const response = await erpAdapter.push(item.entityType, item.payload);

      // Success — mark completed and store ERP response
      item.status = SyncStatus.COMPLETED;
      item.responsePayload = response;
      item.lastError = null;
      await this.repo.save(item);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      item.retryCount += 1;
      item.lastError = errMsg;

      if (item.retryCount >= item.maxRetries) {
        // Exhausted retries — move to dead letter
        item.status = SyncStatus.DEAD_LETTER;
      } else {
        // Schedule retry with exponential backoff: 2^retryCount minutes
        item.status = SyncStatus.FAILED;
        const backoffMs = Math.pow(2, item.retryCount) * 60_000;
        item.scheduledAt = new Date(Date.now() + backoffMs);
      }

      await this.repo.save(item);
    }
  }

  /**
   * Process an entire batch with a given ERP adapter.
   */
  async processNextBatch(
    erpAdapter: ErpAdapter,
    batchSize: number = 50
  ): Promise<{ processed: number; failed: number; deadLettered: number }> {
    const batch = await this.fetchPendingBatch(batchSize);
    let failed = 0;
    let deadLettered = 0;

    for (const item of batch) {
      await this.processItem(item, erpAdapter);
      if (item.status === SyncStatus.FAILED) failed++;
      if (item.status === SyncStatus.DEAD_LETTER) deadLettered++;
    }

    return {
      processed: batch.length,
      failed,
      deadLettered,
    };
  }

  /**
   * Build the ERP-ready payload for a Customer entity.
   */
  async buildCustomerPayload(customerId: string): Promise<Record<string, unknown>> {
    const customerRepo = AppDataSource.getRepository(Customer);
    const customer = await customerRepo.findOneByOrFail({ id: customerId });

    return {
      _type: "customer",
      _version: "1.0",
      _exportedAt: new Date().toISOString(),
      id: customer.id,
      businessName: customer.businessName,
      contactPerson: customer.contactPerson,
      phone: customer.phone,
      email: customer.email,
      gstin: customer.gstin,
      pan: customer.pan,
      customerType: customer.customerType,
      tier: customer.tier,
      regionCode: customer.regionCode,
      district: customer.district,
      city: customer.city,
      address: customer.address,
      pincode: customer.pincode,
      location: customer.location,
      preferredMaterials: customer.preferredMaterials,
      annualPotentialINR: customer.annualPotentialINR,
      erpMetadata: customer.erpMetadata,
    };
  }

  /**
   * Build the ERP-ready payload for a Visit entity.
   */
  async buildVisitPayload(visitId: string): Promise<Record<string, unknown>> {
    const visitRepo = AppDataSource.getRepository(Visit);
    const visit = await visitRepo.findOneOrFail({
      where: { id: visitId },
      relations: ["fieldRep", "customer"],
    });

    return {
      _type: "visit",
      _version: "1.0",
      _exportedAt: new Date().toISOString(),
      id: visit.id,
      visitDate: visit.visitDate,
      purpose: visit.purpose,
      status: visit.status,
      fieldRep: {
        id: visit.fieldRep.id,
        name: visit.fieldRep.fullName,
        regionCode: visit.fieldRep.regionCode,
      },
      customer: {
        id: visit.customer.id,
        businessName: visit.customer.businessName,
        regionCode: visit.customer.regionCode,
      },
      checkinTime: visit.checkinTime,
      checkoutTime: visit.checkoutTime,
      durationMinutes: visit.durationMinutes,
      geofenceValidation: visit.geofenceValidation,
      summary: visit.summary,
      orderValueINR: visit.orderValueINR,
      erpMetadata: visit.erpMetadata,
    };
  }

  /**
   * Build the ERP-ready payload for an Inventory entity.
   */
  async buildInventoryPayload(inventoryId: string): Promise<Record<string, unknown>> {
    const invRepo = AppDataSource.getRepository(Inventory);
    const inv = await invRepo.findOneByOrFail({ id: inventoryId });

    return {
      _type: "inventory",
      _version: "1.0",
      _exportedAt: new Date().toISOString(),
      id: inv.id,
      sku: inv.sku,
      materialType: inv.materialType,
      variety: inv.variety,
      color: inv.color,
      finishType: inv.finishType,
      grade: inv.grade,
      dimensions: {
        lengthCm: inv.lengthCm,
        widthCm: inv.widthCm,
        thicknessMm: inv.thicknessMm,
      },
      quantityAvailable: inv.quantityAvailable,
      quantityReserved: inv.quantityReserved,
      pricePerSqftINR: inv.pricePerSqftINR,
      warehouseCode: inv.warehouseCode,
      rackLocation: inv.rackLocation,
      status: inv.status,
      erpMetadata: inv.erpMetadata,
    };
  }

  /**
   * Get sync queue stats by region (for admin dashboard).
   */
  async getStats(regionCode?: RegionCode): Promise<Record<string, number>> {
    const qb = this.repo
      .createQueryBuilder("sq")
      .select("sq.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("sq.status");

    if (regionCode) {
      qb.where("sq.regionCode = :regionCode", { regionCode });
    }

    const rows = await qb.getRawMany<{ status: string; count: string }>();
    const stats: Record<string, number> = {};
    for (const row of rows) {
      stats[row.status] = parseInt(row.count, 10);
    }
    return stats;
  }

  /**
   * Retry all dead-lettered items for a region (manual intervention).
   */
  async retryDeadLetters(regionCode: RegionCode): Promise<number> {
    const result = await this.repo.update(
      { regionCode, status: SyncStatus.DEAD_LETTER },
      {
        status: SyncStatus.PENDING,
        retryCount: 0,
        scheduledAt: new Date(),
        lastError: null,
      }
    );
    return result.affected ?? 0;
  }
}

/**
 * Interface for ERP system adapters.
 * Implement one per target ERP (Odoo, SAP B1, Tally, etc.)
 */
export interface ErpAdapter {
  /** Push a single entity payload to the ERP system */
  push(
    entityType: SyncEntityType,
    payload: Record<string, unknown>
  ): Promise<Record<string, unknown>>;

  /** Pull updated records from ERP (for inbound sync) */
  pull?(
    entityType: SyncEntityType,
    since: Date
  ): Promise<Array<Record<string, unknown>>>;
}
