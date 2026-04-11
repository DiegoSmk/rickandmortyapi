import { join } from "node:path";
import { loadEnv } from "../config/env";
import { createDatabase } from "./database";
import { runMigrations } from "./migrate";

function main() {
  const env = loadEnv();
  const db = createDatabase(env);
  const migrationsDir = join(process.cwd(), "src", "db", "migrations");

  runMigrations(db, migrationsDir);
  console.log(`Migrations applied successfully from ${migrationsDir}`);
}

main();
