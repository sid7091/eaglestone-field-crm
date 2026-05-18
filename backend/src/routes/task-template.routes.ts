import { Router, Response } from "express";
import { z } from "zod";
import { AppDataSource } from "../config/database";
import { TaskTemplate } from "../entities/TaskTemplate";
import { TaskTemplateStep } from "../entities/TaskTemplateStep";
import {
  UserRole,
  Department,
  TaskPriority,
  RegionCode,
} from "../types/enums";
import {
  authenticateToken,
  authorizeRoles,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import { previewResolution } from "../services/task-template.service";

const router = Router();

const stepSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(5000).optional(),
  assigneeRole: z.nativeEnum(UserRole).nullable().optional(),
  assigneeDepartment: z.nativeEnum(Department).nullable().optional(),
  assigneeUserId: z.string().uuid().nullable().optional(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  deadlineOffsetHours: z.number().int().min(-8760).max(8760).default(0),
  orderIndex: z.number().int().min(0).default(0),
});

const templateSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(5000).optional(),
  defaultPriority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  defaultDeadlineHours: z.number().int().positive().max(8760).default(72),
  steps: z.array(stepSchema).min(1).max(20),
});

// ─── GET / ───────────────────────────────────────────────────────────────────

router.get(
  "/",
  authenticateToken,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const templates = await AppDataSource.getRepository(TaskTemplate).find({
        where: { isActive: true },
        relations: { steps: true },
        order: { name: "ASC" },
      });
      res.json({ data: templates });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({ error: message });
    }
  },
);

// ─── GET /:id ────────────────────────────────────────────────────────────────

router.get(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const template = await AppDataSource.getRepository(TaskTemplate).findOne({
        where: { id: req.params.id },
        relations: { steps: true },
      });
      if (!template) {
        res.status(404).json({ error: "Template not found" });
        return;
      }
      template.steps.sort((a, b) => a.orderIndex - b.orderIndex);
      res.json(template);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({ error: message });
    }
  },
);

// ─── POST / (admin) ──────────────────────────────────────────────────────────

router.post(
  "/",
  authenticateToken,
  authorizeRoles(UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = templateSchema.parse(req.body);
      const created = await AppDataSource.transaction(async (manager) => {
        const template = manager.getRepository(TaskTemplate).create({
          name: body.name,
          description: body.description ?? null,
          defaultPriority: body.defaultPriority,
          defaultDeadlineHours: body.defaultDeadlineHours,
          createdById: req.user.sub,
          isActive: true,
        });
        await manager.getRepository(TaskTemplate).save(template);

        const stepRepo = manager.getRepository(TaskTemplateStep);
        for (const s of body.steps) {
          await stepRepo.save(
            stepRepo.create({
              templateId: template.id,
              title: s.title,
              description: s.description ?? null,
              assigneeRole: s.assigneeRole ?? null,
              assigneeDepartment: s.assigneeDepartment ?? null,
              assigneeUserId: s.assigneeUserId ?? null,
              priority: s.priority,
              deadlineOffsetHours: s.deadlineOffsetHours,
              orderIndex: s.orderIndex,
            }),
          );
        }
        return template;
      });
      res.status(201).json(created);
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

// ─── PUT /:id (admin) — replace steps ────────────────────────────────────────

router.put(
  "/:id",
  authenticateToken,
  authorizeRoles(UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = templateSchema.parse(req.body);
      const updated = await AppDataSource.transaction(async (manager) => {
        const repo = manager.getRepository(TaskTemplate);
        const template = await repo.findOne({
          where: { id: req.params.id },
        });
        if (!template) return null;

        template.name = body.name;
        template.description = body.description ?? null;
        template.defaultPriority = body.defaultPriority;
        template.defaultDeadlineHours = body.defaultDeadlineHours;
        await repo.save(template);

        const stepRepo = manager.getRepository(TaskTemplateStep);
        await stepRepo.delete({ templateId: template.id });
        for (const s of body.steps) {
          await stepRepo.save(
            stepRepo.create({
              templateId: template.id,
              title: s.title,
              description: s.description ?? null,
              assigneeRole: s.assigneeRole ?? null,
              assigneeDepartment: s.assigneeDepartment ?? null,
              assigneeUserId: s.assigneeUserId ?? null,
              priority: s.priority,
              deadlineOffsetHours: s.deadlineOffsetHours,
              orderIndex: s.orderIndex,
            }),
          );
        }
        return template;
      });
      if (!updated) {
        res.status(404).json({ error: "Template not found" });
        return;
      }
      res.json(updated);
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

// ─── DELETE /:id (admin) — soft delete ───────────────────────────────────────

router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles(UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(TaskTemplate);
      const template = await repo.findOne({ where: { id: req.params.id } });
      if (!template) {
        res.status(404).json({ error: "Template not found" });
        return;
      }
      template.isActive = false;
      await repo.save(template);
      res.json({ ok: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({ error: message });
    }
  },
);

// ─── POST /:id/preview ───────────────────────────────────────────────────────

router.post(
  "/:id/preview",
  authenticateToken,
  authorizeRoles(
    UserRole.ADMIN,
    UserRole.REGIONAL_MANAGER,
    UserRole.AREA_MANAGER,
  ),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const region = (req.body?.regionCode ??
        req.user.regionCode) as RegionCode;
      const resolutions = await previewResolution(
        AppDataSource.manager,
        req.params.id,
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
