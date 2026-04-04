import { DataSource, DataSourceOptions } from "typeorm";
import { User } from "../entities/User";
import { Customer } from "../entities/Customer";
import { Visit } from "../entities/Visit";
import { Inventory } from "../entities/Inventory";
import { SyncQueue } from "../entities/SyncQueue";

const isProduction = process.env.NODE_ENV === "production";

export const dataSourceOptions: DataSourceOptions = {
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "eaglestone_crm",
  username: process.env.DB_USER || "eaglestone",
  password: process.env.DB_PASSWORD || "eaglestone_secret",
  entities: [User, Customer, Visit, Inventory, SyncQueue],
  synchronize: false, // Schema is managed exclusively via migrations
  logging: isProduction ? ["error"] : ["query", "error"],
  migrations: ["src/migrations/*.ts", "dist/migrations/*.js"],
  subscribers: [],
  extra: {
    // Connection pool tuning for field CRM workloads
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  },
};

export const AppDataSource = new DataSource(dataSourceOptions);
