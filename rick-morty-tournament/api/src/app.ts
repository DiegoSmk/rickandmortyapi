import cors from "@fastify/cors";
import Fastify from "fastify";
import { loadEnv, type AppEnv } from "./config/env";
import { createDatabase, type AppDatabase } from "./db/database";
import { CharactersRepository } from "./db/repositories/characters.repository";
import { EvidencesRepository } from "./db/repositories/evidences.repository";
import { CharacterEnrichmentService } from "./modules/enrichment/character-enrichment.service";
import { CharacterEvidenceService } from "./modules/evidences/character-evidence.service";
import { FandomEvidenceService } from "./modules/evidences/fandom-evidence.service";
import { GeminiEnrichmentService } from "./modules/enrichment/gemini.service";
import { attachRequestMeta, createMeta } from "./plugins/request-meta";
import { registerRoutes } from "./routes";

declare module "fastify" {
  interface FastifyInstance {
    env: AppEnv;
    db: AppDatabase;
    repositories: {
      characters: CharactersRepository;
      evidences: EvidencesRepository;
    };
    characterEnrichment: CharacterEnrichmentService;
    characterEvidence: CharacterEvidenceService;
    fandomEvidence: FandomEvidenceService;
    gemini: GeminiEnrichmentService;
  }
}

export function buildApp(env: AppEnv = loadEnv()) {
  const db = createDatabase(env);
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL
    }
  });

  app.register(cors, {
    origin: true
  });

  app.addHook("onRequest", attachRequestMeta);

  app.decorate("env", env);
  app.decorate("db", db);
  app.decorate("repositories", {
    characters: new CharactersRepository(db, env.ASSET_STORAGE_DIR),
    evidences: new EvidencesRepository(db)
  });
  app.decorate("gemini", new GeminiEnrichmentService(env));
  app.decorate("characterEvidence", new CharacterEvidenceService(app));
  app.decorate("fandomEvidence", new FandomEvidenceService(app));
  app.decorate("characterEnrichment", new CharacterEnrichmentService(app));

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    reply.status(500).send({
      error: {
        code: "internal_server_error",
        message: "Unexpected server error."
      },
      meta: createMeta(request.requestId)
    });
  });

  app.addHook("onClose", (_instance, done) => {
    db.close();
    done();
  });

  app.register(registerRoutes);

  return app;
}
