import { Router, Response } from "express";
import { z } from "zod";
import { In } from "typeorm";
import { AppDataSource } from "../config/database";
import { Task } from "../entities/Task";
import { User } from "../entities/User";
import { UserGamification } from "../entities/UserGamification";
import {
  RegionCode,
  TaskStatus,
  TaskPriority,
  TaskDecomposition,
  UserRole,
} from "../types/enums";
import {
  authenticateToken,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import { canAssign, canOriginate } from "../services/task-permissions.service";
import { visibleTasks, isSenior } from "../services/task-visibility.service";
import {
  instantiateTemplate,
  previewResolution,
  UnresolvedStepError,
} from "../services/task-template.service";
import { recordCompletion } from "../services/gamification.service";

const router = Router();
const MAX_TASK_DEPTH = 6;

// ─── Validation ──────────────────────────────────────────────────────────────

const createTaskSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(5000).optional(),
  assignedToId: z.string().uuid(),
  regionCode: z.nativeEnum(RegionCode),
  deadline: z.string().datetime(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
});

const forwardSchema = z.object({
  assignedToId: z.string().uuid(),
  deadline: z.string().datetime().optional(),
  note: z.string().max(2000).optional(),
});

const splitSchema = z.object({
  subtasks: z
    .array(
      z.object({
        title: z.string().min(2).max(200),
        description: z.string().max(5000).optional(),
        assignedToId: z.string().uuid(),
        deadline: z.string().datetime(),
        priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
      }),
    )
    .min(2)
    .max(12),
});

const patchSchema = z.object({
  status: z.literal(TaskStatus.IN_PROGRESS).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  deadline: z.string().datetime().optional(),
  description: z.string().max(5000).optional(),
});

const fromTemplateSchema = z.object({
  regionCode: z.nativeEnum(RegionCode),
  deadlineOverrideHours: z.number().int().positive().max(8760).optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isAdmin(req: AuthenticatedRequest): boolean {
  return req.user.role === UserRole.ADMIN;
}

async function loadActor(req: AuthenticatedRequest): Promise<User | null> {
  return AppDataSource.getRepository(User).findOne({
    where: { id: req.user.sub },
  });
}

/** All tasks sharing the same root as `task` (the whole chain). */
async function loadChain(task: Task): Promise<Task[]> {
  const rootId = task.rootTaskId ?? task.id;
  return AppDataSource.getRepository(Task).find({
    where: [{ id: rootId }, { rootTaskId: rootId }],
    order: { createdAt: "ASC" },
  });
}

async function chainDepth(task: Task): Promise<number> {
  let depth = 0;
  let cursor: Task | null = task;
  const repo = AppDataSource.getRepository(Task);
  while (cursor?.parentTaskId) {
    depth += 1;
    cursor = await repo.findOne({ where: { id: cursor.parentTaskId } });
    if (depth > MAX_TASK_DEPTH + 1) break;
  }
  return depth;
}

// ─── GET / — list ────────────────────────────────────────────────────────────

router.get(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        assignedToId,
        assignedById,
        status,
        priority,
        templateId,
        mine,
        page = "1",
        limit = "50",
      } = req.query as Record<string, string | undefined>;

      const repo = AppDataSource.getRepository(Task);
      const qb = repo
        .createQueryBuilder("task")
        .leftJoin("task.assignedTo", "assignedTo")
        .leftJoin("task.assignedBy", "assignedBy")
        .addSelect([
          "assignedTo.id",
          "assignedTo.fullName",
          "assignedTo.role",
          "assignedTo.department",
        ])
        .addSelect(["assignedBy.id", "assignedBy.fullName", "assignedBy.role"]);

      if (!isAdmin(req)) {
        qb.andWhere("task.regionCode = :region", {
          region: req.user.regionCode,
        });
        if (!isSenior(req.user.role)) {
          qb.andWhere(
            "(task.assignedToId = :uid OR task.assignedById = :uid)",
            { uid: req.user.sub },
          );
        }
      }

      if (mine === "true")
        qb.andWhere("task.assignedToId = :me", { me: req.user.sub });
      if (assignedToId)
        qb.andWhere("task.assignedToId = :assignedToId", { assignedToId });
      if (assignedById)
        qb.andWhere("task.assignedById = :assignedById", { assignedById });
      if (status) qb.andWhere("task.status = :status", { status });
      if (priority) qb.andWhere("task.priority = :priority", { priority });
      if (templateId)
        qb.andWhere("task.templateId = :templateId", { templateId });

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

      qb.orderBy("task.deadline", "ASC").addOrderBy(
        "task.createdAt",
        "DESC",
      );

      const [tasks, total] = await qb
        .skip((pageNum - 1) * limitNum)
        .take(limitNum)
        .getManyAndCount();

      res.json({
        data: tasks,
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({ error: message });
    }
  },
);

// ─── GET /leaderboard ────────────────────────────────────────────────────────

router.get(
  "/leaderboard",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { regionCode, department, limit = "20" } = req.query as Record<
        string,
        string | undefined
      >;
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

      const qb = AppDataSource.getRepository(UserGamification)
        .createQueryBuilder("g")
        .innerJoin(User, "u", "u.id = g.userId")
        .select([
          "g.userId AS \"userId\"",
          "u.fullName AS \"fullName\"",
          "u.role AS role",
          "u.department AS department",
          "u.regionCode AS \"regionCode\"",
          "g.totalPoints AS \"totalPoints\"",
          "g.currentStreak AS \"currentStreak\"",
          "g.bestStreak AS \"bestStreak\"",
          "g.badges AS badges",
        ])
        .orderBy("g.totalPoints", "DESC")
        .addOrderBy("g.currentStreak", "DESC")
        .limit(limitNum);

      // Non-admins are locked to their own region
      if (!isAdmin(req)) {
        qb.andWhere("u.regionCode = :region", {
          region: req.user.regionCode,
        });
      } else if (regionCode) {
        qb.andWhere("u.regionCode = :region", { region: regionCode });
      }
      if (department) qb.andWhere("u.department = :dept", { dept: department });

      const rows = await qb.getRawMany();
      res.json({ data: rows });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({ error: message });
    }
  },
);

