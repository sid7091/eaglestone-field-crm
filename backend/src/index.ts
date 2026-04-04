import "reflect-metadata";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { AppDataSource } from "./config/database";
import authRoutes from "./routes/auth.routes";
import erpSyncRoutes from "./routes/erp-sync.routes";
import visitRoutes from "./routes/visit.routes";
import customerRoutes from "./routes/customer.routes";
import inventoryRoutes from "./routes/inventory.routes";

const app = express();
const PORT = parseInt(process.env.PORT || "4000", 10);

// ─── Middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ─── Health Check ────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "eaglestone-field-crm",
    timestamp: new Date().toISOString(),
    dbConnected: AppDataSource.isInitialized,
  });
});

// ─── API v1 Routes ───────────────────────────────────────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/erp-sync", erpSyncRoutes);
app.use("/api/v1/visits", visitRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/inventory", inventoryRoutes);

// ─── Bootstrap ───────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log("[DB] PostgreSQL connection established");
    console.log("[DB] Entities registered:", AppDataSource.entityMetadatas.map((e) => e.name).join(", "));

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[API] Eaglestone Field CRM running on port ${PORT}`);
      console.log(`[API] Auth endpoint:     http://0.0.0.0:${PORT}/api/v1/auth`);
      console.log(`[API] ERP Sync endpoint: http://0.0.0.0:${PORT}/api/v1/erp-sync`);
      console.log(`[API] Visits endpoint:     http://0.0.0.0:${PORT}/api/v1/visits`);
      console.log(`[API] Customers endpoint:  http://0.0.0.0:${PORT}/api/v1/customers`);
      console.log(`[API] Inventory endpoint:  http://0.0.0.0:${PORT}/api/v1/inventory`);
    });
  } catch (error) {
    console.error("[FATAL] Failed to start server:", error);
    process.exit(1);
  }
}

bootstrap();
