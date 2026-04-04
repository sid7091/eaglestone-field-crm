import { Router, Response } from "express";
import { AppDataSource } from "../config/database";
import { Visit } from "../entities/Visit";
import { Customer } from "../entities/Customer";
import { SyncQueueService } from "../services/sync-queue.service";
import { validateGeofence } from "../services/geofence.service";
import {
  VisitStatus,
  VisitPurpose,
  SyncEntityType,
  RegionCode,
  UserRole,
} from "../types/enums";
import type { GeoPoint } from "../types/erp-metadata";
import { z } from "zod";
import {
  authenticateToken,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const geoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  altitude: z.number().optional(),
  timestamp: z.string(),
});

const checkinSchema = z.object({
  visitId: z.string().uuid(),
  location: geoPointSchema,
});

const checkoutSchema = z.object({
  visitId: z.string().uuid(),
  location: geoPointSchema,
  summary: z.string().optional(),
  actionItems: z.string().optional(),
  orderValueINR: z.number().optional(),
});

const createVisitSchema = z.object({
  customerId: z.string().uuid(),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "visitDate must be YYYY-MM-DD"),
  purpose: z.nativeEnum(VisitPurpose),
  regionCode: z.nativeEnum(RegionCode),
  notes: z.string().optional(),
  nextSteps: z.string().optional(),
  followUpDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "followUpDate must be YYYY-MM-DD")
    .optional(),
});

