import { Router, Response } from "express";
import { z } from "zod";
import { AppDataSource } from "../config/database";
import { User } from "../entities/User";
import { UserRole, RegionCode, Department } from "../types/enums";
import {
  authenticateToken,
  authorizeRoles,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import { canAssign } from "../services/task-permissions.service";

const router = Router();

const SAFE_SELECT = [
  "user.id",
  "user.fullName",
  "user.email",
  "user.role",
  "user.regionCode",
  "user.department",
  "user.reportsTo",
  "user.isActive",
] as const;

// ─── GET / — directory for pickers ───────────────────────────────────────────

router.get(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { q, role, department, regionCode, reportsTo, all } =
        req.query as Record<string, string | undefined>;

      const qb = AppDataSource.getRepository(User)
        .createQueryBuilder("user")
        .select([...SAFE_SELECT])
        .where("user.isActive = true")
        .orderBy("user.fullName", "ASC");

      const isAdmin = req.user.role === UserRole.ADMIN;
      if (!(all === "true" && isAdmin) && !isAdmin) {
        qb.andWhere("user.regionCode = :region", {
          region: req.user.regionCode,
        });
      }
      if (q)
        qb.andWhere(
          "(user.fullName ILIKE :q OR user.email ILIKE :q)",
          { q: `%${q}%` },
        );
      if (role) qb.andWhere("user.role = :role", { role });
      if (department)
        qb.andWhere("user.department = :department", { department });
      if (regionCode)
        qb.andWhere("user.regionCode = :rc", { rc: regionCode });
      if (reportsTo)
        qb.andWhere("user.reportsTo = :rt", { rt: reportsTo });

      const users = await qb.take(200).getMany();

      // Annotate which users the caller may assign to
      const actor = await AppDataSource.getRepository(User).findOne({
        where: { id: req.user.sub },
      });
      const data = users.map((u) => ({
        ...u,
        assignable: actor ? canAssign(actor, u) : false,
      }));

      res.json({ data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({ error: message });
    }
  },
);

// ─── GET /tree — org hierarchy ───────────────────────────────────────────────

interface TreeNode {
  id: string;
  fullName: string;
  role: UserRole;
  department: Department | null;
  regionCode: RegionCode;
  reportsTo: string | null;
  children: TreeNode[];
}

router.get(
  "/tree",
  authenticateToken,
  authorizeRoles(UserRole.ADMIN, UserRole.REGIONAL_MANAGER),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(User);
      const qb = repo
        .createQueryBuilder("user")
        .select([...SAFE_SELECT])
        .where("user.isActive = true");
      if (req.user.role !== UserRole.ADMIN) {
        qb.andWhere("user.regionCode = :region", {
          region: req.user.regionCode,
        });
      }
      const users = await qb.getMany();

      const nodes = new Map<string, TreeNode>();
      for (const u of users) {
        nodes.set(u.id, {
          id: u.id,
          fullName: u.fullName,
          role: u.role,
          department: u.department,
          regionCode: u.regionCode,
          reportsTo: u.reportsTo,
          children: [],
        });
      }
      const roots: TreeNode[] = [];
      for (const node of nodes.values()) {
        if (node.reportsTo && nodes.has(node.reportsTo)) {
          nodes.get(node.reportsTo)!.children.push(node);
        } else {
          roots.push(node);
        }
      }
      res.json({ data: roots });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({ error: message });
    }
  },
);

// ─── PATCH /:id (admin) — edit role / dept / region / reportsTo ──────────────

const patchUserSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  department: z.nativeEnum(Department).nullable().optional(),
  regionCode: z.nativeEnum(RegionCode).optional(),
  reportsTo: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

router.patch(
  "/:id",
  authenticateToken,
  authorizeRoles(UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = patchUserSchema.parse(req.body);
      const repo = AppDataSource.getRepository(User);
      const user = await repo.findOne({ where: { id: req.params.id } });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      if (body.reportsTo !== undefined && body.reportsTo !== null) {
        if (body.reportsTo === user.id) {
          res
            .status(400)
            .json({ error: "A user cannot report to themselves" });
          return;
        }
        // Walk up the proposed chain to detect a cycle
        let cursor: string | null = body.reportsTo;
        const seen = new Set<string>([user.id]);
        while (cursor) {
          if (seen.has(cursor)) {
            res
              .status(400)
              .json({ error: "Reporting change would create a cycle" });
            return;
          }
          seen.add(cursor);
          const mgr: User | null = await repo.findOne({
            where: { id: cursor },
          });
          cursor = mgr?.reportsTo ?? null;
        }
      }

      if (body.role !== undefined) user.role = body.role;
      if (body.department !== undefined) user.department = body.department;
      if (body.regionCode !== undefined) user.regionCode = body.regionCode;
      if (body.reportsTo !== undefined) user.reportsTo = body.reportsTo;
      if (body.isActive !== undefined) user.isActive = body.isActive;

      await repo.save(user);
      const { passwordHash: _ph, ...safe } = user as User & {
        passwordHash?: string;
      };
      void _ph;
      res.json(safe);
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

export default router;