// ─── GET /me/stats ───────────────────────────────────────────────────────────

router.get(
  "/me/stats",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const gRepo = AppDataSource.getRepository(UserGamification);
      const taskRepo = AppDataSource.getRepository(Task);

      const gamification =
        (await gRepo.findOne({ where: { userId: req.user.sub } })) ?? {
          userId: req.user.sub,
          currentStreak: 0,
          bestStreak: 0,
          totalPoints: 0,
          tasksCompletedOnTime: 0,
          tasksCompletedLate: 0,
          badges: [],
          lastCompletionAt: null,
        };

      const openStatuses = [
        TaskStatus.PENDING,
        TaskStatus.IN_PROGRESS,
        TaskStatus.FORWARDED,
        TaskStatus.BLOCKED_BY_SUBTASKS,
      ];
      const open = await taskRepo.find({
        where: { assignedToId: req.user.sub, status: In(openStatuses) },
      });
      const now = Date.now();
      const overdue = open.filter(
        (t) => new Date(t.deadline).getTime() < now,
      ).length;

      res.json({ gamification, pending: open.length, overdue });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({ error: message });
    }
  },
);

// ─── GET /:id and /:id/chain ─────────────────────────────────────────────────

async function fetchVisibleTask(
  req: AuthenticatedRequest,
  id: string,
): Promise<{ task: Task; chain: Task[] } | null> {
  const repo = AppDataSource.getRepository(Task);
  const task = await repo.findOne({ where: { id } });
  if (!task) return null;
  if (!isAdmin(req) && task.regionCode !== req.user.regionCode) return null;

  const chain = await loadChain(task);
  const visible = visibleTasks(
    { sub: req.user.sub, role: req.user.role },
    chain,
  );
  if (!visible.some((t) => t.id === id)) return null;
  return { task, chain: visible };
}

router.get(
  "/:id/chain",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await fetchVisibleTask(req, req.params.id);
      if (!result) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      const ids = result.chain.map((t) => t.id);
      const hydrated = await AppDataSource.getRepository(Task)
        .createQueryBuilder("task")
        .leftJoin("task.assignedTo", "assignedTo")
        .leftJoin("task.assignedBy", "assignedBy")
        .addSelect([
          "assignedTo.id",
          "assignedTo.fullName",
          "assignedTo.role",
          "assignedTo.department",
        ])
        .addSelect(["assignedBy.id", "assignedBy.fullName", "assignedBy.role"])
        .where("task.id IN (:...ids)", { ids: ids.length ? ids : [""] })
        .orderBy("task.createdAt", "ASC")
        .getMany();
      res.json({ data: hydrated });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({ error: message });
    }
  },
);

