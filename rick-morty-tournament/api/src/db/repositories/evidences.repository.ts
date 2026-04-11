import { randomUUID } from "node:crypto";
import type { AppDatabase } from "../database";

export interface CharacterEvidenceRecord {
  id: string;
  characterId: string;
  evidenceType: string;
  title: string;
  description: string;
  sourceKind: string;
  sourceName: string | null;
  sourceRef: string | null;
  seasonNumber: number | null;
  episodeCode: string | null;
  dimensionId: string | null;
  confidence: number;
  isManualVerified: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCharacterEvidenceInput {
  characterId: string;
  evidenceType: string;
  title: string;
  description: string;
  sourceKind: string;
  sourceName?: string | null;
  sourceRef?: string | null;
  seasonNumber?: number | null;
  episodeCode?: string | null;
  dimensionId?: string | null;
  confidence: number;
  isManualVerified?: boolean;
}

export class EvidencesRepository {
  constructor(private readonly db: AppDatabase) {}

  listForCharacter(characterId: string) {
    return this.db.prepare(`
      SELECT
        id AS id,
        character_id AS characterId,
        evidence_type AS evidenceType,
        title AS title,
        description AS description,
        source_kind AS sourceKind,
        source_name AS sourceName,
        source_ref AS sourceRef,
        season_number AS seasonNumber,
        episode_code AS episodeCode,
        dimension_id AS dimensionId,
        confidence AS confidence,
        is_manual_verified AS isManualVerified,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM character_evidences
      WHERE character_id = ?
      ORDER BY
        confidence DESC,
        season_number ASC NULLS LAST,
        episode_code ASC NULLS LAST,
        created_at DESC
    `).all(characterId) as unknown as CharacterEvidenceRecord[];
  }

  deleteDerivedForCharacter(characterId: string) {
    this.db.prepare(`
      DELETE FROM character_evidences
      WHERE character_id = ?
        AND source_kind = 'derived_local'
    `).run(characterId);
  }

  deleteBySource(characterId: string, sourceKind: string, sourceRef: string) {
    this.db.prepare(`
      DELETE FROM character_evidences
      WHERE character_id = ?
        AND source_kind = ?
        AND source_ref = ?
    `).run(characterId, sourceKind, sourceRef);
  }

  insertMany(items: CreateCharacterEvidenceInput[]) {
    const insertStatement = this.db.prepare(`
      INSERT INTO character_evidences (
        id,
        character_id,
        evidence_type,
        title,
        description,
        source_kind,
        source_name,
        source_ref,
        season_number,
        episode_code,
        dimension_id,
        confidence,
        is_manual_verified,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    this.db.exec("BEGIN");

    try {
      for (const item of items) {
        insertStatement.run(
          randomUUID(),
          item.characterId,
          item.evidenceType,
          item.title,
          item.description,
          item.sourceKind,
          item.sourceName ?? null,
          item.sourceRef ?? null,
          item.seasonNumber ?? null,
          item.episodeCode ?? null,
          item.dimensionId ?? null,
          item.confidence,
          item.isManualVerified ? 1 : 0,
          now,
          now
        );
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }

    return this.listForCharacter(items[0]?.characterId ?? "");
  }
}
