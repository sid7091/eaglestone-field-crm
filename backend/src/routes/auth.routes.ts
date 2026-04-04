import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AppDataSource } from "../config/database";
import { User } from "../entities/User";
import { UserRole, RegionCode } from "../types/enums";
import {
  authenticateToken,
  authorizeRoles,
  AuthenticatedRequest,
  JwtPayload,
} from "../middleware/auth.middleware";

const router = Router();

// ─── Constants ────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRY = "7d";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("[Auth] JWT_SECRET environment variable is not set");
  }
  return secret;
}

function signToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRY });
}

/** Return a User object safe for API responses (passwordHash stripped). */
function sanitizeUser(
  user: User
): Omit<User, "passwordHash" | "visits"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, visits, ...safe } = user;
  return safe;
}

// ─── Validation Schemas ───────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters"),
  fullName: z.string().min(2).max(150),
  phone: z.string().min(7).max(20),
  role: z.nativeEnum(UserRole).default(UserRole.FIELD_REP),
  regionCode: z.nativeEnum(RegionCode),
  district: z.string().max(100).nullable().optional(),
  territory: z.string().max(100).nullable().optional(),
  reportsTo: z.string().uuid("reportsTo must be a valid UUID").nullable().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ─── POST /register ───────────────────────────────────────────────────────────

/**
 * Admin-only endpoint to create a new CRM user.
 * Returns the created user object with passwordHash omitted.
 */
router.post(
  "/register",
  authenticateToken,
  authorizeRoles(UserRole.ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const body = registerSchema.parse(req.body);
      const userRepo = AppDataSource.getRepository(User);

      // Check for duplicate email
      const existing = await userRepo.findOne({ where: { email: body.email } });
      if (existing) {
        res.status(409).json({ error: "A user with that email already exists" });
        return;
      }

      // Validate reportsTo references a real user
      if (body.reportsTo) {
        const manager = await userRepo.findOne({ where: { id: body.reportsTo } });
        if (!manager) {
          res.status(400).json({ error: "reportsTo references a non-existent user" });
          return;
        }
      }

      const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);

      const user = userRepo.create({
        email: body.email,
        passwordHash,
        fullName: body.fullName,
        phone: body.phone,
        role: body.role,
        regionCode: body.regionCode,
        district: body.district ?? null,
        territory: body.territory ?? null,
        reportsTo: body.reportsTo ?? null,
        isActive: true,
      });

      await userRepo.save(user);

      res.status(201).json({ user: sanitizeUser(user) });
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: err.errors });
        return;
      }
      const message = err instanceof Error ? err.message : "Internal error";
      console.error("[Auth] Register error:", message);
      res.status(500).json({ error: "Registration failed" });
    }
  }
);

// ─── POST /login ──────────────────────────────────────────────────────────────

/**
 * Authenticates a user with email + password.
 * Returns a signed JWT (7-day expiry) and sanitized user info.
 */
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = loginSchema.parse(req.body);
    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo.findOne({ where: { email: body.email } });

    // Use constant-time comparison to prevent user enumeration
    const dummyHash =
      "$2a$12$invalidsaltxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    const hashToCompare = user ? user.passwordHash : dummyHash;
    const passwordMatch = await bcrypt.compare(body.password, hashToCompare);

    if (!user || !passwordMatch) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: "Account is deactivated. Contact your administrator." });
      return;
    }

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      regionCode: user.regionCode,
    });

    res.json({
      token,
      expiresIn: JWT_EXPIRY,
      user: sanitizeUser(user),
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[Auth] Login error:", message);
    res.status(500).json({ error: "Login failed" });
  }
});

// ─── GET /me ──────────────────────────────────────────────────────────────────

/**
 * Returns the full profile of the currently authenticated user.
 * Token is the sole credential — no DB call for latency, but a fresh
 * DB fetch ensures we return up-to-date user data (role changes, deactivation).
 */
router.get(
  "/me",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sub } = (req as AuthenticatedRequest).user;
      const userRepo = AppDataSource.getRepository(User);

      const user = await userRepo.findOne({ where: { id: sub } });

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({ error: "Account is deactivated" });
        return;
      }

      res.json({ user: sanitizeUser(user) });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal error";
      console.error("[Auth] /me error:", message);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  }
);

export default router;