router.get(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await fetchVisibleTask(req, req.params.id);
      if (!result) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      const full = await AppDataSource.getRepository(Task)
        .createQueryBuilder("task")
        .leftJoinAndSelect("task.assignedTo", "assignedTo")
        .leftJoinAndSelect("task.assignedBy", "assignedBy")
        .where("task.id = :id", { id: req.params.id })
        .getOne();
      const children = result.chain.filter(
        (t) => t.parentTaskId === req.params.id,
      );
      res.json({ ...full, children });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({ error: message });
    }
  },
);

// ─── POST / — create top-level ───────────────────────────────────────────────

router.post(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const actor = await loadActor(req);
      if (!actor) {
        res.status(401).json({ error: "Unknown user" });
        return;
      }
      if (!canOriginate(actor)) {
        res
          .status(403)
          .json({ error: "Your role may not create top-level tasks" });
        return;
      }

      const body = createTaskSchema.parse(req.body);

      if (!isAdmin(req) && body.regionCode !== req.user.regionCode) {
        res
          .status(403)
          .json({ error: "You may only create tasks in your own region" });
        return;
      }

      const target = await AppDataSource.getRepository(User).findOne({
        where: { id: body.assignedToId },
      });
      if (!target) {
        res.status(404).json({ error: "Assignee not found" });
        return;
      }
      if (!canAssign(actor, target)) {
        res
          .status(403)
          .json({ error: "You may not assign tasks to this user" });
        return;
      }

      const repo = AppDataSource.getRepository(Task);
      const task = repo.create({
        title: body.title,
        description: body.description ?? null,
        regionCode: body.regionCode,
        assignedById: actor.id,
        assignedToId: body.assignedToId,
        parentTaskId: null,
        rootTaskId: null,
        decomposition: TaskDecomposition.NONE,
        status: TaskStatus.PENDING,
        priority: body.priority,
        deadline: new Date(body.deadline),
      });
      await repo.save(task);
      task.rootTaskId = task.id;
      await repo.save(task);

      res.status(201).json(task);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: "Validation failed", details: error.errors });
        return;
      }
      const message = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({ error: message });
    }
  },
);

// ─── POST /from-template/:templateId ─────────────────────────────────────────

router.post(
  "/from-template/:templateId",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const actor = await loadActor(req);
      if (!actor || !canOriginate(actor)) {
        res
          .status(403)
          .json({ error: "Your role may not instantiate templates" });
        return;
      }
      const body = fromTemplateSchema.parse(req.body);
      if (!isAdmin(req) && body.regionCode !== req.user.regionCode) {
        res
          .status(403)
          .json({ error: "You may only instantiate in your own region" });
        return;
      }

      const root = await AppDataSource.transaction(async (manager) =>
        instantiateTemplate(manager, {
          templateId: req.params.templateId,
          regionCode: body.regionCode,
          actorId: actor.id,
          deadlineOverrideHours: body.deadlineOverrideHours,
        }),
      );
      res.status(201).json(root);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: "Validation failed", details: error.errors });
        return;
      }
      if (error instanceof UnresolvedStepError) {
        res
          .status(422)
          .json({ error: error.message, unresolved: error.unresolved });
        return;
      }
      const message = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({ error: message });
    }
  },
);

// ─── POST /:id/forward ───────────────────────────────────────────────────────

router.post(
  "/:id/forward",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const actor = await loadActor(req);
      if (!actor) {
        res.status(401).json({ error: "Unknown user" });
        return;
      }
      const body = forwardSchema.parse(req.body);
      const repo = AppDataSource.getRepository(Task);
      const task = await repo.findOne({ where: { id: req.params.id } });

      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      if (task.assignedToId !== actor.id) {
        res
          .status(403)
          .json({ error: "Only the current owner can forward this task" });
        return;
      }
      if (task.decomposition !== TaskDecomposition.NONE) {
        res
          .status(409)
          .json({ error: "Task has already been forwarded or split" });
        return;
      }
      if ((await chainDepth(task)) >= MAX_TASK_DEPTH) {
        res.status(409).json({ error: "Maximum delegation depth reached" });
        return;
      }

      const target = await AppDataSource.getRepository(User).findOne({
        where: { id: body.assignedToId },
      });
      if (!target) {
        res.status(404).json({ error: "Target user not found" });
        return;
      }
      if (!canAssign(actor, target)) {
        res
          .status(403)
          .json({ error: "You may not forward to this user" });
        return;
      }

      const newDeadline = body.deadline
        ? new Date(body.deadline)
        : task.deadline;
      if (newDeadline.getTime() > task.deadline.getTime()) {
        res
          .status(400)
          .json({ error: "Forwarded deadline cannot exceed the parent's" });
        return;
      }

      const child = repo.create({
        title: task.title,
        description: body.note
          ? `${task.description ?? ""}\n\n[Forwarded] ${body.note}`.trim()
          : task.description,
        regionCode: task.regionCode,
        assignedById: actor.id,
        assignedToId: target.id,
        parentTaskId: task.id,
        rootTaskId: task.rootTaskId ?? task.id,
        decomposition: TaskDecomposition.NONE,
        status: TaskStatus.PENDING,
        priority: task.priority,
        deadline: newDeadline,
        templateId: task.templateId,
      });
      await repo.save(child);

      task.decomposition = TaskDecomposition.FORWARDED;
      task.status = TaskStatus.FORWARDED;
      await repo.save(task);

      res.status(201).json(child);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: "Validation failed", details: error.errors });
        return;
      }
      const message = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({ error: message });
    }
  },
);

