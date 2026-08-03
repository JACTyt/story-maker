import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

function resolveDbPath(): string {
  const configured = process.env.DATABASE_PATH;
  if (configured) return configured;
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "story-maker.db");
}

const sqlite = new Database(resolveDbPath());
sqlite.pragma("foreign_keys = ON");

export const db: BetterSQLite3Database<typeof schema> = drizzle(sqlite, { schema });

migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
