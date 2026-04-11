import type { FastifyInstance } from "fastify";
import type { CharacterDetailRow } from "../../db/repositories/characters.repository";
import { aiCharacterOutputSchema, type AiCharacterOutput } from "./character-enrichment.schema";
import {
  ABILITY_DISPLAY_PT_BR,
  ATTRIBUTE_LABELS_PT_BR,
  TRAIT_DISPLAY_PT_BR,
  WEAKNESS_DISPLAY_PT_BR
} from "./combat-taxonomy";

const APPROVED_TRAITS = [
  "initiative",
  "evasive",
  "resilient",
  "tech_user",
  "schemer",
  "manipulative",
  "chaotic",
  "dimensionally_aware",
  "supportive",
  "leader"
] as const;

const APPROVED_WEAKNESSES = [
  "fragile",
  "cowardly",
  "reckless",
  "unstable",
  "ego_driven",
  "tech_dependent",
  "socially_disruptive"
] as const;

const APPROVED_ABILITIES = [
  "first_strike_round_1",
  "chaotic_spike",
  "tech_combo_boost",
  "panic_under_pressure",
  "manipulate_targeting"
] as const;

const ANALYSIS_VERSION = "v1";
const PROMPT_VERSION = "v1";
const SCHEMA_VERSION = "v1";
const STRICT_SCHEMA_EXAMPLE = `{
  "character_id": "string",
  "analysis_version": "v1",
  "attributes": {
    "caos": 0,
    "sobrevivencia": 0,
    "instabilidade": 0,
    "genialidade": 0,
    "influencia": 0,
    "vitalidade": 0
  },
  "attribute_reasoning": {
    "caos": "string",
    "sobrevivencia": "string",
    "instabilidade": "string",
    "genialidade": "string",
    "influencia": "string",
    "vitalidade": "string"
  },
  "traits": [
    {
      "slug": "initiative",
      "score": 0,
      "reason": "string",
      "confidence": 0.5
    }
  ],
  "weaknesses": [
    {
      "slug": "fragile",
      "score": 0,
      "reason": "string",
      "confidence": 0.5
    }
  ],
  "abilities": [
    {
      "slug": "first_strike_round_1",
      "power_level": 0,
      "reason": "string",
      "confidence": 0.5
    }
  ],
  "narrative_summary": "string",
  "confidence": {
    "overall": 0.5,
    "attributes": 0.5,
    "traits": 0.5,
    "weaknesses": 0.5,
    "abilities": 0.5
  },
  "evidence_summary": ["string"]
}`;

function buildPrompt(
  character: CharacterDetailRow,
  episodes: Array<{ code: string | null; name: string; airDate: string | null }>,
  evidenceBundle: Array<{
    evidenceType: string;
    title: string;
    description: string;
    sourceKind: string;
    sourceName: string | null;
    sourceRef: string | null;
    seasonNumber: number | null;
    episodeCode: string | null;
    confidence: number;
  }>
) {
  const prioritizedEvidenceBundle = [...evidenceBundle].sort((a, b) => {
    const sourceWeight = (item: typeof a) => {
      if (item.sourceKind === "manual_review") return 4;
      if (item.sourceKind === "fandom_page") return 3;
      if (item.sourceKind === "structured_api") return 2;
      return 1;
    };

    return sourceWeight(b) - sourceWeight(a) || b.confidence - a.confidence;
  }).slice(0, 12);

  const episodeSample = episodes
    .slice(0, 12)
    .map((episode) => ({
      code: episode.code,
      name: episode.name,
      air_date: episode.airDate
    }));

  return JSON.stringify(
    {
      character_id: character.id,
      canonical_identity: {
        name: character.displayName,
        canonical_name: character.canonicalName,
        canonical_kind: character.canonicalKind,
        species: character.species,
        type: character.type,
        gender: character.gender,
        status: character.status,
        is_variant: Boolean(character.isVariant),
        variant_family: character.variantFamilyName,
        origin_name: character.originLocationName,
        origin_dimension: character.originDimensionLabel,
        current_location_name: character.currentLocationName,
        current_dimension: character.currentDimensionLabel,
        source_ref: character.primarySourceId
      },
      appearance_summary: {
        episode_count: character.episodeCount,
        sampled_episodes: episodeSample
      },
      evidence_bundle: prioritizedEvidenceBundle.map((item) => ({
        evidence_type: item.evidenceType,
        title: item.title,
        description: item.description,
        source_kind: item.sourceKind,
        source_name: item.sourceName,
        source_ref: item.sourceRef,
        season_number: item.seasonNumber,
        episode_code: item.episodeCode,
        confidence: item.confidence
      })),
      quality_flags: {
        has_minimum_evidence: character.episodeCount > 0,
        evidence_bundle_count: evidenceBundle.length,
        has_multi_source_support: new Set(
          evidenceBundle.map((item) => item.sourceKind)
        ).size > 1,
        has_manual_review: evidenceBundle.some((item) => item.sourceKind === "manual_review"),
        has_external_web_evidence: evidenceBundle.some((item) => item.sourceKind === "fandom_page"),
        is_variant_identity: Boolean(character.isVariant),
        is_low_confidence_profile: character.identityConfidence < 0.75
      }
    },
    null,
    2
  );
}