// ─── POST /:id/split ─────────────────────────────────────────────────────────

router.post(
  "/:id/split",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const actor = await loadActor(req);
      if (!actor) {
        res.status(401).json({ error: "Unknown user" });
        return;
      }
      const body = splitSchema.parse(req.body);
      const repo = AppDataSource.getRepository(Task);
      const task = await repo.findOne({ where: { id: req.params.id } });

      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      if (task.assignedToId !== actor.id) {
        res
          .status(403)
          .json({ error: "Only the current owner can split this task" });
        return;
      }
      if (task.decomposition !== TaskDecomposition.NONE) {
        res
          .status(409)
          .json({ error: "Task has already been forwarded or split" });
        return;
      }
      if ((await chainDepth(task)) >= MAX_TASK_DEPTH) {
        res.status(409).json({ error: "Maximum delegation depth reached" });
        return;
      }

      const userRepo = AppDataSource.getRepository(User);
      for (const sub of body.subtasks) {
        const target = await userRepo.findOne({
          where: { id: sub.assignedToId },
        });
        if (!target) {
          res
            .status(404)
            .json({ error: `Assignee ${sub.assignedToId} not found` });
          return;
        }
        if (!canAssign(actor, target)) {
          res.status(403).json({
            error: `You may not assign a subtask to ${target.fullName}`,
          });
          return;
        }
        if (new Date(sub.deadline).getTime() > task.deadline.getTime()) {
          res.status(400).json({
            error: `Subtask "${sub.title}" deadline exceeds the parent's`,
          });
          return;
        }
      }

      const created = await AppDataSource.transaction(async (manager) => {
        const txRepo = manager.getRepository(Task);
        const children: Task[] = [];
        for (const sub of body.subtasks) {
          const child = txRepo.create({
            title: sub.title,
            description: sub.description ?? null,
            regionCode: task.regionCode,
            assignedById: actor.id,
            assignedToId: sub.assignedToId,
            parentTaskId: task.id,
            rootTaskId: task.rootTaskId ?? task.id,
            decomposition: TaskDecomposition.NONE,
            status: TaskStatus.PENDING,
            priority: sub.priority,
            deadline: new Date(sub.deadline),
            templateId: task.templateId,
          });
          children.push(await txRepo.save(child));
        }
        task.decomposition = TaskDecomposition.SUBTASKS;
        task.status = TaskStatus.BLOCKED_BY_SUBTASKS;
        await txRepo.save(task);
        return children;
      });

      res.status(201).json({ data: created });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: "Validation failed", details: error.errors });
        return;
      }
      const message = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({ error: message });
    }
  },
);

// ─── PATCH /:id ──────────────────────────────────────────────────────────────

router.patch(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = patchSchema.parse(req.body);
      const repo = AppDataSource.getRepository(Task);
      const task = await repo.findOne({ where: { id: req.params.id } });
      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      const admin = isAdmin(req);
      if (!admin && task.assignedToId !== req.user.sub) {
        res.status(403).json({ error: "Not your task" });
        return;
      }
      if (
        task.status === TaskStatus.COMPLETED ||
        task.status === TaskStatus.CANCELLED
      ) {
        res.status(409).json({ error: "Task is closed" });
        return;
      }

      if (body.status === TaskStatus.IN_PROGRESS) {
        if (task.decomposition !== TaskDecomposition.NONE) {
          res
            .status(409)
            .json({ error: "Delegated/split tasks cannot be worked directly" });
          return;
        }
        task.status = TaskStatus.IN_PROGRESS;
      }
      if (body.priority) task.priority = body.priority;
      if (body.description !== undefined) task.description = body.description;
      if (body.deadline !== undefined) {
        if (!admin) {
          res
            .status(403)
            .json({ error: "Only an admin may change the deadline" });
          return;
        }
        task.deadline = new Date(body.deadline);
      }

      await repo.save(task);
      res.json(task);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: "Validation failed", details: error.errors });
        return;
      }
      const message = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({ error: message });
    }
  },
);

