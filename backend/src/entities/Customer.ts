import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from "typeorm";
import {
  RegionCode,
  CustomerType,
  CustomerTier,
  LeadStatus,
} from "../types/enums";
import type { ErpMetadata, GeoPoint } from "../types/erp-metadata";
import { Visit } from "./Visit";
import { Inventory } from "./Inventory";

@Entity("customers")
@Index(["regionCode", "leadStatus"])
@Index(["regionCode", "customerType"])
@Index(["gstin"], { unique: true, where: "gstin IS NOT NULL" })
export class Customer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // ─── Business Identity ──────────────────────────────────────
  @Column({ type: "varchar", length: 255 })
  businessName!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  contactPerson!: string | null;

  @Column({ type: "varchar", length: 20 })
  phone!: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  altPhone!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  email!: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  gstin!: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  pan!: string | null;

  // ─── Classification ─────────────────────────────────────────
  @Column({ type: "enum", enum: CustomerType })
  customerType!: CustomerType;

  @Column({ type: "enum", enum: CustomerTier, default: CustomerTier.BRONZE })
  tier!: CustomerTier;

  @Column({ type: "enum", enum: LeadStatus, default: LeadStatus.NEW })
  leadStatus!: LeadStatus;

  // ─── Region / Multi-Tenant Partitioning ─────────────────────
  @Column({ type: "enum", enum: RegionCode })
  regionCode!: RegionCode;

  @Column({ type: "varchar", length: 100 })
  district!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  city!: string | null;

  @Column({ type: "text" })
  address!: string;

  @Column({ type: "varchar", length: 10, nullable: true })
  pincode!: string | null;

  // ─── Geolocation (for geofence validation) ──────────────────
  @Column({ type: "jsonb", nullable: true })
  location!: GeoPoint | null;

  /** Pre-computed PostGIS point for spatial queries (optional) */
  @Column({
    type: "geography",
    spatialFeatureType: "Point",
    srid: 4326,
    nullable: true,
  })
  geoPoint!: string | null;

  // ─── Sales Context ──────────────────────────────────────────
  @Column({ type: "text", array: true, default: "{}" })
  preferredMaterials!: string[];

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  annualPotentialINR!: number;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  lifetimeValueINR!: number;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  // ─── ERP Bridge ─────────────────────────────────────────────
  /** JSONB for ERP external reference IDs (Odoo/SAP/Tally) */
  @Column({ type: "jsonb", nullable: true, default: {} })
  erpMetadata!: ErpMetadata;

  // ─── Timestamps ─────────────────────────────────────────────
  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;

  // ─── Relations ──────────────────────────────────────────────
  @OneToMany(() => Visit, (visit) => visit.customer)
  visits!: Visit[];

  @OneToMany(() => Inventory, (inv) => inv.reservedForCustomer)
  reservedInventory!: Inventory[];
}
