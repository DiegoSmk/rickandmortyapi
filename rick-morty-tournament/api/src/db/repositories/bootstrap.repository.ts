import type { AppDatabase } from "../database";

export interface CanonicalCharacterRecord {
  id: string;
  canonicalName: string;
  displayName: string;
  species: string | null;
  type: string | null;
  gender: string | null;
  status: string | null;
  imageUrl: string | null;
  originLocationId: string | null;
  currentLocationId: string | null;
  isVariant: number;
  isFusion: number;
  isAliasOnly: number;
  isActive: number;
  identityConfidence: number;
  canonicalKind: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocationRecord {
  id: string;
  canonicalName: string;
  sourceId: string | null;
  sourceUrl: string | null;
  locationType: string | null;
  dimensionLabel: string | null;
  isDimensionKnown: number;
  createdAt: string;
  updatedAt: string;
}

export interface EpisodeRecord {
  id: string;
  sourceName: string;
  sourceId: string;
  sourceUrl: string;
  name: string;
  code: string;
  airDate: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SourceCharacterLinkRecord {
  id: string;
  characterId: string;
  sourceName: string;
  sourceId: string;
  sourceUrl: string;
  rawName: string;
  rawPayloadHash: string;
  matchStatus: string;
  matchConfidence: number;
  isPrimarySource: number;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterEpisodeRecord {
  id: string;
  characterId: string;
  episodeId: string;
  appearanceKind: string;
  createdAt: string;
}

export class BootstrapRepository {
  constructor(private readonly db: AppDatabase) {}

  upsertLocation(record: LocationRecord) {
    this.db.prepare(`
      INSERT INTO locations (
        id, canonical_name, source_id, source_url, location_type, dimension_label, is_dimension_known, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        canonical_name = excluded.canonical_name,
        source_id = excluded.source_id,
        source_url = excluded.source_url,
        location_type = excluded.location_type,
        dimension_label = excluded.dimension_label,
        is_dimension_known = excluded.is_dimension_known,
        updated_at = excluded.updated_at
    `).run(
      record.id,
      record.canonicalName,
      record.sourceId,
      record.sourceUrl,
      record.locationType,
      record.dimensionLabel,
      record.isDimensionKnown,
      record.createdAt,
      record.updatedAt
    );
  }

  upsertCanonicalCharacter(record: CanonicalCharacterRecord) {
    this.db.prepare(`
      INSERT INTO canonical_characters (
        id, canonical_name, display_name, canonical_kind, species, type, gender, status, image_url,
        origin_location_id, current_location_id, identity_confidence, is_variant, is_fusion, is_alias_only,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        canonical_name = excluded.canonical_name,
        display_name = excluded.display_name,
        canonical_kind = excluded.canonical_kind,
        species = excluded.species,
        type = excluded.type,
        gender = excluded.gender,
        status = excluded.status,
        image_url = excluded.image_url,
        origin_location_id = excluded.origin_location_id,
        current_location_id = excluded.current_location_id,
        identity_confidence = excluded.identity_confidence,
        is_variant = excluded.is_variant,
        is_fusion = excluded.is_fusion,
        is_alias_only = excluded.is_alias_only,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at
    `).run(
      record.id,
      record.canonicalName,
      record.displayName,
      record.canonicalKind,
      record.species,
      record.type,
      record.gender,
      record.status,
      record.imageUrl,
      record.originLocationId,
      record.currentLocationId,
      record.identityConfidence,
      record.isVariant,
      record.isFusion,
      record.isAliasOnly,
      record.isActive,
      record.createdAt,
      record.updatedAt
    );
  }

  upsertSourceCharacterLink(record: SourceCharacterLinkRecord) {
    this.db.prepare(`
      INSERT INTO source_character_links (
        id, character_id, source_name, source_id, source_url, raw_name, raw_payload_hash,
        match_status, match_confidence, is_primary_source, last_seen_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_name, source_id) DO UPDATE SET
        character_id = excluded.character_id,
        source_url = excluded.source_url,
        raw_name = excluded.raw_name,
        raw_payload_hash = excluded.raw_payload_hash,
        match_status = excluded.match_status,
        match_confidence = excluded.match_confidence,
        is_primary_source = excluded.is_primary_source,
        last_seen_at = excluded.last_seen_at,
        updated_at = excluded.updated_at
    `).run(
      record.id,
      record.characterId,
      record.sourceName,
      record.sourceId,
      record.sourceUrl,
      record.rawName,
      record.rawPayloadHash,
      record.matchStatus,
      record.matchConfidence,
      record.isPrimarySource,
      record.lastSeenAt,
      record.createdAt,
      record.updatedAt
    );
  }

  upsertEpisode(record: EpisodeRecord) {
    this.db.prepare(`
      INSERT INTO episodes (
        id, source_name, source_id, source_url, name, code, air_date, season_number, episode_number, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_name, source_id) DO UPDATE SET
        source_url = excluded.source_url,
        name = excluded.name,
        code = excluded.code,
        air_date = excluded.air_date,
        season_number = excluded.season_number,
        episode_number = excluded.episode_number,
        updated_at = excluded.updated_at
    `).run(
      record.id,
      record.sourceName,
      record.sourceId,
      record.sourceUrl,
      record.name,
      record.code,
      record.airDate,
      record.seasonNumber,
      record.episodeNumber,
      record.createdAt,
      record.updatedAt
    );
  }

  upsertCharacterEpisode(record: CharacterEpisodeRecord) {
    this.db.prepare(`
      INSERT INTO character_episodes (
        id, character_id, episode_id, appearance_kind, created_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(character_id, episode_id) DO UPDATE SET
        appearance_kind = excluded.appearance_kind
    `).run(
      record.id,
      record.characterId,
      record.episodeId,
      record.appearanceKind,
      record.createdAt
    );
  }

  createSyncRun(id: string, sourceName: string, startedAt: string) {
    this.db.prepare(`
      INSERT INTO sync_runs (
        id, started_at, status, source_name
      ) VALUES (?, ?, ?, ?)
    `).run(id, startedAt, "running", sourceName);
  }

  completeSyncRun(input: {
    id: string;
    finishedAt: string;
    status: string;
    pagesScanned: number;
    recordsSeen: number;
    recordsCreated: number;
    recordsUpdated: number;
    recordsUnchanged: number;
    errorSummary: string | null;
  }) {
    this.db.prepare(`
      UPDATE sync_runs
      SET finished_at = ?,
          status = ?,
          pages_scanned = ?,
          records_seen = ?,
          records_created = ?,
          records_updated = ?,
          records_unchanged = ?,
          error_summary = ?
      WHERE id = ?
    `).run(
      input.finishedAt,
      input.status,
      input.pagesScanned,
      input.recordsSeen,
      input.recordsCreated,
      input.recordsUpdated,
      input.recordsUnchanged,
      input.errorSummary,
      input.id
    );
  }

  createReconciliationEvent(input: {
    id: string;
    entityId: string;
    entityType: string;
    sourceName: string;
    decisionType: string;
    changedFieldsJson: string;
    reason: string;
    confidence: number;
    createdAt: string;
  }) {
    this.db.prepare(`
      INSERT INTO reconciliation_events (
        id, entity_id, entity_type, source_name, decision_type, changed_fields_json, reason, confidence, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.id,
      input.entityId,
      input.entityType,
      input.sourceName,
      input.decisionType,
      input.changedFieldsJson,
      input.reason,
      input.confidence,
      input.createdAt
    );
  }

  getCanonicalCharacterBySourceLink(sourceName: string, sourceId: string) {
    return this.db.prepare(`
      SELECT cc.id AS character_id, scl.raw_payload_hash AS raw_payload_hash
      FROM source_character_links scl
      INNER JOIN canonical_characters cc ON cc.id = scl.character_id
      WHERE scl.source_name = ? AND scl.source_id = ?
      LIMIT 1
    `).get(sourceName, sourceId) as { character_id: string; raw_payload_hash: string } | undefined;
  }
}