function validateApprovedValues(payload: AiCharacterOutput) {
  for (const trait of payload.traits) {
    if (!APPROVED_TRAITS.includes(trait.slug as (typeof APPROVED_TRAITS)[number])) {
      throw new Error(`Gemini returned unsupported trait slug: ${trait.slug}`);
    }
  }

  for (const weakness of payload.weaknesses) {
    if (!APPROVED_WEAKNESSES.includes(weakness.slug as (typeof APPROVED_WEAKNESSES)[number])) {
      throw new Error(`Gemini returned unsupported weakness slug: ${weakness.slug}`);
    }
  }

  for (const ability of payload.abilities) {
    if (!APPROVED_ABILITIES.includes(ability.slug as (typeof APPROVED_ABILITIES)[number])) {
      throw new Error(`Gemini returned unsupported ability slug: ${ability.slug}`);
    }
  }
}

function buildBaseSystemInstruction() {
  return [
    "Voce avalia personagens de Rick and Morty para um jogo tatico.",
    "Responda apenas JSON valido.",
    `Use apenas os traits aprovados: ${APPROVED_TRAITS.join(", ")}.`,
    `Use apenas as fraquezas aprovadas: ${APPROVED_WEAKNESSES.join(", ")}.`,
    `Use apenas as habilidades aprovadas: ${APPROVED_ABILITIES.join(", ")}.`,
    "Todos os atributos devem ficar entre 0 e 100.",
    "Quando houver evidence_bundle com source_kind fandom_page ou manual_review, priorize essas evidencias sobre inferencias fracas de contexto.",
    "Toda justificativa deve ser curta e ancorada apenas nas evidencias fornecidas no dossie.",
    "Nao atribua feitos, poder, resistencia, influencia ou genialidade sem apoio explicito nas evidencias disponiveis.",
    "Se a evidencia for fraca ou incompleta, reduza a confianca e evite notas infladas.",
    "evidence_summary deve citar fatos concretos do dossie, de preferencia com episodio, contexto ou demonstracao observavel.",
    "Nao invente slug fora da biblioteca.",
    `analysis_version deve ser ${ANALYSIS_VERSION}.`,
    "Traits, weaknesses e abilities devem ser arrays de objetos, nunca arrays de strings.",
    "attributes, attribute_reasoning, confidence, narrative_summary e evidence_summary sao obrigatorios."
  ].join(" ");
}

function parseAndValidatePayload(rawText: string, characterId: string) {
  const parsed = aiCharacterOutputSchema.parse(JSON.parse(rawText));

  if (parsed.character_id !== characterId) {
    throw new Error("Gemini returned a mismatched character_id.");
  }

  validateApprovedValues(parsed);
  return parsed;
}

function buildRepairPrompt(characterId: string, invalidJson: string) {
  return [
    `Converta a resposta abaixo para o schema EXATO exigido para o personagem ${characterId}.`,
    "Retorne apenas JSON valido, sem markdown.",
    "Nao remova campos obrigatorios.",
    "Nao use arrays de strings para traits, weaknesses ou abilities; use arrays de objetos completos.",
    "Nao invente slugs fora da biblioteca aprovada.",
    `Use este schema como referencia exata:\n${STRICT_SCHEMA_EXAMPLE}`,
    `Resposta anterior para reparar:\n${invalidJson}`
  ].join("\n\n");
}

export class CharacterEnrichmentService {
  constructor(private readonly app: FastifyInstance) {}

