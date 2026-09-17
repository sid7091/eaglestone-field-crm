import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { UserRole, Department, TaskPriority } from "../types/enums";
import { TaskTemplate } from "./TaskTemplate";

/**
 * One subtask in a template. At instantiation the assignee is resolved in
 * priority order: pinned user → department+region → role+region.
 */
@Entity("task_template_steps")
@Index(["templateId"])
export class TaskTemplateStep {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  templateId!: string;

  @ManyToOne(() => TaskTemplate, (template) => template.steps, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "templateId" })
  template!: TaskTemplate;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "enum", enum: UserRole, nullable: true })
  assigneeRole!: UserRole | null;

  @Column({ type: "enum", enum: Department, nullable: true })
  assigneeDepartment!: Department | null;

  /** Hard-pinned specific user (escape hatch, highest priority). */
  @Column({ type: "uuid", nullable: true })
  assigneeUserId!: string | null;

  @Column({ type: "enum", enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority!: TaskPriority;

  /**
   * Offset in hours applied to the root task's deadline to compute this
   * subtask's deadline. Negative = due before the parent (e.g. -24).
   */
  @Column({ type: "int", default: 0 })
  deadlineOffsetHours!: number;

  @Column({ type: "int", default: 0 })
  orderIndex!: number;
}
