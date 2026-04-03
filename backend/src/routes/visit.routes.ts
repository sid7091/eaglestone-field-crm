import { Router, Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Visit } from "../entities/Visit";
import { Customer } from "../entities/Customer";
import { SyncQueueService } from "../services/sync-queue.service";
import { validateGeofence } from "../services/geofence.service";
import {
  VisitStatus,
  SyncEntityType,
  RegionCode,
} from "../types/enums";
import type { GeoPoint } from "../types/erp-metadata";
import { z } from "zod";

const router = Router();

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

/**
 * POST /api/v1/visits/checkin
 * Field rep checks in at a customer location. Geofence is validated.
 */
router.post("/checkin", async (req: Request, res: Response) => {
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

/**
 * POST /api/v1/visits/checkout
 * Field rep checks out. Geofence re-validated, duration computed, and
 * visit is enqueued for ERP sync.
 */
router.post("/checkout", async (req: Request, res: Response) => {
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
