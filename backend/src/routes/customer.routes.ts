import { Router, Response } from "express";
import { AppDataSource } from "../config/database";
import { Customer } from "../entities/Customer";
import { SyncQueueService } from "../services/sync-queue.service";
import {
  RegionCode,
  CustomerType,
  CustomerTier,
  LeadStatus,
  SyncEntityType,
  UserRole,
} from "../types/enums";
import {
  authenticateToken,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import { z } from "zod";
import { ILike, FindOptionsWhere } from "typeorm";

const router = Router();

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const geoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  altitude: z.number().optional(),
  timestamp: z.string(),
});

const customerCreateSchema = z.object({
  businessName: z.string().min(1).max(255),
  contactPerson: z.string().max(255).nullable().optional(),
  phone: z.string().min(7).max(20),
  altPhone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
  gstin: z.string().max(20).nullable().optional(),
  pan: z.string().max(20).nullable().optional(),
  customerType: z.nativeEnum(CustomerType),
  tier: z.nativeEnum(CustomerTier).default(CustomerTier.BRONZE),
  leadStatus: z.nativeEnum(LeadStatus).default(LeadStatus.NEW),
  regionCode: z.nativeEnum(RegionCode),
  district: z.string().min(1).max(100),
  city: z.string().max(100).nullable().optional(),
  address: z.string().min(1),
  pincode: z.string().max(10).nullable().optional(),
  location: geoPointSchema.nullable().optional(),
  preferredMaterials: z.array(z.string()).default([]),
  annualPotentialINR: z.number().min(0).default(0),
  lifetimeValueINR: z.number().min(0).default(0),
  notes: z.string().nullable().optional(),
  erpMetadata: z.record(z.unknown()).default({}),
});

const customerUpdateSchema = customerCreateSchema.partial();

// ─── GET / — List customers ───────────────────────────────────────────────────

router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      regionCode,
      customerType,
      tier,
      leadStatus,
      search,
      page = "1",
      limit = "20",
    } = req.query as Record<string, string | undefined>;

    const user = req.user;
    const isAdmin = user.role === UserRole.ADMIN;

    const repo = AppDataSource.getRepository(Customer);
    const pageNum = Math.max(1, parseInt(page ?? "1", 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? "20", 10)));
    const skip = (pageNum - 1) * limitNum;

    const qb = repo.createQueryBuilder("c");

    // Region scoping — non-admins see only their region
    if (!isAdmin) {
      qb.andWhere("c.regionCode = :userRegion", { userRegion: user.regionCode });
    } else if (regionCode) {
      qb.andWhere("c.regionCode = :regionCode", { regionCode });
    }

    if (customerType) {
      qb.andWhere("c.customerType = :customerType", { customerType });
    }

    if (tier) {
      qb.andWhere("c.tier = :tier", { tier });
    }

    if (leadStatus) {
      qb.andWhere("c.leadStatus = :leadStatus", { leadStatus });
    }

    if (search) {
      qb.andWhere(
        "(c.businessName ILIKE :search OR c.phone ILIKE :search OR c.contactPerson ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    qb.orderBy("c.createdAt", "DESC").skip(skip).take(limitNum);

    const [customers, total] = await qb.getManyAndCount();

    res.json({
      data: customers,
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
});

// ─── GET /:id — Single customer ───────────────────────────────────────────────

router.get("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const isAdmin = user.role === UserRole.ADMIN;

    const repo = AppDataSource.getRepository(Customer);
    const customer = await repo.findOne({
      where: { id },
      relations: ["visits", "reservedInventory"],
    });

    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    // Region scoping
    if (!isAdmin && customer.regionCode !== user.regionCode) {
      res.status(403).json({ error: "Forbidden: customer is outside your region" });
      return;
    }

    res.json({ data: customer });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    res.status(500).json({ error: message });
  }
});

// ─── POST / — Create customer ─────────────────────────────────────────────────

router.post("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = customerCreateSchema.parse(req.body);
    const user = req.user;
    const isAdmin = user.role === UserRole.ADMIN;

    // Non-admins can only create in their own region
    if (!isAdmin && parsed.regionCode !== user.regionCode) {
      res.status(403).json({ error: "Forbidden: cannot create customer in another region" });
      return;
    }

    const repo = AppDataSource.getRepository(Customer);
    const customer = repo.create(parsed as Partial<Customer>);
    await repo.save(customer);

    // Enqueue for ERP sync
    try {
      const syncService = new SyncQueueService();
      const payload = await syncService.buildCustomerPayload(customer.id);
      await syncService.enqueue({
        entityType: SyncEntityType.CUSTOMER,
        entityId: customer.id,
        regionCode: customer.regionCode,
        payload,
      });
    } catch (syncError: unknown) {
      // Log but do not fail the request — sync can retry
      console.error("[ERP Sync] Failed to enqueue customer:", syncError);
    }

    res.status(201).json({ data: customer });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.errors });
      return;
    }
    const message = error instanceof Error ? error.message : "Internal error";
    res.status(500).json({ error: message });
  }
});

// ─── PUT /:id — Update customer ───────────────────────────────────────────────

router.put("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = customerUpdateSchema.parse(req.body);
    const user = req.user;
    const isAdmin = user.role === UserRole.ADMIN;

    const repo = AppDataSource.getRepository(Customer);
    const customer = await repo.findOneBy({ id });

    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    if (!isAdmin && customer.regionCode !== user.regionCode) {
      res.status(403).json({ error: "Forbidden: customer is outside your region" });
      return;
    }

    // Prevent region change for non-admins
    if (!isAdmin && parsed.regionCode && parsed.regionCode !== user.regionCode) {
      res.status(403).json({ error: "Forbidden: cannot move customer to another region" });
      return;
    }

    Object.assign(customer, parsed);
    await repo.save(customer);

    // Enqueue for ERP sync
    try {
      const syncService = new SyncQueueService();
      const payload = await syncService.buildCustomerPayload(customer.id);
      await syncService.enqueue({
        entityType: SyncEntityType.CUSTOMER,
        entityId: customer.id,
        regionCode: customer.regionCode,
        payload,
      });
    } catch (syncError: unknown) {
      console.error("[ERP Sync] Failed to enqueue customer update:", syncError);
    }

    res.json({ data: customer });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.errors });
      return;
    }
    const message = error instanceof Error ? error.message : "Internal error";
    res.status(500).json({ error: message });
  }
});

// ─── DELETE /:id — Hard-delete customer ──────────────────────────────────────

router.delete("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const isAdmin = user.role === UserRole.ADMIN;

    // Only admins and managers may delete
    if (
      !isAdmin &&
      user.role !== UserRole.REGIONAL_MANAGER &&
      user.role !== UserRole.AREA_MANAGER
    ) {
      res.status(403).json({ error: "Forbidden: insufficient role to delete customers" });
      return;
    }

    const repo = AppDataSource.getRepository(Customer);
    const customer = await repo.findOneBy({ id });

    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    if (!isAdmin && customer.regionCode !== user.regionCode) {
      res.status(403).json({ error: "Forbidden: customer is outside your region" });
      return;
    }

    await repo.remove(customer);
    res.status(204).send();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    res.status(500).json({ error: message });
  }
});

export default router;
