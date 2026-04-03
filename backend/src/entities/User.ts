import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from "typeorm";
import { UserRole, RegionCode } from "../types/enums";
import type { ErpMetadata } from "../types/erp-metadata";
import { Visit } from "./Visit";

@Entity("users")
@Index(["regionCode", "role"])
@Index(["email"], { unique: true })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "varchar", length: 255 })
  passwordHash!: string;

  @Column({ type: "varchar", length: 150 })
  fullName!: string;

  @Column({ type: "varchar", length: 20 })
  phone!: string;

  @Column({ type: "enum", enum: UserRole, default: UserRole.FIELD_REP })
  role!: UserRole;

  @Column({ type: "enum", enum: RegionCode })
  regionCode!: RegionCode;

  @Column({ type: "varchar", length: 100, nullable: true })
  district!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  territory!: string | null;

  /** Manager UUID — self-referencing hierarchy */
  @Column({ type: "uuid", nullable: true })
  reportsTo!: string | null;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  /** JSONB for ERP external reference IDs (Odoo/SAP/Tally) */
  @Column({ type: "jsonb", nullable: true, default: {} })
  erpMetadata!: ErpMetadata;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;

  // ─── Relations ──────────────────────────────────────────────
  @OneToMany(() => Visit, (visit) => visit.fieldRep)
  visits!: Visit[];
}
