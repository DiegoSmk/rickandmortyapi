import { createReadStream } from "node:fs";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  findExistingCharacterAsset,
  getMimeTypeForExtension
} from "./character-images";

export async function registerAssetRoutes(app: FastifyInstance) {
  app.get("/v1/assets/characters/:sourceId", async (request, reply) => {
    const params = z.object({ sourceId: z.string().min(1) }).parse(request.params);
    const asset = findExistingCharacterAsset(app.env.ASSET_STORAGE_DIR, params.sourceId);

    if (!asset) {
      reply.code(404);
      return {
        error: {
          code: "asset_not_found",
          message: "Character image asset not found."
        }
      };
    }

    reply.header("Cache-Control", "public, max-age=86400");
    reply.type(getMimeTypeForExtension(asset.extension));
    return reply.send(createReadStream(asset.filePath));
  });
}
