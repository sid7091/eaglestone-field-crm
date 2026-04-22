import { execSync } from "child_process";
import path from "path";
import fs from "fs";

export default async function globalSetup() {
  console.log("\n🔄 Resetting and seeding test database...");
  const root = path.resolve(__dirname, "..");
  const dbPath = path.join(root, "dev.db");

  try {
    // Delete existing DB so prisma db push creates a clean one from current schema
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

    // Push current schema directly (no migration gaps)
    execSync("npx prisma db push", { cwd: root, stdio: "inherit" });

    // Seed
    execSync("npm run db:seed", { cwd: root, stdio: "inherit" });

    console.log("✅ Database ready\n");
  } catch (e) {
    console.error("❌ Database setup failed:", e);
    throw e;
  }
}
