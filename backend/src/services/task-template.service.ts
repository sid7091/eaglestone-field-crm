import { EntityManager } from "typeorm";
import { TaskTemplate } from "../entities/TaskTemplate";
import { TaskTemplateStep } from "../entities/TaskTemplateStep";
import { Task } from "../entities/Task";
import { User } from "../entities/User";
import {
  RegionCode,
  TaskStatus,
  TaskDecomposition,
} from "../types/enums";

export interface StepResolution {
  stepId: string;
  title: string;
  resolvedUserId: string | null;
  resolvedUserName: string | null;
  reason?: string;
}

/**
 * Resolve a single step to a concrete user, scoped to `regionCode`.
 * Priority: pinned user → department+region → role+region (oldest first).
 */
async function resolveStep(
  manager: EntityManager,
  step: TaskTemplateStep,
  regionCode: RegionCode,
): Promise<{ user: User | null; reason?: string }> {
  const userRepo = manager.getRepository(User);

  if (step.assigneeUserId) {
    const user = await userRepo.findOne({
      where: { id: step.assigneeUserId, isActive: true },
    });
    return user
      ? { user }
      : { user: null, reason: "Pinned user not found or inactive" };
  }

  if (step.assigneeDepartment) {
    const user = await userRepo.findOne({
      where: {
        department: step.assigneeDepartment,
        regionCode,
        isActive: true,
      },
      order: { createdAt: "ASC" },
    });
    return user
      ? { user }
      : {
          user: null,
          reason: `No active ${step.assigneeDepartment} user in region ${regionCode}`,
        };
  }

  if (step.assigneeRole) {
    const user = await userRepo.findOne({
      where: { role: step.assigneeRole, regionCode, isActive: true },
      order: { createdAt: "ASC" },
    });
    return user
      ? { user }
      : {
          user: null,
          reason: `No active ${step.assigneeRole} user in region ${regionCode}`,
        };
  }

  return { user: null, reason: "Step has no assignee rule" };
}

export async function previewResolution(
  manager: EntityManager,
  templateId: string,
  regionCode: RegionCode,
): Promise<StepResolution[]> {
  const template = await manager.getRepository(TaskTemplate).findOne({
    where: { id: templateId },
    relations: { steps: true },
  });
  if (!template) throw new Error("Template not found");

  const steps = [...template.steps].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  const out: StepResolution[] = [];
  for (const step of steps) {
    const { user, reason } = await resolveStep(manager, step, regionCode);
    out.push({
      stepId: step.id,
      title: step.title,
      resolvedUserId: user?.id ?? null,
      resolvedUserName: user?.fullName ?? null,
      reason,
    });
  }
  return out;
}

export class UnresolvedStepError extends Error {
  constructor(public unresolved: StepResolution[]) {
    super("One or more template steps could not be assigned");
    this.name = "UnresolvedStepError";
  }
}

/**
 * Instantiate a template into a live task tree (root + parallel subtasks),
 * transactionally. The instantiator owns the coordinating root task.
 */
export async function instantiateTemplate(
  manager: EntityManager,
  params: {
    templateId: string;
    regionCode: RegionCode;
    actorId: string;
    deadlineOverrideHours?: number;
  },
): Promise<Task> {
  const { templateId, regionCode, actorId, deadlineOverrideHours } = params;

  const template = await manager.getRepository(TaskTemplate).findOne({
    where: { id: templateId, isActive: true },
    relations: { steps: true },
  });
  if (!template) throw new Error("Template not found or inactive");

  const steps = [...template.steps].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  // Resolve every step up front; fail fast if any is unresolvable.
  const resolutions: { step: TaskTemplateStep; user: User }[] = [];
  const failures: StepResolution[] = [];
  for (const step of steps) {
    const { user, reason } = await resolveStep(manager, step, regionCode);
    if (user) {
      resolutions.push({ step, user });
    } else {
      failures.push({
        stepId: step.id,
        title: step.title,
        resolvedUserId: null,
        resolvedUserName: null,
        reason,
      });
    }
  }
  if (failures.length > 0) throw new UnresolvedStepError(failures);

  const taskRepo = manager.getRepository(Task);
  const now = Date.now();
  const rootDeadlineHours =
    deadlineOverrideHours ?? template.defaultDeadlineHours;
  const rootDeadline = new Date(now + rootDeadlineHours * 3_600_000);

  const root = taskRepo.create({
    title: template.name,
    description: template.description,
    regionCode,
    assignedById: actorId,
    assignedToId: actorId,
    parentTaskId: null,
    rootTaskId: null,
    decomposition: TaskDecomposition.SUBTASKS,
    status: TaskStatus.BLOCKED_BY_SUBTASKS,
    priority: template.defaultPriority,
    deadline: rootDeadline,
    templateId: template.id,
  });
  await taskRepo.save(root);
  root.rootTaskId = root.id;
  await taskRepo.save(root);

  for (const { step, user } of resolutions) {
    const child = taskRepo.create({
      title: step.title,
      description: step.description,
      regionCode,
      assignedById: actorId,
      assignedToId: user.id,
      parentTaskId: root.id,
      rootTaskId: root.id,
      decomposition: TaskDecomposition.NONE,
      status: TaskStatus.PENDING,
      priority: step.priority,
      deadline: new Date(
        rootDeadline.getTime() + step.deadlineOffsetHours * 3_600_000,
      ),
      templateId: template.id,
    });
    await taskRepo.save(child);
  }

  return root;
}