const updateVisitSchema = z.object({
  summary: z.string().optional(),
  actionItems: z.string().optional(),
  nextSteps: z.string().optional(),
  followUpDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  orderValueINR: z.number().optional().nullable(),
  status: z.nativeEnum(VisitStatus).optional(),
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function isAdmin(req: AuthenticatedRequest): boolean {
  return req.user.role === UserRole.ADMIN;
}

// ─── GET / — List visits with filters ────────────────────────────────────────

router.get(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        fieldRepId,
        customerId,
        regionCode,
        status,
        dateFrom,
        dateTo,
        page = "1",
        limit = "50",
      } = req.query as Record<string, string | undefined>;

      const visitRepo = AppDataSource.getRepository(Visit);

      const qb = visitRepo
        .createQueryBuilder("visit")
        .leftJoin("visit.fieldRep", "fieldRep")
        .leftJoin("visit.customer", "customer")
        .addSelect(["fieldRep.id", "fieldRep.fullName"])
        .addSelect(["customer.id", "customer.businessName"]);

      // Region-scope: non-admins can only see their own region
      if (!isAdmin(req)) {
        qb.andWhere("visit.regionCode = :userRegion", {
          userRegion: req.user.regionCode,
        });

        // Field reps can only see their own visits
        if (req.user.role === UserRole.FIELD_REP) {
          qb.andWhere("visit.fieldRepId = :userId", {
            userId: req.user.sub,
          });
        }
      }

      // Optional filters
      if (fieldRepId) {
        qb.andWhere("visit.fieldRepId = :fieldRepId", { fieldRepId });
      }
      if (customerId) {
        qb.andWhere("visit.customerId = :customerId", { customerId });
      }
      if (regionCode) {
        qb.andWhere("visit.regionCode = :regionCode", { regionCode });
      }
      if (status) {
        qb.andWhere("visit.status = :status", { status });
      }
      if (dateFrom) {
        qb.andWhere("visit.visitDate >= :dateFrom", { dateFrom });
      }
      if (dateTo) {
        qb.andWhere("visit.visitDate <= :dateTo", { dateTo });
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
      const skip = (pageNum - 1) * limitNum;

      qb.orderBy("visit.visitDate", "DESC").addOrderBy("visit.createdAt", "DESC");

      const [visits, total] = await qb.skip(skip).take(limitNum).getManyAndCount();

      res.json({
        data: visits,
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
  }
);

// ─── GET /:id — Single visit with relations ───────────────────────────────────

router.get(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const visitRepo = AppDataSource.getRepository(Visit);

      const qb = visitRepo
        .createQueryBuilder("visit")
        .leftJoinAndSelect("visit.fieldRep", "fieldRep")
        .leftJoinAndSelect("visit.customer", "customer")
        .where("visit.id = :id", { id });

      // Region-scope for non-admins
      if (!isAdmin(req)) {
        qb.andWhere("visit.regionCode = :userRegion", {
          userRegion: req.user.regionCode,
        });

        if (req.user.role === UserRole.FIELD_REP) {
          qb.andWhere("visit.fieldRepId = :userId", {
            userId: req.user.sub,
          });
        }
      }

      const visit = await qb.getOne();

      if (!visit) {
        res.status(404).json({ error: "Visit not found" });
        return;
      }

      // Strip password hash from field rep
      const { passwordHash: _ph, ...fieldRepSafe } = visit.fieldRep as typeof visit.fieldRep & { passwordHash?: string };
      void _ph;
      res.json({ ...visit, fieldRep: fieldRepSafe });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({ error: message });
    }
  }
);

// ─── POST / — Create / schedule a visit ──────────────────────────────────────

router.post(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = createVisitSchema.parse(req.body);

      // Non-admins can only create visits in their own region
      if (!isAdmin(req) && parsed.regionCode !== req.user.regionCode) {
        res.status(403).json({
          error: "Forbidden",
          message: "You may only schedule visits in your own region",
        });
        return;
      }

      // Verify customer exists
      const customerRepo = AppDataSource.getRepository(Customer);
      const customer = await customerRepo.findOne({
        where: { id: parsed.customerId },
      });

      if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }

      const visitRepo = AppDataSource.getRepository(Visit);

      const visit = visitRepo.create({
        customerId: parsed.customerId,
        fieldRepId: req.user.sub,
        regionCode: parsed.regionCode,
        visitDate: parsed.visitDate,
        purpose: parsed.purpose,
        status: VisitStatus.PLANNED,
        summary: null,
        actionItems: parsed.notes ?? null,
        nextSteps: parsed.nextSteps ?? null,
        followUpDate: parsed.followUpDate ?? null,
      });

      await visitRepo.save(visit);

      res.status(201).json(visit);
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

// ─── PUT /:id — Update visit details ─────────────────────────────────────────

router.put(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const parsed = updateVisitSchema.parse(req.body);

      const visitRepo = AppDataSource.getRepository(Visit);

      const visit = await visitRepo.findOne({ where: { id } });

      if (!visit) {
        res.status(404).json({ error: "Visit not found" });
        return;
      }

      // Non-admins: region-scope + field reps can only edit their own visits
      if (!isAdmin(req)) {
        if (visit.regionCode !== req.user.regionCode) {
          res.status(403).json({ error: "Forbidden: region mismatch" });
          return;
        }
        if (
          req.user.role === UserRole.FIELD_REP &&
          visit.fieldRepId !== req.user.sub
        ) {
          res.status(403).json({ error: "Forbidden: not your visit" });
          return;
        }
      }

      // Apply only the fields that were supplied
      if (parsed.summary !== undefined) visit.summary = parsed.summary;
      if (parsed.actionItems !== undefined) visit.actionItems = parsed.actionItems;
      if (parsed.nextSteps !== undefined) visit.nextSteps = parsed.nextSteps;
      if (parsed.followUpDate !== undefined)
        visit.followUpDate = parsed.followUpDate ?? null;
      if (parsed.orderValueINR !== undefined)
        visit.orderValueINR = parsed.orderValueINR ?? null;
      if (parsed.status !== undefined) visit.status = parsed.status;

      await visitRepo.save(visit);

      res.json(visit);
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

// ─── POST /checkin ────────────────────────────────────────────────────────────

/**
 * POST /api/v1/visits/checkin
 * Field rep checks in at a customer location. Geofence is validated.
 */
router.post("/checkin", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = checkinSchema.parse(req.body);
    const visitRepo = AppDataSource.getRepository(Visit);
    const customerRepo = AppDataSource.getRepository(Customer);

    const visit = await visitRepo.findOneOrFail({
      where: { id: parsed.visitId },
    });

    const customer = await customerRepo.findOneOrFail({
      where: { id: visit.customerId },
    });

    if (!customer.location) {
      res.status(400).json({
        error: "Customer does not have a registered location for geofence validation",
      });
      return;
    }

    // Validate geofence — is the rep within 100m of the customer?
    const geofenceRadius = parseInt(
      process.env.GEOFENCE_RADIUS_METERS || "100",
      10
    );
    const geofenceResult = validateGeofence(
      customer.location,
      parsed.location as GeoPoint,
      undefined,
      undefined,
      undefined,
      geofenceRadius
    );

    // Update visit with checkin data
    visit.checkinTime = new Date();
    visit.checkinLocation = parsed.location as GeoPoint;
    visit.geofenceValidation = geofenceResult.validation;

    if (geofenceResult.isValid) {
      visit.status = VisitStatus.CHECKED_IN;
    } else {
      visit.status = VisitStatus.FLAGGED_FAKE;
    }

    await visitRepo.save(visit);

    res.json({
      visitId: visit.id,
      status: visit.status,
      geofence: {
        isValid: geofenceResult.isValid,
        distanceMeters: geofenceResult.distanceMeters,
        flags: geofenceResult.flags,
      },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.errors });
      return;
    }
    const message = error instanceof Error ? error.message : "Internal error";
    res.status(500).json({ error: message });
  }
});

