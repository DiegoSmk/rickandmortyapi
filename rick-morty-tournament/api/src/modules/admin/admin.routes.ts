import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createMeta } from "../../plugins/request-meta";

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get("/v1/admin/enrichment/provider", async (request) => {
    return {
      data: {
        provider: "gemini",
        ...app.gemini.getStatus()
      },
      meta: createMeta(request.requestId)
    };
  });

  app.post("/v1/admin/sync/full", async (request, reply) => {
    reply.code(501);
    return {
      error: {
        code: "not_implemented",
        message: "Full sync is not implemented yet."
      },
      meta: createMeta(request.requestId)
    };
  });

  app.post("/v1/admin/sync/character/:sourceId", async (request, reply) => {
    const params = z.object({ sourceId: z.string().min(1) }).parse(request.params);

    reply.code(501);
    return {
      error: {
        code: "not_implemented",
        message: "Single character sync is not implemented yet."
      },
      meta: createMeta(request.requestId),
      params
    };
  });

  app.get("/v1/admin/sync/runs", async (request, reply) => {
    reply.code(501);
    return {
      error: {
        code: "not_implemented",
        message: "Sync run listing is not implemented yet."
      },
      meta: createMeta(request.requestId)
    };
  });

  app.post("/v1/admin/enrichment/run", async (request, reply) => {
    const body = z.object({
      limit: z.coerce.number().int().positive().max(826).optional(),
      onlyMissing: z.coerce.boolean().optional().default(true),
      delayMs: z.coerce.number().int().min(0).max(10000).optional().default(1200)
    }).parse(request.body ?? {});
    const status = app.gemini.getStatus();

    if (!status.enabled) {
      reply.code(503);
      return {
        error: {
          code: "gemini_disabled",
          message: "Gemini enrichment is disabled."
        },
        data: {
          provider: "gemini",
          status
        },
        meta: createMeta(request.requestId)
      };
    }

    if (!status.hasApiKey) {
      reply.code(503);
      return {
        error: {
          code: "gemini_not_configured",
          message: "Gemini API key is missing."
        },
        data: {
          provider: "gemini",
          status
        },
        meta: createMeta(request.requestId)
      };
    }

    try {
      const result = await app.characterEnrichment.enrichBatch(body);

      return {
        data: {
          provider: "gemini",
          status,
          batch: result
        },
        meta: createMeta(request.requestId)
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Batch enrichment failed.";
      reply.code(500);
      return {
        error: {
          code: "batch_enrichment_failed",
          message
        },
        data: {
          provider: "gemini",
          status,
          batch: body
        },
        meta: createMeta(request.requestId)
      };
    }
  });

  app.post("/v1/admin/enrichment/character/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const status = app.gemini.getStatus();

    if (!status.enabled) {
      reply.code(503);
      return {
        error: {
          code: "gemini_disabled",
          message: "Gemini enrichment is disabled."
        },
        data: {
          provider: "gemini",
          status
        },
        meta: createMeta(request.requestId),
        params
      };
    }

    if (!status.hasApiKey) {
      reply.code(503);
      return {
        error: {
          code: "gemini_not_configured",
          message: "Gemini API key is missing."
        },
        data: {
          provider: "gemini",
          status
        },
        meta: createMeta(request.requestId),
        params
      };
    }

    try {
      const result = await app.characterEnrichment.enrichCharacter(params.id);

      return {
        data: {
          provider: "gemini",
          status,
          characterId: params.id,
          aiProfile: result.profile
        },
        meta: createMeta(request.requestId)
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Enrichment failed.";
      reply.code(message === "Character not found." ? 404 : 500);
      return {
        error: {
          code: message === "Character not found." ? "not_found" : "enrichment_failed",
          message
        },
        data: {
          provider: "gemini",
          status
        },
        meta: createMeta(request.requestId),
        params
      };
    }
  });

  app.post("/v1/admin/evidence/character/:id/rebuild", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);

    try {
      const items = app.characterEvidence.rebuildDerivedEvidences(params.id);

      return {
        data: {
          characterId: params.id,
          sourceKind: "derived_local",
          count: items.length,
          items
        },
        meta: createMeta(request.requestId)
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Evidence rebuild failed.";
      reply.code(message === "Character not found." ? 404 : 500);
      return {
        error: {
          code: message === "Character not found." ? "not_found" : "evidence_rebuild_failed",
          message
        },
        meta: createMeta(request.requestId),
        params
      };
    }
  });

  app.post("/v1/admin/evidence/character/:id/import-fandom", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = z.object({
      pageUrl: z.string().url(),
      maxParagraphs: z.coerce.number().int().min(1).max(8).optional().default(4)
    }).parse(request.body ?? {});

    try {
      const result = await app.fandomEvidence.importCharacterPage(
        params.id,
        body.pageUrl,
        body.maxParagraphs
      );

      return {
        data: result,
        meta: createMeta(request.requestId)
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Fandom import failed.";
      reply.code(message === "Character not found." ? 404 : 500);
      return {
        error: {
          code: message === "Character not found." ? "not_found" : "fandom_import_failed",
          message
        },
        meta: createMeta(request.requestId),
        params,
        body
      };
    }
  });

  app.get("/v1/admin/enrichment/runs", async (request, reply) => {
    reply.code(501);
    return {
      error: {
        code: "not_implemented",
        message: "Enrichment run listing is not implemented yet."
      },
      meta: createMeta(request.requestId)
    };
  });
}
