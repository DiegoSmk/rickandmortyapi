import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createMeta } from "../../plugins/request-meta";

const characterListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  species: z.string().optional(),
  eligible: z.coerce.boolean().optional()
});

const randomCharactersQuerySchema = z.object({
  count: z.coerce.number().int().positive().max(64).optional().default(16),
  eligibleOnly: z.coerce.boolean().optional().default(true)
});

export async function registerCharacterRoutes(app: FastifyInstance) {
  app.get("/v1/characters", async (request) => {
    const query = characterListQuerySchema.parse(request.query);
    const result = app.repositories.characters.list(query);

    return {
      data: {
        items: result.items.map((item) => ({
          id: item.id,
          canonicalName: item.canonicalName,
          displayName: item.displayName,
          canonicalKind: item.canonicalKind,
          species: item.species,
          type: item.type,
          gender: item.gender,
          status: item.status,
          imageUrl: item.imageUrl,
          identityConfidence: item.identityConfidence,
          isVariant: Boolean(item.isVariant),
          isFusion: Boolean(item.isFusion),
          isAliasOnly: Boolean(item.isAliasOnly),
          isActive: Boolean(item.isActive),
          variantFamily: item.variantFamilyId
            ? {
                id: item.variantFamilyId,
                name: item.variantFamilyName
              }
            : null,
          origin: {
            locationName: item.originLocationName,
            dimensionLabel: item.originDimensionLabel
          },
          location: {
            locationName: item.currentLocationName,
            dimensionLabel: item.currentDimensionLabel
          },
          episodeCount: item.episodeCount,
          hasAiProfile: Boolean(item.hasAiProfile),
          primarySource: item.primarySourceId
            ? {
                sourceName: item.primarySourceName,
                sourceId: item.primarySourceId,
                sourceUrl: item.primarySourceUrl
              }
            : null,
          updatedAt: item.updatedAt
        })),
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages
        },
        filters: query
      },
      meta: createMeta(request.requestId)
    };
  });

  app.get("/v1/characters/random", async (request) => {
    const query = randomCharactersQuerySchema.parse(request.query);
    const items = app.repositories.characters.listRandom(query.count, query.eligibleOnly);

    return {
      data: {
        items: items.map((item) => ({
          id: item.id,
          canonicalName: item.canonicalName,
          displayName: item.displayName,
          species: item.species,
          status: item.status,
          imageUrl: item.imageUrl,
          episodeCount: item.episodeCount,
          hasAiProfile: Boolean(item.hasAiProfile),
          isVariant: Boolean(item.isVariant),
          isActive: Boolean(item.isActive)
        })),
        count: items.length,
        eligibleOnly: query.eligibleOnly
      },
      meta: createMeta(request.requestId)
    };
  });

  app.get("/v1/characters/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const character = app.repositories.characters.getById(params.id);

    if (!character) {
      reply.code(404);
      return {
        error: {
          code: "not_found",
          message: "Character not found."
        },
        meta: createMeta(request.requestId)
      };
    }

    const episodes = app.repositories.characters.listEpisodesForCharacter(params.id);
    const latestAiProfile = app.repositories.characters.getLatestAiProfile(params.id);
    const evidences = app.characterEvidence.listCharacterEvidences(params.id);

    return {
      data: {
        id: character.id,
        canonicalName: character.canonicalName,
        displayName: character.displayName,
        canonicalKind: character.canonicalKind,
        species: character.species,
        type: character.type,
        gender: character.gender,
        status: character.status,
        imageUrl: character.imageUrl,
        identityConfidence: character.identityConfidence,
        isVariant: Boolean(character.isVariant),
        isFusion: Boolean(character.isFusion),
        isAliasOnly: Boolean(character.isAliasOnly),
        isActive: Boolean(character.isActive),
        variantFamily: character.variantFamilyId
          ? {
              id: character.variantFamilyId,
              name: character.variantFamilyName
            }
          : null,
        origin: {
          locationName: character.originLocationName,
          dimensionLabel: character.originDimensionLabel
        },
        location: {
          locationName: character.currentLocationName,
          dimensionLabel: character.currentDimensionLabel
        },
        episodeCount: character.episodeCount,
        primarySource: character.primarySourceId
          ? {
              sourceName: character.primarySourceName,
              sourceId: character.primarySourceId,
              sourceUrl: character.primarySourceUrl
            }
          : null,
        createdAt: character.createdAt,
        updatedAt: character.updatedAt,
        episodes,
        evidences,
        aiProfile: latestAiProfile
          ? app.characterEnrichment.parseStoredProfile(latestAiProfile)
          : null
      },
      meta: createMeta(request.requestId)
    };
  });

  app.get("/v1/characters/:id/evidences", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const character = app.repositories.characters.getById(params.id);

    if (!character) {
      reply.code(404);
      return {
        error: {
          code: "not_found",
          message: "Character not found."
        },
        meta: createMeta(request.requestId)
      };
    }

    return {
      data: {
        characterId: params.id,
        items: app.characterEvidence.listCharacterEvidences(params.id)
      },
      meta: createMeta(request.requestId)
    };
  });
}
