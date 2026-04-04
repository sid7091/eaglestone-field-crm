import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRole, RegionCode } from "../types/enums";

// ─── Token Payload & Augmented Request ───────────────────────────────────────

export interface JwtPayload {
  sub: string;        // user UUID
  email: string;
  role: UserRole;
  regionCode: RegionCode;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("[Auth] JWT_SECRET environment variable is not set");
  }
  return secret;
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7); // strip "Bearer "
}

// ─── authenticateToken ────────────────────────────────────────────────────────

/**
 * Verifies the Bearer JWT from the Authorization header.
 * On success, attaches the decoded payload to `req.user`.
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = extractBearerToken(req);

  if (!token) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  try {
    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;

    // Validate the payload shape defensively before trusting it
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      !Object.values(UserRole).includes(payload.role) ||
      !Object.values(RegionCode).includes(payload.regionCode)
    ) {
      res.status(401).json({ error: "Token payload is invalid" });
      return;
    }

    (req as AuthenticatedRequest).user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "Token has expired" });
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Token is invalid" });
      return;
    }
    res.status(500).json({ error: "Failed to authenticate token" });
  }
}

// ─── authorizeRoles ───────────────────────────────────────────────────────────

/**
 * Role-based access control. Must be used after `authenticateToken`.
 *
 * @example
 *   router.post("/register", authenticateToken, authorizeRoles(UserRole.ADMIN), handler)
 */
export function authorizeRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }

    if (!roles.includes(user.role)) {
      res.status(403).json({
        error: "Forbidden",
        message: `Required role(s): ${roles.join(", ")}. Your role: ${user.role}`,
      });
      return;
    }

    next();
  };
}

// ─── authorizeRegion ──────────────────────────────────────────────────────────

/**
 * Region-scoped access control. Must be used after `authenticateToken`.
 *
 * Reads `regionCode` from `req.query`, `req.params`, or `req.body` (in that
 * order). ADMINs bypass the check entirely and may access all regions.
 *
 * Downstream handlers can trust that non-ADMIN callers are only ever accessing
 * their own region.
 */
export function authorizeRegion(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({ error: "Unauthenticated" });
    return;
  }

  // ADMINs have unrestricted cross-region access
  if (user.role === UserRole.ADMIN) {
    next();
    return;
  }

  // Resolve the requested region from the incoming request
  const requestedRegion =
    (req.query["regionCode"] as string | undefined) ??
    (req.params["regionCode"] as string | undefined) ??
    (typeof req.body === "object" && req.body !== null
      ? (req.body as Record<string, unknown>)["regionCode"]
      : undefined);

  if (!requestedRegion) {
    // No region specified — allow and let the route handler scope by user's region
    next();
    return;
  }

  if (requestedRegion !== user.regionCode) {
    res.status(403).json({
      error: "Forbidden",
      message: `You are not authorized to access region ${String(requestedRegion)}`,
    });
    return;
  }

  next();
}
