import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

@Entity("user_gamification")
export class UserGamification {
  @PrimaryColumn({ type: "uuid" })
  userId!: string;

  @OneToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  /** Consecutive on-time completions. Resets to 0 on any late completion. */
  @Column({ type: "int", default: 0 })
  currentStreak!: number;

  @Column({ type: "int", default: 0 })
  bestStreak!: number;

  /** Cumulative — never decreases. */
  @Column({ type: "int", default: 0 })
  totalPoints!: number;

  @Column({ type: "int", default: 0 })
  tasksCompletedOnTime!: number;

  @Column({ type: "int", default: 0 })
  tasksCompletedLate!: number;

  @Column({ type: "text", array: true, default: "{}" })
  badges!: string[];

  @Column({ type: "timestamptz", nullable: true })
  lastCompletionAt!: Date | null;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