  async enrichCharacter(characterId: string) {
    this.app.gemini.ensureReady();

    const character = this.app.repositories.characters.getById(characterId);
    if (!character) {
      throw new Error("Character not found.");
    }

    this.app.characterEvidence.rebuildDerivedEvidences(characterId);
    const evidences = this.app.characterEvidence.listCharacterEvidences(characterId);
    const episodes = this.app.repositories.characters.listEpisodesForCharacter(characterId);
    const systemInstruction = buildBaseSystemInstruction();

    const userPrompt = buildPrompt(character, episodes, evidences);
    const rawResponseText = await this.app.gemini.generateRawJsonText(systemInstruction, userPrompt);
    let payload: AiCharacterOutput;

    try {
      payload = parseAndValidatePayload(rawResponseText, characterId);
    } catch {
      const repairedText = await this.app.gemini.generateRawJsonText(
        buildBaseSystemInstruction(),
        buildRepairPrompt(characterId, rawResponseText)
      );
      payload = parseAndValidatePayload(repairedText, characterId);
    }

    const saved = this.app.repositories.characters.insertAiProfile({
      characterId,
      analysisVersion: payload.analysis_version,
      modelName: this.app.gemini.getStatus().model,
      promptVersion: PROMPT_VERSION,
      schemaVersion: SCHEMA_VERSION,
      payloadJson: JSON.stringify(payload),
      overallConfidence: payload.confidence.overall
    });

    return {
      character,
      profile: saved ? this.parseStoredProfile(saved) : payload
    };
  }

  parseStoredProfile(record: { payloadJson: string }) {
    const parsed = aiCharacterOutputSchema.parse(JSON.parse(record.payloadJson));

    return {
      ...parsed,
      attributes_display: Object.entries(parsed.attributes).map(([slug, value]) => ({
        slug,
        label: ATTRIBUTE_LABELS_PT_BR[slug as keyof typeof ATTRIBUTE_LABELS_PT_BR] ?? slug,
        value
      })),
      traits: parsed.traits.map((item) => ({
        ...item,
        display_name: TRAIT_DISPLAY_PT_BR[item.slug as keyof typeof TRAIT_DISPLAY_PT_BR]?.label ?? item.slug,
        description_pt:
          TRAIT_DISPLAY_PT_BR[item.slug as keyof typeof TRAIT_DISPLAY_PT_BR]?.description ?? item.reason
      })),
      weaknesses: parsed.weaknesses.map((item) => ({
        ...item,
        display_name:
          WEAKNESS_DISPLAY_PT_BR[item.slug as keyof typeof WEAKNESS_DISPLAY_PT_BR]?.label ?? item.slug,
        description_pt:
          WEAKNESS_DISPLAY_PT_BR[item.slug as keyof typeof WEAKNESS_DISPLAY_PT_BR]?.description ?? item.reason
      })),
      abilities: parsed.abilities.map((item) => ({
        ...item,
        display_name:
          ABILITY_DISPLAY_PT_BR[item.slug as keyof typeof ABILITY_DISPLAY_PT_BR]?.label ?? item.slug,
        description_pt:
          ABILITY_DISPLAY_PT_BR[item.slug as keyof typeof ABILITY_DISPLAY_PT_BR]?.description ?? item.reason
      }))
    };
  }

  async enrichBatch(input?: {
    limit?: number;
    onlyMissing?: boolean;
    delayMs?: number;
  }) {
    this.app.gemini.ensureReady();

    const limit = Math.max(1, Math.min(input?.limit ?? 826, 826));
    const onlyMissing = input?.onlyMissing ?? true;
    const delayMs = Math.max(0, input?.delayMs ?? 1200);
    const queue = this.app.repositories.characters.listForEnrichmentQueue(limit, onlyMissing);

    const results: Array<{
      characterId: string;
      displayName: string;
      status: "success" | "failed";
      error?: string;
    }> = [];

    for (const item of queue) {
      try {
        await this.enrichCharacter(item.id);
        results.push({
          characterId: item.id,
          displayName: item.displayName,
          status: "success"
        });
      } catch (error) {
        results.push({
          characterId: item.id,
          displayName: item.displayName,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown enrichment error."
        });
      }

      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    const successCount = results.filter((item) => item.status === "success").length;
    const failureCount = results.length - successCount;

    return {
      limit,
      onlyMissing,
      delayMs,
      queued: queue.length,
      processed: results.length,
      successCount,
      failureCount,
      results
    };
  }
}
