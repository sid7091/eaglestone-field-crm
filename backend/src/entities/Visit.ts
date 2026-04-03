import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import {
  RegionCode,
  VisitStatus,
  VisitPurpose,
} from "../types/enums";
import type {
  ErpMetadata,
  GeoPoint,
  GeofenceValidation,
} from "../types/erp-metadata";
import { User } from "./User";
import { Customer } from "./Customer";

@Entity("visits")
@Index(["regionCode", "visitDate"])
@Index(["fieldRepId", "visitDate"])
@Index(["customerId", "visitDate"])
@Index(["status"])
export class Visit {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // ─── Region Partitioning ────────────────────────────────────
  @Column({ type: "enum", enum: RegionCode })
  regionCode!: RegionCode;

  // ─── Visit Scheduling ──────────────────────────────────────
  @Column({ type: "date" })
  visitDate!: string;

  @Column({ type: "enum", enum: VisitPurpose })
  purpose!: VisitPurpose;

  @Column({ type: "enum", enum: VisitStatus, default: VisitStatus.PLANNED })
  status!: VisitStatus;

  // ─── Check-in / Check-out ──────────────────────────────────
  @Column({ type: "timestamptz", nullable: true })
  checkinTime!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  checkoutTime!: Date | null;

  /** Duration in minutes, computed on checkout */
  @Column({ type: "int", nullable: true })
  durationMinutes!: number | null;

  // ─── Geolocation Capture ────────────────────────────────────
  @Column({ type: "jsonb", nullable: true })
  checkinLocation!: GeoPoint | null;

  @Column({ type: "jsonb", nullable: true })
  checkoutLocation!: GeoPoint | null;

  /** Full geofence validation result — proves rep was within 100m */
  @Column({ type: "jsonb", nullable: true })
  geofenceValidation!: GeofenceValidation | null;

  // ─── Visit Outcome ─────────────────────────────────────────
  @Column({ type: "text", nullable: true })
  summary!: string | null;

  @Column({ type: "text", nullable: true })
  actionItems!: string | null;

  @Column({ type: "text", nullable: true })
  nextSteps!: string | null;

  @Column({ type: "date", nullable: true })
  followUpDate!: string | null;

  /** Order value discussed/collected during visit */
  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  orderValueINR!: number | null;

  /** Photos captured during visit (S3/storage URLs) */
  @Column({ type: "text", array: true, default: "{}" })
  photoUrls!: string[];

  // ─── Offline Sync Tracking ─────────────────────────────────
  /** True if this record was created offline and synced later */
  @Column({ type: "boolean", default: false })
  createdOffline!: boolean;

  /** Client-side UUID generated offline for dedup */
  @Column({ type: "uuid", nullable: true, unique: true })
  offlineId!: string | null;

  /** Timestamp when the offline record was synced to server */
  @Column({ type: "timestamptz", nullable: true })
  syncedAt!: Date | null;

  // ─── ERP Bridge ─────────────────────────────────────────────
  @Column({ type: "jsonb", nullable: true, default: {} })
  erpMetadata!: ErpMetadata;

  // ─── Timestamps ─────────────────────────────────────────────
  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;

  // ─── Relations ──────────────────────────────────────────────
  @Column({ type: "uuid" })
  fieldRepId!: string;

  @ManyToOne(() => User, (user) => user.visits, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "fieldRepId" })
  fieldRep!: User;

  @Column({ type: "uuid" })
  customerId!: string;

  @ManyToOne(() => Customer, (customer) => customer.visits, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "customerId" })
  customer!: Customer;
}
