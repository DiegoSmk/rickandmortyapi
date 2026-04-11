import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createMeta } from "../../plugins/request-meta";

const createRosterBodySchema = z.object({
  count: z.number().int().positive().max(64).optional().default(16),
  seed: z.string().optional(),
  strategy: z.string().optional().default("random_uniform"),
  eligibleOnly: z.boolean().optional().default(true)
});

export async function registerTournamentRoutes(app: FastifyInstance) {
  app.post("/v1/tournament/rosters", async (request, reply) => {
    const body = createRosterBodySchema.parse(request.body ?? {});

    reply.code(501);
    return {
      error: {
        code: "not_implemented",
        message: "Tournament roster generation is not implemented yet."
      },
      meta: createMeta(request.requestId),
      body
    };
  });

  app.get("/v1/tournament/rosters/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);

    reply.code(501);
    return {
      error: {
        code: "not_implemented",
        message: "Tournament roster lookup is not implemented yet."
      },
      meta: createMeta(request.requestId),
      params
    };
  });
}
