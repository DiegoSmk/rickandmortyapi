import type { AppDatabase } from "../database";
import {
  findExistingCharacterAsset,
  getCharacterAssetApiPath
} from "../../modules/assets/character-images";
import { randomUUID } from "node:crypto";

export interface CharacterCatalogRow {
  id: string;
  canonicalName: string;
  displayName: string;
  canonicalKind: string;
  species: string | null;
  type: string | null;
  gender: string | null;
  status: string | null;
  imageUrl: string | null;
  identityConfidence: number;
  isVariant: number;
  isFusion: number;
  isAliasOnly: number;
  isActive: number;
  variantFamilyId: string | null;
  variantFamilyName: string | null;
  originLocationName: string | null;
  originDimensionLabel: string | null;
  currentLocationName: string | null;
  currentDimensionLabel: string | null;
  episodeCount: number;
  primarySourceName: string | null;
  primarySourceId: string | null;
  primarySourceUrl: string | null;
  hasAiProfile: number;
  updatedAt: string;
}

export interface CharacterCatalogFilters {
  page: number;
  pageSize: number;
  search?: string;
  species?: string;
  eligible?: boolean;
}

export interface CharacterCatalogResult {
  items: CharacterCatalogRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CharacterDetailRow extends CharacterCatalogRow {
  createdAt: string;
}

export interface CharacterAiProfileRecord {
  id: string;
  characterId: string;
  analysisVersion: string;
  modelName: string;
  promptVersion: string;
  schemaVersion: string;
  payloadJson: string;
  overallConfidence: number;
  createdAt: string;
}

export interface CharacterEnrichmentQueueItem {
  id: string;
  displayName: string;
  hasAiProfile: number;
}

export class CharactersRepository {
  constructor(
    private readonly db: AppDatabase,
    private readonly assetStorageDir?: string
  ) {}

  private withResolvedImageUrl<T extends { imageUrl: string | null; primarySourceId: string | null }>(item: T) {
    if (!item.imageUrl || !item.primarySourceId || !this.assetStorageDir) {
      return item;
    }

    const asset = findExistingCharacterAsset(this.assetStorageDir, item.primarySourceId);
    if (!asset) {
      return item;
    }

    return {
      ...item,
      imageUrl: getCharacterAssetApiPath(item.primarySourceId)
    };
  }

  private buildWhere(filters: Omit<CharacterCatalogFilters, "page" | "pageSize">) {
    const clauses: string[] = [];
    const params: Array<string | number> = [];

    if (filters.search?.trim()) {
      const normalized = `%${filters.search.trim().toLowerCase()}%`;
      clauses.push("(LOWER(cc.display_name) LIKE ? OR LOWER(cc.canonical_name) LIKE ?)");
      params.push(normalized, normalized);
    }

    if (filters.species?.trim()) {
      clauses.push("cc.species = ?");
      params.push(filters.species.trim());
    }

    if (typeof filters.eligible === "boolean") {
      if (filters.eligible) {
        clauses.push("cc.is_active = 1 AND cc.is_alias_only = 0");
      } else {
        clauses.push("(cc.is_active = 0 OR cc.is_alias_only = 1)");
      }
    }

    const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return { whereSql, params };
  }

  private baseSelectSql() {
    return `
      SELECT
        cc.id AS id,
        cc.canonical_name AS canonicalName,
        cc.display_name AS displayName,
        cc.canonical_kind AS canonicalKind,
        cc.species AS species,
        cc.type AS type,
        cc.gender AS gender,
        cc.status AS status,
        cc.image_url AS imageUrl,
        cc.identity_confidence AS identityConfidence,
        cc.is_variant AS isVariant,
        cc.is_fusion AS isFusion,
        cc.is_alias_only AS isAliasOnly,
        cc.is_active AS isActive,
        cc.created_at AS createdAt,
        cc.updated_at AS updatedAt,
        vf.id AS variantFamilyId,
        vf.name AS variantFamilyName,
        origin.canonical_name AS originLocationName,
        origin.dimension_label AS originDimensionLabel,
        current_loc.canonical_name AS currentLocationName,
        current_loc.dimension_label AS currentDimensionLabel,
        COUNT(DISTINCT ce.episode_id) AS episodeCount,
        scl.source_name AS primarySourceName,
        scl.source_id AS primarySourceId,
        scl.source_url AS primarySourceUrl
        ,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM character_profile_ai cpa
            WHERE cpa.character_id = cc.id
          ) THEN 1
          ELSE 0
        END AS hasAiProfile
      FROM canonical_characters cc
      LEFT JOIN variant_families vf ON vf.id = cc.variant_family_id
      LEFT JOIN locations origin ON origin.id = cc.origin_location_id
      LEFT JOIN locations current_loc ON current_loc.id = cc.current_location_id
      LEFT JOIN character_episodes ce ON ce.character_id = cc.id
      LEFT JOIN source_character_links scl ON scl.character_id = cc.id AND scl.is_primary_source = 1
    `;
  }