// ─── POST /checkout ───────────────────────────────────────────────────────────

/**
 * POST /api/v1/visits/checkout
 * Field rep checks out. Geofence re-validated, duration computed, and
 * visit is enqueued for ERP sync.
 */
router.post("/checkout", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = checkoutSchema.parse(req.body);
    const visitRepo = AppDataSource.getRepository(Visit);
    const customerRepo = AppDataSource.getRepository(Customer);

    const visit = await visitRepo.findOneOrFail({
      where: { id: parsed.visitId },
    });

    const customer = await customerRepo.findOneOrFail({
      where: { id: visit.customerId },
    });

    // Re-validate geofence with checkout location
    const geofenceRadius = parseInt(
      process.env.GEOFENCE_RADIUS_METERS || "100",
      10
    );
    const geofenceResult = customer.location
      ? validateGeofence(
          customer.location,
          visit.checkinLocation!,
          parsed.location as GeoPoint,
          visit.checkinTime ?? undefined,
          new Date(),
          geofenceRadius
        )
      : null;

    // Compute duration
    const checkoutTime = new Date();
    const durationMinutes = visit.checkinTime
      ? Math.round(
          (checkoutTime.getTime() - visit.checkinTime.getTime()) / 60_000
        )
      : null;

    // Update visit
    visit.checkoutTime = checkoutTime;
    visit.checkoutLocation = parsed.location as GeoPoint;
    visit.durationMinutes = durationMinutes;
    visit.summary = parsed.summary ?? null;
    visit.actionItems = parsed.actionItems ?? null;
    visit.orderValueINR = parsed.orderValueINR ?? null;
    visit.status = VisitStatus.COMPLETED;

    if (geofenceResult) {
      visit.geofenceValidation = geofenceResult.validation;
      if (!geofenceResult.isValid) {
        visit.status = VisitStatus.FLAGGED_FAKE;
      }
    }

    await visitRepo.save(visit);

    // Enqueue for ERP sync
    const syncService = new SyncQueueService();
    const payload = await syncService.buildVisitPayload(visit.id);
    await syncService.enqueue({
      entityType: SyncEntityType.VISIT,
      entityId: visit.id,
      regionCode: visit.regionCode as RegionCode,
      payload,
    });

    res.json({
      visitId: visit.id,
      status: visit.status,
      durationMinutes,
      geofence: geofenceResult
        ? {
            isValid: geofenceResult.isValid,
            distanceMeters: geofenceResult.distanceMeters,
            flags: geofenceResult.flags,
          }
        : null,
      syncQueued: true,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.errors });
      return;
    }
    const message = error instanceof Error ? error.message : "Internal error";
    res.status(500).json({ error: message });
  }
});

export default router;
