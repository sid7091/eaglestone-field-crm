import { Router, Request, Response } from "express";
import { join, extname } from "path";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import { AppDataSource } from "../config/database";
import { Visit } from "../entities/Visit";
import {
  authenticateToken,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

// ─── Upload directory root ────────────────────────────────────────────────────

export const UPLOADS_ROOT = join(__dirname, "..", "..", "uploads");

/** Creates the uploads/visits directory tree on startup if absent. */
export async function ensureUploadsDirExists(): Promise<void> {
  const visitsDir = join(UPLOADS_ROOT, "visits");
  if (!existsSync(visitsDir)) {
    await mkdir(visitsDir, { recursive: true });
    console.log("[Uploads] Created uploads/visits directory");
  }
}

// ─── POST /api/v1/uploads/visit-photo/:visitId ────────────────────────────────

router.post(
  "/visit-photo/:visitId",
  authenticateToken,
  express_raw_image(),   // applied inline — see factory below
  async (req: Request, res: Response): Promise<void> => {
    const { visitId } = req.params;

    // Validate content type
    const contentType = req.headers["content-type"] ?? "";
    if (!contentType.startsWith("image/")) {
      res.status(400).json({ error: "Content-Type must be an image (image/jpeg or image/png)" });
      return;
    }

    // Derive file extension from content type
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const mimeBase = contentType.split(";")[0].trim().toLowerCase();
    const ext = extMap[mimeBase] ?? extname(mimeBase).replace("image/", "") ?? "jpg";

    // Validate body
    if (!Buffer.isBuffer(req.body) || (req.body as Buffer).length === 0) {
      res.status(400).json({ error: "Request body is empty" });
      return;
    }

    // Validate visitId format
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(visitId)) {
      res.status(400).json({ error: "Invalid visitId" });
      return;
    }

    // Load visit from DB
    const visitRepo = AppDataSource.getRepository(Visit);
    const visit = await visitRepo.findOne({ where: { id: visitId } });

    if (!visit) {
      res.status(404).json({ error: "Visit not found" });
      return;
    }

    // Create per-visit upload directory
    const visitDir = join(UPLOADS_ROOT, "visits", visitId);
    await mkdir(visitDir, { recursive: true });

    // Write file
    const filename = `${randomUUID()}.${ext}`;
    const filePath = join(visitDir, filename);
    await writeFile(filePath, req.body as Buffer);

    // Build the URL path that clients will use to retrieve the photo
    const urlPath = `/uploads/visits/${visitId}/${filename}`;

    // Append URL to visit's photoUrls array and persist
    await visitRepo
      .createQueryBuilder()
      .update(Visit)
      .set({
        photoUrls: () => `array_append("photoUrls", '${urlPath.replace(/'/g, "''")}')`,
      })
      .where("id = :id", { id: visitId })
      .execute();

    // Re-fetch to get accurate count
    const updated = await visitRepo.findOne({ where: { id: visitId } });
    const photoCount = updated?.photoUrls?.length ?? visit.photoUrls.length + 1;

    res.status(201).json({ url: urlPath, photoCount });
  }
);

// ─── GET /api/v1/uploads/visits/:visitId/:filename ────────────────────────────
// Serves the photo file directly (no auth required — URLs are unguessable UUIDs)

router.get(
  "/visits/:visitId/:filename",
  (req: Request, res: Response): void => {
    const { visitId, filename } = req.params;

    // Basic path traversal protection
    if (
      visitId.includes("..") ||
      visitId.includes("/") ||
      filename.includes("..") ||
      filename.includes("/")
    ) {
      res.status(400).json({ error: "Invalid path" });
      return;
    }

    const filePath = join(UPLOADS_ROOT, "visits", visitId, filename);
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).json({ error: "Photo not found" });
      }
    });
  }
);

// ─── Inline raw-body middleware factory ───────────────────────────────────────
// express.raw() must be called at route-registration time (not as a global
// middleware) so it doesn't interfere with express.json() elsewhere.

import express from "express";

function express_raw_image() {
  return express.raw({ type: "image/*", limit: "10mb" });
}

export default router;
