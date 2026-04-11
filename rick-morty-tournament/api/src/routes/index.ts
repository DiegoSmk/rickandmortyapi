import type { FastifyInstance } from "fastify";
import { registerAdminRoutes } from "../modules/admin/admin.routes";
import { registerAssetRoutes } from "../modules/assets/assets.routes";
import { registerCharacterRoutes } from "../modules/characters/characters.routes";
import { registerHealthRoutes } from "../modules/health/health.routes";
import { registerTournamentRoutes } from "../modules/tournament/tournament.routes";

export async function registerRoutes(app: FastifyInstance) {
  await registerHealthRoutes(app);
  await registerAssetRoutes(app);
  await registerCharacterRoutes(app);
  await registerTournamentRoutes(app);
  await registerAdminRoutes(app);
}
