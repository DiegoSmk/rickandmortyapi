import type { FastifyInstance } from "fastify";
import type { CharacterDetailRow } from "../../db/repositories/characters.repository";
import type { CreateCharacterEvidenceInput } from "../../db/repositories/evidences.repository";

type CharacterEpisode = ReturnType<FastifyInstance["repositories"]["characters"]["listEpisodesForCharacter"]>[number];

function buildDerivedEvidenceRows(character: CharacterDetailRow, episodes: CharacterEpisode[]): CreateCharacterEvidenceInput[] {
  const rows: CreateCharacterEvidenceInput[] = [];
  const earliestEpisode = episodes[0];
  const latestEpisode = episodes[episodes.length - 1];

  rows.push({
    characterId: character.id,
    evidenceType: "appearance_scope",
    title: "Escopo de aparicao consolidado",
    description: `${character.displayName} aparece em ${character.episodeCount} episodios no catalogo local.`,
    sourceKind: "derived_local",
    sourceName: "catalog_bootstrap",
    sourceRef: character.primarySourceId,
    seasonNumber: latestEpisode?.seasonNumber ?? null,
    episodeCode: latestEpisode?.code ?? null,
    confidence: 0.92
  });

  if (earliestEpisode) {
    rows.push({
      characterId: character.id,
      evidenceType: "first_seen_episode",
      title: "Primeira aparicao conhecida",
      description: `${character.displayName} aparece pela primeira vez no catalogo em ${earliestEpisode.code ?? earliestEpisode.name}.`,
      sourceKind: "derived_local",
      sourceName: "catalog_bootstrap",
      sourceRef: earliestEpisode.sourceId,
      seasonNumber: earliestEpisode.seasonNumber ?? null,
      episodeCode: earliestEpisode.code ?? null,
      confidence: 0.88
    });
  }

  if (character.originLocationName) {
    rows.push({
      characterId: character.id,
      evidenceType: "origin_context",
      title: "Contexto de origem conhecido",
      description: `Origem registrada como ${character.originLocationName}${character.originDimensionLabel ? ` na dimensao ${character.originDimensionLabel}` : ""}.`,
      sourceKind: "derived_local",
      sourceName: "catalog_bootstrap",
      sourceRef: character.primarySourceId,
      confidence: 0.84
    });
  }

  if (character.currentLocationName && character.currentLocationName !== character.originLocationName) {
    rows.push({
      characterId: character.id,
      evidenceType: "location_shift",
      title: "Mudanca de local relevante",
      description: `Local atual registrado como ${character.currentLocationName}, diferente da origem conhecida.`,
      sourceKind: "derived_local",
      sourceName: "catalog_bootstrap",
      sourceRef: character.primarySourceId,
      confidence: 0.76
    });
  }

  if (character.isVariant) {
    rows.push({
      characterId: character.id,
      evidenceType: "variant_identity",
      title: "Identidade de variante",
      description: `${character.displayName} esta marcado como variante no catalogo local.`,
      sourceKind: "derived_local",
      sourceName: "identity_resolution",
      sourceRef: character.primarySourceId,
      confidence: 0.91
    });
  }

  if ((character.species ?? "").toLowerCase() === "human") {
    rows.push({
      characterId: character.id,
      evidenceType: "species_baseline",
      title: "Base biologica humana",
      description: "Especie registrada como Human, sem prova local de fisiologia extraordinaria no bootstrap.",
      sourceKind: "derived_local",
      sourceName: "catalog_bootstrap",
      sourceRef: character.primarySourceId,
      confidence: 0.7
    });
  }

  if ((character.species ?? "").toLowerCase() !== "human" && character.species) {
    rows.push({
      characterId: character.id,
      evidenceType: "species_baseline",
      title: "Base biologica nao humana",
      description: `Especie registrada como ${character.species}, indicando fisiologia potencialmente distinta de humanos padrao.`,
      sourceKind: "derived_local",
      sourceName: "catalog_bootstrap",
      sourceRef: character.primarySourceId,
      confidence: 0.72
    });
  }

  if (episodes.length >= 10) {
    rows.push({
      characterId: character.id,
      evidenceType: "recurrence_signal",
      title: "Presenca recorrente relevante",
      description: `${character.displayName} tem alta recorrencia no catalogo, o que sugere maior volume de feitos observaveis para avaliacao futura.`,
      sourceKind: "derived_local",
      sourceName: "catalog_bootstrap",
      sourceRef: character.primarySourceId,
      seasonNumber: latestEpisode?.seasonNumber ?? null,
      episodeCode: latestEpisode?.code ?? null,
      confidence: 0.74
    });
  }

  return rows;
}

export class CharacterEvidenceService {
  constructor(private readonly app: FastifyInstance) {}

  listCharacterEvidences(characterId: string) {
    return this.app.repositories.evidences.listForCharacter(characterId);
  }

  rebuildDerivedEvidences(characterId: string) {
    const character = this.app.repositories.characters.getById(characterId);
    if (!character) {
      throw new Error("Character not found.");
    }

    const episodes = this.app.repositories.characters.listEpisodesForCharacter(characterId);
    const rows = buildDerivedEvidenceRows(character, episodes);

    this.app.repositories.evidences.deleteDerivedForCharacter(characterId);
    if (rows.length === 0) {
      return [];
    }

    return this.app.repositories.evidences.insertMany(rows);
  }
}
