import type { FastifyInstance } from "fastify";
import { createMeta } from "../../plugins/request-meta";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/v1/health", async (request) => {
    return {
      data: {
        status: "ok",
        service: "rick-morty-tournament-api"
      },
      meta: createMeta(request.requestId)
    };
  });
}
