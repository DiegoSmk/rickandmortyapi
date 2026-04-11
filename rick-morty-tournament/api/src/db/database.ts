import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { AppEnv } from "../config/env";

function resolveSqlitePath(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error(`Unsupported DATABASE_URL: ${databaseUrl}. Expected file:/...`);
  }

  return databaseUrl.replace(/^file:/, "");
}

export function createDatabase(env: AppEnv) {
  const sqlitePath = resolveSqlitePath(env.DATABASE_URL);
  mkdirSync(dirname(sqlitePath), { recursive: true });

  const db = new DatabaseSync(sqlitePath);
  db.exec("PRAGMA foreign_keys = ON;");
  return db;
}

export type AppDatabase = ReturnType<typeof createDatabase>;
