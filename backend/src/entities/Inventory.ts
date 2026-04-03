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
import { RegionCode, InventoryStatus } from "../types/enums";
import type { ErpMetadata } from "../types/erp-metadata";
import { Customer } from "./Customer";

@Entity("inventory")
@Index(["regionCode", "status"])
@Index(["materialType", "variety"])
@Index(["warehouseCode"])
export class Inventory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // ─── Region Partitioning ────────────────────────────────────
  @Column({ type: "enum", enum: RegionCode })
  regionCode!: RegionCode;

  // ─── Material Identification ────────────────────────────────
  @Column({ type: "varchar", length: 50, unique: true })
  sku!: string;

  @Column({ type: "varchar", length: 100 })
  materialType!: string; // Italian Marble, Indian Granite, etc.

  @Column({ type: "varchar", length: 100 })
  variety!: string; // Statuario, Calacatta, Black Galaxy, etc.

  @Column({ type: "varchar", length: 50 })
  color!: string;

  @Column({ type: "varchar", length: 50 })
  finishType!: string; // POLISHED, HONED, LEATHER, BRUSHED

  @Column({ type: "varchar", length: 10 })
  grade!: string; // A, B, C, D

  // ─── Dimensions & Quantity ──────────────────────────────────
  @Column({ type: "decimal", precision: 8, scale: 2 })
  lengthCm!: number;

  @Column({ type: "decimal", precision: 8, scale: 2 })
  widthCm!: number;

  @Column({ type: "decimal", precision: 6, scale: 2 })
  thicknessMm!: number;

  @Column({ type: "int", default: 1 })
  quantityAvailable!: number;

  @Column({ type: "int", default: 0 })
  quantityReserved!: number;

  // ─── Pricing ────────────────────────────────────────────────
  @Column({ type: "decimal", precision: 12, scale: 2 })
  pricePerSqftINR!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  landedCostPerSqftINR!: number | null;

  // ─── Warehouse / Location ───────────────────────────────────
  @Column({ type: "varchar", length: 50 })
  warehouseCode!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  rackLocation!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  bundleNumber!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  blockReference!: string | null;

  // ─── Status ─────────────────────────────────────────────────
  @Column({
    type: "enum",
    enum: InventoryStatus,
    default: InventoryStatus.IN_STOCK,
  })
  status!: InventoryStatus;

  // ─── Reservation ────────────────────────────────────────────
  @Column({ type: "uuid", nullable: true })
  reservedForCustomerId!: string | null;

  @ManyToOne(() => Customer, (c) => c.reservedInventory, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "reservedForCustomerId" })
  reservedForCustomer!: Customer | null;

  @Column({ type: "timestamptz", nullable: true })
  reservedDate!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  soldDate!: Date | null;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  // ─── ERP Bridge ─────────────────────────────────────────────
  @Column({ type: "jsonb", nullable: true, default: {} })
  erpMetadata!: ErpMetadata;

  // ─── Timestamps ─────────────────────────────────────────────
  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