  list(filters: CharacterCatalogFilters): CharacterCatalogResult {
    const { whereSql, params } = this.buildWhere(filters);
    const totalRow = this.db.prepare(`
      SELECT COUNT(*) AS total
      FROM canonical_characters cc
      ${whereSql}
    `).get(...params) as { total: number };

    const total = totalRow.total;
    const totalPages = total === 0 ? 0 : Math.ceil(total / filters.pageSize);
    const offset = (filters.page - 1) * filters.pageSize;

    const rows = this.db.prepare(`
      ${this.baseSelectSql()}
      ${whereSql}
      GROUP BY
        cc.id,
        vf.id,
        origin.id,
        current_loc.id,
        scl.id
      ORDER BY cc.display_name COLLATE NOCASE ASC
      LIMIT ? OFFSET ?
    `).all(...params, filters.pageSize, offset) as unknown as CharacterCatalogRow[];

    return {
      items: rows.map((row) => this.withResolvedImageUrl(row)),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages
    };
  }

  listRandom(count: number, eligibleOnly: boolean) {
    const whereSql = eligibleOnly ? "WHERE cc.is_active = 1 AND cc.is_alias_only = 0" : "";

    const rows = this.db.prepare(`
      ${this.baseSelectSql()}
      ${whereSql}
      GROUP BY
        cc.id,
        vf.id,
        origin.id,
        current_loc.id,
        scl.id
      ORDER BY RANDOM()
      LIMIT ?
    `).all(count) as unknown as CharacterCatalogRow[];

    return rows.map((row) => this.withResolvedImageUrl(row));
  }

  getById(id: string) {
    const row = this.db.prepare(`
      ${this.baseSelectSql()}
      WHERE cc.id = ?
      GROUP BY
        cc.id,
        vf.id,
        origin.id,
        current_loc.id,
        scl.id
      LIMIT 1
    `).get(id) as unknown as CharacterDetailRow | undefined;

    return row ? this.withResolvedImageUrl(row) : undefined;
  }

  listEpisodesForCharacter(characterId: string) {
    return this.db.prepare(`
      SELECT
        e.id AS id,
        e.name AS name,
        e.code AS code,
        e.air_date AS airDate,
        e.season_number AS seasonNumber,
        e.episode_number AS episodeNumber,
        e.source_name AS sourceName,
        e.source_id AS sourceId,
        e.source_url AS sourceUrl
      FROM character_episodes ce
      INNER JOIN episodes e ON e.id = ce.episode_id
      WHERE ce.character_id = ?
      ORDER BY e.season_number ASC, e.episode_number ASC, e.name ASC
    `).all(characterId) as unknown as Array<{
      id: string;
      name: string;
      code: string | null;
      airDate: string | null;
      seasonNumber: number | null;
      episodeNumber: number | null;
      sourceName: string;
      sourceId: string;
      sourceUrl: string | null;
    }>;
  }

  listImageSources() {
    return this.db.prepare(`
      SELECT
        scl.source_id AS sourceId,
        cc.image_url AS imageUrl
      FROM canonical_characters cc
      INNER JOIN source_character_links scl
        ON scl.character_id = cc.id
       AND scl.is_primary_source = 1
      WHERE cc.image_url IS NOT NULL
      ORDER BY cc.display_name COLLATE NOCASE ASC
    `).all() as unknown as Array<{
      sourceId: string | null;
      imageUrl: string | null;
    }>;
  }

  getLatestAiProfile(characterId: string) {
    return this.db.prepare(`
      SELECT
        id AS id,
        character_id AS characterId,
        analysis_version AS analysisVersion,
        model_name AS modelName,
        prompt_version AS promptVersion,
        schema_version AS schemaVersion,
        payload_json AS payloadJson,
        overall_confidence AS overallConfidence,
        created_at AS createdAt
      FROM character_profile_ai
      WHERE character_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(characterId) as unknown as CharacterAiProfileRecord | undefined;
  }

  insertAiProfile(input: Omit<CharacterAiProfileRecord, "id" | "createdAt">) {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO character_profile_ai (
        id, character_id, analysis_version, model_name, prompt_version, schema_version,
        payload_json, overall_confidence, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.characterId,
      input.analysisVersion,
      input.modelName,
      input.promptVersion,
      input.schemaVersion,
      input.payloadJson,
      input.overallConfidence,
      createdAt
    );

    return this.getLatestAiProfile(input.characterId);
  }

  listForEnrichmentQueue(limit: number, onlyMissing: boolean) {
    const whereSql = onlyMissing
      ? `
        WHERE NOT EXISTS (
          SELECT 1
          FROM character_profile_ai cpa
          WHERE cpa.character_id = cc.id
        )
      `
      : "";

    return this.db.prepare(`
      SELECT
        cc.id AS id,
        cc.display_name AS displayName,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM character_profile_ai cpa
            WHERE cpa.character_id = cc.id
          ) THEN 1
          ELSE 0
        END AS hasAiProfile
      FROM canonical_characters cc
      ${whereSql}
      ORDER BY cc.display_name COLLATE NOCASE ASC
      LIMIT ?
    `).all(limit) as unknown as CharacterEnrichmentQueueItem[];
  }
}
