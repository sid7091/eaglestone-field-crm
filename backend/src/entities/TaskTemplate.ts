import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { TaskPriority } from "../types/enums";
import { User } from "./User";
import { TaskTemplateStep } from "./TaskTemplateStep";

@Entity("task_templates")
export class TaskTemplate {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 150, unique: true })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "enum", enum: TaskPriority, default: TaskPriority.MEDIUM })
  defaultPriority!: TaskPriority;

  /** Hours from instantiation until the root task is due. */
  @Column({ type: "int", default: 72 })
  defaultDeadlineHours!: number;

  @Column({ type: "uuid" })
  createdById!: string;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "createdById" })
  createdBy!: User;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @OneToMany(() => TaskTemplateStep, (step) => step.template, {
    cascade: true,
  })
  steps!: TaskTemplateStep[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
