import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import {
  SyncStatus,
  SyncEntityType,
  SyncDirection,
  RegionCode,
} from "../types/enums";

/**
 * SyncQueue — Transactional outbox pattern for ERP integration.
 *
 * Every CRM mutation (create/update Customer, Visit, Inventory) inserts
 * a row here. A background worker (BullMQ) picks up PENDING records,
 * serializes them into the target ERP's API format, and pushes them out.
 *
 * This guarantees at-least-once delivery even if the ERP is temporarily
 * unavailable, and provides a full audit trail of all sync attempts.
 */
@Entity("sync_queue")
@Index(["status", "scheduledAt"])
@Index(["entityType", "entityId"])
@Index(["regionCode", "status"])
export class SyncQueue {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // ─── What to sync ───────────────────────────────────────────
  @Column({ type: "enum", enum: SyncEntityType })
  entityType!: SyncEntityType;

  /** UUID of the source record (Customer.id, Visit.id, etc.) */
  @Column({ type: "uuid" })
  entityId!: string;

  @Column({ type: "enum", enum: SyncDirection, default: SyncDirection.OUTBOUND })
  direction!: SyncDirection;

  @Column({ type: "enum", enum: RegionCode })
  regionCode!: RegionCode;

  // ─── Payload ────────────────────────────────────────────────
  /** Full serialized payload snapshot at time of enqueue */
  @Column({ type: "jsonb" })
  payload!: Record<string, unknown>;

  /** Target ERP system identifier */
  @Column({ type: "varchar", length: 50, default: "odoo" })
  targetSystem!: string;

  // ─── Processing State ───────────────────────────────────────
  @Column({ type: "enum", enum: SyncStatus, default: SyncStatus.PENDING })
  status!: SyncStatus;

  @Column({ type: "int", default: 0 })
  retryCount!: number;

  @Column({ type: "int", default: 5 })
  maxRetries!: number;

  /** When to next attempt processing */
  @Column({ type: "timestamptz", default: () => "NOW()" })
  scheduledAt!: Date;

  /** Last processing attempt timestamp */
  @Column({ type: "timestamptz", nullable: true })
  processedAt!: Date | null;

  /** Last error message if failed */
  @Column({ type: "text", nullable: true })
  lastError!: string | null;

  /** Response from ERP on success (IDs, confirmation codes) */
  @Column({ type: "jsonb", nullable: true })
  responsePayload!: Record<string, unknown> | null;

  // ─── Idempotency ───────────────────────────────────────────
  /** Unique key to prevent duplicate sync entries */
  @Column({ type: "varchar", length: 255, unique: true })
  idempotencyKey!: string;

  // ─── Timestamps ─────────────────────────────────────────────
  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
