import { Router, Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Inventory } from "../entities/Inventory";
import { Customer } from "../entities/Customer";
import { SyncQueueService } from "../services/sync-queue.service";
import {
  authenticateToken,
  authorizeRoles,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import { InventoryStatus, SyncEntityType, UserRole } from "../types/enums";
import { z } from "zod";
import type { FindManyOptions } from "typeorm";

const router = Router();

// ─── Validation schemas ─────────────────────────────────────────────────────

const createInventorySchema = z.object({
  regionCode: z.string().min(2).max(4),
  sku: z.string().min(1).max(50),
  materialType: z.string().min(1).max(100),
  variety: z.string().min(1).max(100),
  color: z.string().min(1).max(50),
  finishType: z.string().min(1).max(50),
  grade: z.string().min(1).max(10),
  lengthCm: z.number().positive(),
  widthCm: z.number().positive(),
  thicknessMm: z.number().positive(),
  quantityAvailable: z.number().int().min(0).default(1),
  quantityReserved: z.number().int().min(0).default(0),
  pricePerSqftINR: z.number().positive(),
  landedCostPerSqftINR: z.number().positive().optional().nullable(),
  warehouseCode: z.string().min(1).max(50),
  rackLocation: z.string().max(100).optional().nullable(),
  bundleNumber: z.string().max(50).optional().nullable(),
  blockReference: z.string().max(100).optional().nullable(),
  status: z.nativeEnum(InventoryStatus).optional(),
  notes: z.string().optional().nullable(),
});

const updateInventorySchema = createInventorySchema.partial();

const reserveSchema = z.object({
  customerId: z.string().uuid(),
});

// ─── GET / — list with filters ───────────────────────────────────────────────

router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      materialType,
      variety,
      color,
      finishType,
      grade,
      status,
      warehouseCode,
      regionCode,
      search,
      minPrice,
      maxPrice,
      page = "1",
      limit = "20",
    } = req.query as Record<string, string | undefined>;

    const invRepo = AppDataSource.getRepository(Inventory);
    const qb = invRepo
      .createQueryBuilder("inv")
      .leftJoinAndSelect("inv.reservedForCustomer", "customer");

    // Region scoping: non-admins only see their own region
    const user = (req as AuthenticatedRequest).user;
    if (user.role !== UserRole.ADMIN) {
      qb.andWhere("inv.regionCode = :userRegion", {
        userRegion: user.regionCode,
      });
    } else if (regionCode) {
      qb.andWhere("inv.regionCode = :regionCode", { regionCode });
    }

    if (materialType) {
      qb.andWhere("LOWER(inv.materialType) LIKE LOWER(:materialType)", {
        materialType: `%${materialType}%`,
      });
    }
    if (variety) {
      qb.andWhere("LOWER(inv.variety) LIKE LOWER(:variety)", {
        variety: `%${variety}%`,
      });
    }
    if (color) {
      qb.andWhere("LOWER(inv.color) LIKE LOWER(:color)", {
        color: `%${color}%`,
      });
    }
    if (finishType) {
      qb.andWhere("LOWER(inv.finishType) LIKE LOWER(:finishType)", {
        finishType: `%${finishType}%`,
      });
    }
    if (grade) {
      qb.andWhere("inv.grade = :grade", { grade });
    }
    if (status) {
      qb.andWhere("inv.status = :status", { status });
    }
    if (warehouseCode) {
      qb.andWhere("LOWER(inv.warehouseCode) LIKE LOWER(:warehouseCode)", {
        warehouseCode: `%${warehouseCode}%`,
      });
    }
    if (search) {
      // Search by SKU or variety
      qb.andWhere(
        "(LOWER(inv.sku) LIKE LOWER(:search) OR LOWER(inv.variety) LIKE LOWER(:search))",
        { search: `%${search}%` }
      );
    }
    if (minPrice) {
      qb.andWhere("inv.pricePerSqftINR >= :minPrice", {
        minPrice: parseFloat(minPrice),
      });
    }
    if (maxPrice) {
      qb.andWhere("inv.pricePerSqftINR <= :maxPrice", {
        maxPrice: parseFloat(maxPrice),
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    qb.orderBy("inv.createdAt", "DESC").skip(offset).take(limitNum);

    const [items, total] = await qb.getManyAndCount();

    res.json({
      data: items,
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

// ─── GET /:id — single item ──────────────────────────────────────────────────

router.get("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invRepo = AppDataSource.getRepository(Inventory);

    const item = await invRepo.findOne({
      where: { id },
      relations: ["reservedForCustomer"],
    } as FindManyOptions<Inventory>);

    if (!item) {
      res.status(404).json({ error: "Inventory item not found" });
      return;
    }

    // Region check for non-admins
    const user = (req as AuthenticatedRequest).user;
    if (
      user.role !== UserRole.ADMIN &&
      item.regionCode !== user.regionCode
    ) {
      res.status(403).json({ error: "Access denied to this region's inventory" });
      return;
    }

    // Fetch similar items (same variety, different warehouse, IN_STOCK only)
    const similar = await invRepo.find({
      where: {
        variety: item.variety,
        status: InventoryStatus.IN_STOCK,
      },
      take: 6,
      order: { createdAt: "DESC" },
    });

    const similarFiltered = similar
      .filter((s) => s.id !== item.id)
      .slice(0, 5);

    res.json({ data: item, similar: similarFiltered });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    res.status(500).json({ error: message });
  }
});

// ─── POST / — create inventory item (admin/manager only) ────────────────────

router.post(
  "/",
  authenticateToken,
  authorizeRoles(UserRole.ADMIN, UserRole.REGIONAL_MANAGER),
  async (req: Request, res: Response) => {
    try {
      const parsed = createInventorySchema.parse(req.body);
      const invRepo = AppDataSource.getRepository(Inventory);

      const item = invRepo.create(parsed as Partial<Inventory>);
      await invRepo.save(item);

      // Enqueue for ERP sync
      const syncService = new SyncQueueService();
      const payload = await syncService.buildInventoryPayload(item.id);
      await syncService.enqueue({
        entityType: SyncEntityType.INVENTORY,
        entityId: item.id,
        regionCode: item.regionCode,
        payload,
      });

      res.status(201).json({ data: item, syncQueued: true });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: error.errors });
        return;
      }
      const message = error instanceof Error ? error.message : "Internal error";
      // Unique constraint on sku
      if (message.includes("duplicate") || message.includes("unique")) {
        res.status(409).json({ error: "SKU already exists" });
        return;
      }
      res.status(500).json({ error: message });
    }
  }
);

