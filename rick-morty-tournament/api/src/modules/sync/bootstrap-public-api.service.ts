import { BootstrapRepository } from "../../db/repositories/bootstrap.repository";
import type { AppDatabase } from "../../db/database";
import type { AppEnv } from "../../config/env";
import { createId, stableHash } from "../../lib/ids";
import { PublicApiClient, type PublicApiCharacter, type PublicApiEpisode } from "./public-api.client";

function extractSeasonEpisode(episodeCode: string) {
  const match = /^S(\d+)E(\d+)$/i.exec(episodeCode);
  if (!match) {
    return { seasonNumber: null, episodeNumber: null };
  }

  return {
    seasonNumber: Number(match[1]),
    episodeNumber: Number(match[2])
  };
}

function inferVariantFamilySlug(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("rick")) return "rick_family";
  if (normalized.includes("morty")) return "morty_family";
  if (normalized.includes("summer")) return "summer_family";
  if (normalized.includes("beth")) return "beth_family";
  if (normalized.includes("jerry")) return "jerry_family";
  return null;
}

export class BootstrapPublicApiService {
  private readonly repository: BootstrapRepository;
  private readonly client: PublicApiClient;
  private readonly episodeCache = new Map<string, PublicApiEpisode>();

  constructor(private readonly db: AppDatabase, private readonly env: AppEnv) {
    this.repository = new BootstrapRepository(db);
    this.client = new PublicApiClient(env);
  }

  private async getEpisode(url: string) {
    const cached = this.episodeCache.get(url);
    if (cached) {
      return cached;
    }

    const episode = await this.client.fetchEpisodeByUrl(url);
    this.episodeCache.set(url, episode);
    return episode;
  }

  private upsertVariantFamilyIfNeeded(slug: string | null, now: string) {
    if (!slug) return;

    const name = slug
      .replace(/_family$/, "")
      .replace(/^./, (char) => char.toUpperCase())
      .concat(" Family");

    this.db.prepare(`
      INSERT INTO variant_families (id, slug, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        name = excluded.name,
        updated_at = excluded.updated_at
    `).run(
      slug,
      slug,
      name,
      `Auto-generated family bucket for ${name}.`,
      now,
      now
    );
  }

  private upsertCharacter(character: PublicApiCharacter, now: string) {
    const variantFamilySlug = inferVariantFamilySlug(character.name);
    this.upsertVariantFamilyIfNeeded(variantFamilySlug, now);

    const originLocationId = character.origin?.url
      ? `location_source_${stableHash(character.origin.url)}`
      : character.origin?.name
        ? `location_name_${stableHash(character.origin.name)}`
        : null;

    const currentLocationId = character.location?.url
      ? `location_source_${stableHash(character.location.url)}`
      : character.location?.name
        ? `location_name_${stableHash(character.location.name)}`
        : null;

    if (originLocationId) {
      this.repository.upsertLocation({
        id: originLocationId,
        canonicalName: character.origin.name || "Unknown origin",
        sourceId: character.origin.url ? String(character.origin.url.split("/").pop() ?? "") : null,
        sourceUrl: character.origin.url || null,
        locationType: null,
        dimensionLabel: null,
        isDimensionKnown: 0,
        createdAt: now,
        updatedAt: now
      });
    }

    if (currentLocationId) {
      this.repository.upsertLocation({
        id: currentLocationId,
        canonicalName: character.location.name || "Unknown location",
        sourceId: character.location.url ? String(character.location.url.split("/").pop() ?? "") : null,
        sourceUrl: character.location.url || null,
        locationType: null,
        dimensionLabel: null,
        isDimensionKnown: 0,
        createdAt: now,
        updatedAt: now
      });
    }

    const characterId = `character_source_rickmortyapi_${character.id}`;
    const rawPayloadHash = stableHash(JSON.stringify(character));
    const existing = this.repository.getCanonicalCharacterBySourceLink("rickandmortyapi_public", String(character.id));

    this.repository.upsertCanonicalCharacter({
      id: characterId,
      canonicalName: character.name,
      displayName: character.name,
      species: character.species || null,
      type: character.type || null,
      gender: character.gender || null,
      status: character.status || null,
      imageUrl: character.image || null,
      originLocationId,
      currentLocationId,
      isVariant: variantFamilySlug ? 1 : 0,
      isFusion: 0,
      isAliasOnly: 0,
      isActive: 1,
      identityConfidence: 1,
      canonicalKind: "source_bootstrap",
      createdAt: now,
      updatedAt: now
    });

    this.repository.upsertSourceCharacterLink({
      id: `source_link_rickmortyapi_public_${character.id}`,
      characterId,
      sourceName: "rickandmortyapi_public",
      sourceId: String(character.id),
      sourceUrl: character.url,
      rawName: character.name,
      rawPayloadHash,
      matchStatus: "exact_match",
      matchConfidence: 1,
      isPrimarySource: 1,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now
    });

    this.repository.createReconciliationEvent({
      id: createId("reconcile"),
      entityId: characterId,
      entityType: "canonical_character",
      sourceName: "rickandmortyapi_public",
      decisionType: existing ? "update_existing" : "create_new",
      changedFieldsJson: JSON.stringify(["canonical_name", "status", "species", "type", "gender", "image_url"]),
      reason: existing
        ? "Source link already existed; canonical character refreshed from public API."
        : "New canonical character created from initial public API bootstrap.",
      confidence: 1,
      createdAt: now
    });

    return {
      characterId,
      rawPayloadHash,
      existed: Boolean(existing)
    };
  }

