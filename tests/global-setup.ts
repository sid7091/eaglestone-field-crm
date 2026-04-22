import { execSync } from "child_process";
import path from "path";

export default async function globalSetup() {
  console.log("\n🔄 Resetting and seeding test database...");
  const root = path.resolve(__dirname, "..");
  try {
    execSync("npm run db:reset", { cwd: root, stdio: "inherit" });
    execSync("npm run db:seed", { cwd: root, stdio: "inherit" });
    console.log("✅ Database ready\n");
  } catch (e) {
    console.error("❌ Database setup failed:", e);
    throw e;
  }
}
