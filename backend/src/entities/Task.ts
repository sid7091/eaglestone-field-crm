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
  TaskStatus,
  TaskPriority,
  TaskDecomposition,
} from "../types/enums";
import { User } from "./User";

@Entity("tasks")
@Index(["regionCode", "status"])
@Index(["assignedToId", "status"])
@Index(["rootTaskId"])
@Index(["parentTaskId"])
@Index(["deadline"])
export class Task {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "enum", enum: RegionCode })
  regionCode!: RegionCode;

  // ─── Assignment chain ──────────────────────────────────────
  @Column({ type: "uuid" })
  assignedById!: string;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "assignedById" })
  assignedBy!: User;

  @Column({ type: "uuid" })
  assignedToId!: string;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "assignedToId" })
  assignedTo!: User;

  /** Upstream task this was forwarded/split from (null for top-level). */
  @Column({ type: "uuid", nullable: true })
  parentTaskId!: string | null;

  /** Topmost ancestor — denormalized so the whole tree loads in one query. */
  @Column({ type: "uuid", nullable: true })
  rootTaskId!: string | null;

  // ─── State ─────────────────────────────────────────────────
  @Column({
    type: "enum",
    enum: TaskDecomposition,
    default: TaskDecomposition.NONE,
  })
  decomposition!: TaskDecomposition;

  @Column({ type: "enum", enum: TaskStatus, default: TaskStatus.PENDING })
  status!: TaskStatus;

  @Column({ type: "enum", enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority!: TaskPriority;

  @Column({ type: "timestamptz" })
  deadline!: Date;

  @Column({ type: "timestamptz", nullable: true })
  completedAt!: Date | null;

  @Column({ type: "boolean", nullable: true })
  completedOnTime!: boolean | null;

  /** Set when this task was instantiated from a template. */
  @Column({ type: "uuid", nullable: true })
  templateId!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