  private async upsertEpisodesForCharacter(characterId: string, episodeUrls: string[], now: string) {
    for (const episodeUrl of episodeUrls) {
      const episode = await this.getEpisode(episodeUrl);
      const { seasonNumber, episodeNumber } = extractSeasonEpisode(episode.episode);
      const episodeId = `episode_rickmortyapi_${episode.id}`;

      this.repository.upsertEpisode({
        id: episodeId,
        sourceName: "rickandmortyapi_public",
        sourceId: String(episode.id),
        sourceUrl: episode.url,
        name: episode.name,
        code: episode.episode,
        airDate: episode.air_date || null,
        seasonNumber,
        episodeNumber,
        createdAt: now,
        updatedAt: now
      });

      this.repository.upsertCharacterEpisode({
        id: createId("char_episode"),
        characterId,
        episodeId,
        appearanceKind: "appears_in_episode",
        createdAt: now
      });
    }
  }

  async run() {
    const syncRunId = createId("sync");
    const startedAt = new Date().toISOString();
    this.repository.createSyncRun(syncRunId, "rickandmortyapi_public", startedAt);

    let pagesScanned = 0;
    let recordsSeen = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsUnchanged = 0;

    try {
      const firstPage = await this.client.fetchCharacterPage(1);
      const totalPages = firstPage.info.pages;

      for (let page = 1; page <= totalPages; page++) {
        const payload = page === 1 ? firstPage : await this.client.fetchCharacterPage(page);
        pagesScanned++;

        for (const character of payload.results) {
          recordsSeen++;
          const now = new Date().toISOString();
          const result = this.upsertCharacter(character, now);

          if (result.existed) {
            recordsUpdated++;
          } else {
            recordsCreated++;
          }

          await this.upsertEpisodesForCharacter(result.characterId, character.episode, now);
        }
      }

      this.repository.completeSyncRun({
        id: syncRunId,
        finishedAt: new Date().toISOString(),
        status: "completed",
        pagesScanned,
        recordsSeen,
        recordsCreated,
        recordsUpdated,
        recordsUnchanged,
        errorSummary: null
      });
    } catch (error) {
      this.repository.completeSyncRun({
        id: syncRunId,
        finishedAt: new Date().toISOString(),
        status: "failed",
        pagesScanned,
        recordsSeen,
        recordsCreated,
        recordsUpdated,
        recordsUnchanged,
        errorSummary: error instanceof Error ? error.message : "Unknown bootstrap failure"
      });

      throw error;
    }
  }
}