// ─── PUT /:id — update inventory item ───────────────────────────────────────

router.put(
  "/:id",
  authenticateToken,
  authorizeRoles(
    UserRole.ADMIN,
    UserRole.REGIONAL_MANAGER,
    UserRole.AREA_MANAGER
  ),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const parsed = updateInventorySchema.parse(req.body);
      const invRepo = AppDataSource.getRepository(Inventory);

      const item = await invRepo.findOneBy({ id });
      if (!item) {
        res.status(404).json({ error: "Inventory item not found" });
        return;
      }

      // Region check for non-admins
      const user = (req as AuthenticatedRequest).user;
      if (
        user.role !== UserRole.ADMIN &&
        item.regionCode !== user.regionCode
      ) {
        res.status(403).json({ error: "Access denied to this region's inventory" });
        return;
      }

      Object.assign(item, parsed);
      await invRepo.save(item);

      // Enqueue for ERP sync
      const syncService = new SyncQueueService();
      const payload = await syncService.buildInventoryPayload(item.id);
      await syncService.enqueue({
        entityType: SyncEntityType.INVENTORY,
        entityId: item.id,
        regionCode: item.regionCode,
        payload,
      });

      res.json({ data: item, syncQueued: true });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: error.errors });
        return;
      }
      const message = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({ error: message });
    }
  }
);

// ─── POST /:id/reserve — reserve for a customer ─────────────────────────────

router.post(
  "/:id/reserve",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const parsed = reserveSchema.parse(req.body);
      const invRepo = AppDataSource.getRepository(Inventory);
      const customerRepo = AppDataSource.getRepository(Customer);

      const item = await invRepo.findOneBy({ id });
      if (!item) {
        res.status(404).json({ error: "Inventory item not found" });
        return;
      }

      // Region check for non-admins
      const user = (req as AuthenticatedRequest).user;
      if (
        user.role !== UserRole.ADMIN &&
        item.regionCode !== user.regionCode
      ) {
        res.status(403).json({ error: "Access denied to this region's inventory" });
        return;
      }

      if (item.status === InventoryStatus.DELIVERED) {
        res.status(409).json({ error: "Item has already been delivered and cannot be reserved" });
        return;
      }

      // Validate customer exists
      const customer = await customerRepo.findOneBy({ id: parsed.customerId });
      if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }

      // Handle un-reserve when item is already reserved for the same customer
      if (
        item.status === InventoryStatus.RESERVED &&
        item.reservedForCustomerId === parsed.customerId
      ) {
        item.status = InventoryStatus.IN_STOCK;
        item.reservedForCustomerId = null;
        item.reservedDate = null;
      } else {
        item.status = InventoryStatus.RESERVED;
        item.reservedForCustomerId = parsed.customerId;
        item.reservedDate = new Date();
      }

      await invRepo.save(item);

      // Reload with relation
      const updated = await invRepo.findOne({
        where: { id },
        relations: ["reservedForCustomer"],
      } as FindManyOptions<Inventory>);

      // Enqueue for ERP sync
      const syncService = new SyncQueueService();
      const payload = await syncService.buildInventoryPayload(item.id);
      await syncService.enqueue({
        entityType: SyncEntityType.INVENTORY,
        entityId: item.id,
        regionCode: item.regionCode,
        payload,
      });

      res.json({ data: updated, syncQueued: true });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: error.errors });
        return;
      }
      const message = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({ error: message });
    }
  }
);

export default router;