// ─── POST /:id/complete ──────────────────────────────────────────────────────

/**
 * Mark a leaf complete, then bubble up:
 *  - FORWARDED parent → cascade-complete it (and continue up)
 *  - SUBTASKS parent  → complete only once every child is done/cancelled
 * Gamification is awarded only for the explicitly-completed leaf.
 */
router.post(
  "/:id/complete",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await AppDataSource.transaction(async (manager) => {
        const repo = manager.getRepository(Task);
        const task = await repo.findOne({ where: { id: req.params.id } });
        if (!task) return { code: 404, body: { error: "Task not found" } };
        if (
          task.assignedToId !== req.user.sub &&
          req.user.role !== UserRole.ADMIN
        ) {
          return { code: 403, body: { error: "Not your task" } };
        }
        if (task.decomposition !== TaskDecomposition.NONE) {
          return {
            code: 400,
            body: { error: "Task has active children; complete those first" },
          };
        }
        if (task.status === TaskStatus.COMPLETED) {
          return { code: 409, body: { error: "Already completed" } };
        }

        const now = new Date();
        task.status = TaskStatus.COMPLETED;
        task.completedAt = now;
        task.completedOnTime = now.getTime() <= task.deadline.getTime();
        await repo.save(task);

        await recordCompletion(manager, task.assignedToId, task, now);

        // Bubble up
        let parentId = task.parentTaskId;
        while (parentId) {
          const parent = await repo.findOne({ where: { id: parentId } });
          if (!parent) break;

          if (parent.decomposition === TaskDecomposition.FORWARDED) {
            parent.status = TaskStatus.COMPLETED;
            parent.completedAt = now;
            parent.completedOnTime =
              now.getTime() <= parent.deadline.getTime();
            await repo.save(parent);
            parentId = parent.parentTaskId;
            continue;
          }

          if (parent.decomposition === TaskDecomposition.SUBTASKS) {
            const siblings = await repo.find({
              where: { parentTaskId: parent.id },
            });
            const allDone = siblings.every(
              (s) =>
                s.status === TaskStatus.COMPLETED ||
                s.status === TaskStatus.CANCELLED,
            );
            if (!allDone) break;
            parent.status = TaskStatus.COMPLETED;
            parent.completedAt = now;
            parent.completedOnTime =
              now.getTime() <= parent.deadline.getTime();
            await repo.save(parent);
            parentId = parent.parentTaskId;
            continue;
          }
          break;
        }

        return { code: 200, body: { ...task } };
      });

      res.status(result.code).json(result.body);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({ error: message });
    }
  },
);

// ─── POST /:id/cancel ────────────────────────────────────────────────────────

router.post(
  "/:id/cancel",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Task);
      const task = await repo.findOne({ where: { id: req.params.id } });
      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      const root = await repo.findOne({
        where: { id: task.rootTaskId ?? task.id },
      });
      const isRootOwner = root?.assignedById === req.user.sub;
      if (req.user.role !== UserRole.ADMIN && !isRootOwner) {
        res
          .status(403)
          .json({ error: "Only an admin or the originator may cancel" });
        return;
      }

      const chain = await loadChain(task);
      const descendants = new Set<string>([task.id]);
      let added = true;
      while (added) {
        added = false;
        for (const t of chain) {
          if (
            t.parentTaskId &&
            descendants.has(t.parentTaskId) &&
            !descendants.has(t.id)
          ) {
            descendants.add(t.id);
            added = true;
          }
        }
      }

      for (const t of chain) {
        if (
          descendants.has(t.id) &&
          t.status !== TaskStatus.COMPLETED &&
          t.status !== TaskStatus.CANCELLED
        ) {
          t.status = TaskStatus.CANCELLED;
          await repo.save(t);
        }
      }

      res.json({ cancelled: descendants.size });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({ error: message });
    }
  },
);

// ─── GET /templates/:id/preview (resolution) ────────────────────────────────
// Mounted here so the frontend can preview before instantiation.

router.post(
  "/template-preview/:templateId",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const region = (req.body?.regionCode ?? req.user.regionCode) as RegionCode;
      const resolutions = await previewResolution(
        AppDataSource.manager,
        req.params.templateId,
        region,
      );
      res.json({ data: resolutions });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({ error: message });
    }
  },
);

export default router;
