import { join } from "node:path";
import { loadEnv } from "../config/env";
import { createDatabase } from "../db/database";
import { runMigrations } from "../db/migrate";
import { BootstrapPublicApiService } from "../modules/sync/bootstrap-public-api.service";

async function main() {
  const env = loadEnv();
  const db = createDatabase(env);
  runMigrations(db, join(process.cwd(), "src", "db", "migrations"));

  const service = new BootstrapPublicApiService(db, env);
  await service.run();

  console.log("Public API bootstrap completed successfully.");
}

void main();
