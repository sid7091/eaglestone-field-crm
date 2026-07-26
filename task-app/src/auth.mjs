import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "node:crypto";
import { db } from "./db.mjs";

const SECRET =
  process.env.TASK_APP_SECRET || "eagle-tasks-dev-secret-change-in-prod";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return (
    candidate.length === expected.length &&
    timingSafeEqual(candidate, expected)
  );
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(str) {
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function signSession(payload) {
  const body = { ...payload, exp: Date.now() + SESSION_TTL_MS };
  const data = b64url(JSON.stringify(body));
  const sig = b64url(createHmac("sha256", SECRET).update(data).digest());
  return `${data}.${sig}`;
}

export function verifySession(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  const expected = b64url(createHmac("sha256", SECRET).update(data).digest());
  if (
    sig.length !== expected.length ||
    !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }
  let body;
  try {
    body = JSON.parse(b64urlDecode(data).toString("utf8"));
  } catch {
    return null;
  }
  if (!body.exp || body.exp < Date.now()) return null;
  return body;
}

/** Resolve the full, current user record for an authenticated request. */
export function currentUser(token) {
  const session = verifySession(token);
  if (!session) return null;
  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(session.userId);
  if (!user || !user.isActive) return null;
  return user;
}
