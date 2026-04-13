import { ensureAdminSession } from "../../../_lib/admin-auth";
import { writeAuditLog } from "../../../_lib/audit-log";

const DEFAULT_UPSTREAM_BASE_URL = "https://rickandmortyapi.com/api";
const DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
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
];
const APPROVED_WEAKNESSES = [
  "fragile",
  "cowardly",
  "reckless",
  "unstable",
  "ego_driven",
  "tech_dependent",
  "socially_disruptive"
];
const APPROVED_ABILITIES = [
  "first_strike_round_1",
  "chaotic_spike",
  "tech_combo_boost",
  "panic_under_pressure",
  "manipulate_targeting"
];
const CAPACITY_KEYS = ["caos", "sobrevivencia", "instabilidade", "genialidade", "influencia", "vitalidade"];

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
}

function meta() {
  return {
    requestId: crypto.randomUUID(),
    timestamp: new Date().toISOString()
  };
}

function parsePath(context) {
  const raw = context.params?.path;

  if (Array.isArray(raw)) {
    return raw.filter(Boolean);
  }

  if (typeof raw === "string" && raw.length > 0) {
    return raw.split("/").filter(Boolean);
  }

  return [];
}

function normalizeBaseUrl(baseUrl) {
  return (baseUrl || DEFAULT_UPSTREAM_BASE_URL).replace(/\/+$/, "");
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Upstream request failed with status ${response.status}`);
  }

  return response.json();
}

async function importPublicPaginatedResource({
  env,
  upstreamBaseUrl,
  resourceName,
  body,
  mapStatements
}) {
  const maxPages = body?.maxPages == null ? 1 : Number(body.maxPages);
  const startPage = body?.startPage == null ? 1 : Number(body.startPage);
  let nextUrl = `${upstreamBaseUrl}/${resourceName}?page=${startPage}`;
  let pagesImported = 0;
  let recordsImported = 0;
  let nextPage = null;

  while (nextUrl) {
    if (!Number.isInteger(maxPages) || maxPages <= 0 || maxPages > 5 || !Number.isInteger(startPage) || startPage <= 0) {
      throw new Error("maxPages must be between 1 and 5 and startPage must be a positive integer.");
    }

    if (pagesImported >= maxPages) {
      break;
    }

    const payload = await fetchJson(nextUrl);
    const items = Array.isArray(payload.results) ? payload.results : [];

    if (items.length > 0) {
      await env.DB.batch(mapStatements(items));
    }

    pagesImported += 1;
    recordsImported += items.length;
    nextUrl = payload.info?.next || null;
  }

  if (nextUrl) {
    try {
      nextPage = Number(new URL(nextUrl).searchParams.get("page") || "0") || null;
    } catch {
      nextPage = null;
    }
  }

  return {
    pagesImported,
    recordsImported,
    maxPages,
    startPage,
    nextPage
  };
}

async function listVoteSummary(env) {
  const totals = await env.DB.prepare(`
    SELECT
      COUNT(*) AS trackedCharacters,
      COALESCE(SUM(likes), 0) AS totalLikes,
      COALESCE(SUM(dislikes), 0) AS totalDislikes
    FROM character_votes
  `).first();

  const topLiked = await env.DB.prepare(`
    SELECT character_id AS characterId, likes, dislikes, updated_at AS updatedAt
    FROM character_votes
    ORDER BY likes DESC, updated_at DESC
    LIMIT 10
  `).all();

  const topDisliked = await env.DB.prepare(`
    SELECT character_id AS characterId, likes, dislikes, updated_at AS updatedAt
    FROM character_votes
    ORDER BY dislikes DESC, updated_at DESC
    LIMIT 10
  `).all();

  const [characterTotals, episodeTotals, locationTotals] = await env.DB.batch([
    env.DB.prepare(`SELECT COUNT(*) AS total FROM characters`),
    env.DB.prepare(`SELECT COUNT(*) AS total FROM episodes`),
    env.DB.prepare(`SELECT COUNT(*) AS total FROM locations`)
  ]);

  return {
    trackedCharacters: Number(totals?.trackedCharacters || 0),
    catalogCharacters: Number(characterTotals.results?.[0]?.total || 0),
    catalogEpisodes: Number(episodeTotals.results?.[0]?.total || 0),
    catalogLocations: Number(locationTotals.results?.[0]?.total || 0),
    totalLikes: Number(totals?.totalLikes || 0),
    totalDislikes: Number(totals?.totalDislikes || 0),
    topLiked: topLiked.results || [],
    topDisliked: topDisliked.results || []
  };
}

async function listAuditLogs(env, requestUrl) {
  const page = Math.max(1, Number(requestUrl.searchParams.get("page") || "1"));
  const requestedPageSize = Number(requestUrl.searchParams.get("pageSize") || "25");
  const pageSize = Math.min(100, Math.max(1, requestedPageSize));
  const offset = (page - 1) * pageSize;

  const totalRow = await env.DB.prepare(`
    SELECT COUNT(*) AS total
    FROM audit_logs
  `).first();

  const rows = await env.DB.prepare(`
    SELECT
      id,
      actor_email AS actorEmail,
      actor_role AS actorRole,
      action,
      target_type AS targetType,
      target_id AS targetId,
      metadata_json AS metadataJson,
      created_at AS createdAt
    FROM audit_logs
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(pageSize, offset).all();

  const items = (rows.results || []).map((row) => ({
    ...row,
    metadata: row.metadataJson ? JSON.parse(row.metadataJson) : null
  }));

  const total = Number(totalRow?.total || 0);

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize)
    }
  };
}

async function listAdminEpisodes(env, requestUrl) {
  const page = Math.max(1, Number(requestUrl.searchParams.get("page") || "1"));
  const requestedPageSize = Number(requestUrl.searchParams.get("pageSize") || "24");
  const pageSize = Math.min(100, Math.max(1, requestedPageSize));
  const offset = (page - 1) * pageSize;
  const search = requestUrl.searchParams.get("search") || "";

  let whereClause = "";
  const params = [];

  if (search) {
    whereClause = "WHERE name LIKE ? OR episode_code LIKE ?";
    params.push(`%${search}%`, `%${search}%`);
  }

  const totalRow = await env.DB.prepare(`SELECT COUNT(*) AS total FROM episodes ${whereClause}`).bind(...params).first();
  const rows = await env.DB.prepare(`
    SELECT
      id,
      name,
      episode_code AS episodeCode,
      air_date AS airDate,
      character_count AS characterCount,
      updated_at AS updatedAt
    FROM episodes
    ${whereClause}
    ORDER BY id ASC
    LIMIT ? OFFSET ?
  `).bind(...params, pageSize, offset).all();

  const total = Number(totalRow?.total || 0);

  return {
    items: rows.results || [],
    pagination: {
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize)
    }
  };
}

async function listAdminLocations(env, requestUrl) {
  const page = Math.max(1, Number(requestUrl.searchParams.get("page") || "1"));
  const requestedPageSize = Number(requestUrl.searchParams.get("pageSize") || "24");
  const pageSize = Math.min(100, Math.max(1, requestedPageSize));
  const offset = (page - 1) * pageSize;
  const search = requestUrl.searchParams.get("search") || "";

  let whereClause = "";
  const params = [];

  if (search) {
    whereClause = "WHERE name LIKE ? OR type LIKE ? OR dimension LIKE ?";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const totalRow = await env.DB.prepare(`SELECT COUNT(*) AS total FROM locations ${whereClause}`).bind(...params).first();
  const rows = await env.DB.prepare(`
    SELECT
      id,
      name,
      type,
      dimension,
      resident_count AS residentCount,
      updated_at AS updatedAt
    FROM locations
    ${whereClause}
    ORDER BY id ASC
    LIMIT ? OFFSET ?
  `).bind(...params, pageSize, offset).all();

  const total = Number(totalRow?.total || 0);

  return {
    items: rows.results || [],
    pagination: {
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize)
    }
  };
}

function parseAiProfile(aiProfileJson) {
  if (!aiProfileJson) {
    return null;
  }

  try {
    return JSON.parse(aiProfileJson);
  } catch {
    return null;
  }
}

function clampNumber(value, min, max) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return Math.min(max, Math.max(min, value));
}

function ensureString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return value.trim();
}

function optionalTrimmedString(value, label, options = {}) {
  const {
    allowEmpty = true,
    maxLength = 200
  } = options;

  if (value == null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`${label} must be a string.`);
  }

  const next = value.trim();

  if (!allowEmpty && next.length === 0) {
    throw new Error(`${label} must not be empty.`);
  }

  if (next.length === 0) {
    return null;
  }

  if (next.length > maxLength) {
    throw new Error(`${label} must be at most ${maxLength} characters.`);
  }

  return next;
}

function optionalHttpUrl(value, label) {
  const next = optionalTrimmedString(value, label, { maxLength: 500 });

  if (!next) {
    return null;
  }

  try {
    const url = new URL(next);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("unsupported protocol");
    }
    return next;
  } catch {
    throw new Error(`${label} must be a valid http or https URL.`);
  }
}

function validateBaseContentPayload(payload, existingRow) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload must be a valid object.");
  }

  return {
    displayName: optionalTrimmedString(payload.displayName, "displayName", { allowEmpty: false, maxLength: 120 }) || existingRow.displayName,
    canonicalName: optionalTrimmedString(payload.canonicalName, "canonicalName", { allowEmpty: false, maxLength: 120 }) || existingRow.canonicalName,
    species: optionalTrimmedString(payload.species, "species", { maxLength: 80 }),
    type: optionalTrimmedString(payload.type, "type", { maxLength: 120 }),
    gender: optionalTrimmedString(payload.gender, "gender", { maxLength: 80 }),
    status: optionalTrimmedString(payload.status, "status", { maxLength: 80 }),
    imageUrl: optionalHttpUrl(payload.imageUrl, "imageUrl"),
    originName: optionalTrimmedString(payload.originName, "originName", { maxLength: 120 }),
    locationName: optionalTrimmedString(payload.locationName, "locationName", { maxLength: 120 })
  };
}

function validateDescriptionPayload(payload) {
  const summary = payload?.narrative_summary;

  if (typeof summary === "string") {
    const next = ensureString(summary, "narrative_summary");
    return {
      narrative_summary: {
        pt: next,
        en: next
      }
    };
  }

  return {
    narrative_summary: {
      pt: ensureString(summary?.pt, "narrative_summary.pt"),
      en: ensureString(summary?.en, "narrative_summary.en")
    }
  };
}

function validateCapacityPayload(payload) {
  const attributes = {};
  const reasoning = {};

  for (const key of CAPACITY_KEYS) {
    const score = clampNumber(Number(payload?.attributes?.[key]), 0, 100);

    if (score === null) {
      throw new Error(`attributes.${key} must be a number between 0 and 100.`);
    }

    attributes[key] = score;
    reasoning[key] = ensureString(payload?.attribute_reasoning?.[key], `attribute_reasoning.${key}`);
  }

  return {
    attributes,
    attribute_reasoning: reasoning
  };
}

function validateFieldEntries(entries, approvedSlugs, label, scoreKey) {
  if (!Array.isArray(entries)) {
    throw new Error(`${label} must be an array.`);
  }

  return entries.map((entry, index) => {
    const slug = ensureString(entry?.slug, `${label}[${index}].slug`);

    if (!approvedSlugs.includes(slug)) {
      throw new Error(`${label}[${index}].slug must be one of: ${approvedSlugs.join(", ")}.`);
    }

    const numeric = clampNumber(Number(entry?.[scoreKey]), 0, 100);
    const confidence = clampNumber(Number(entry?.confidence), 0, 1);

    if (numeric === null) {
      throw new Error(`${label}[${index}].${scoreKey} must be a number between 0 and 100.`);
    }

    if (confidence === null) {
      throw new Error(`${label}[${index}].confidence must be a number between 0 and 1.`);
    }

    return {
      slug,
      [scoreKey]: numeric,
      reason: ensureString(entry?.reason, `${label}[${index}].reason`),
      confidence
    };
  });
}

function validateFieldPayload(payload) {
  const evidence = Array.isArray(payload?.evidence_summary)
    ? payload.evidence_summary.map((item, index) => ensureString(item, `evidence_summary[${index}]`))
    : [];

  return {
    traits: validateFieldEntries(payload?.traits || [], APPROVED_TRAITS, "traits", "score"),
    weaknesses: validateFieldEntries(payload?.weaknesses || [], APPROVED_WEAKNESSES, "weaknesses", "score"),
    abilities: validateFieldEntries(payload?.abilities || [], APPROVED_ABILITIES, "abilities", "power_level"),
    evidence_summary: evidence
  };
}

function validateSectionPayload(section, payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload must be a valid object.");
  }

  if (section === "description") {
    return validateDescriptionPayload(payload);
  }

  if (section === "capacity") {
    return validateCapacityPayload(payload);
  }

  if (section === "field") {
    return validateFieldPayload(payload);
  }

  throw new Error("Unknown section.");
}

function buildEmptyAiProfile() {
  return {
    version: "v2",
    sections: {
      description: null,
      capacityAnalysis: null,
      fieldAnalysis: null
    }
  };
}

function normalizeAiProfile(aiProfileJson) {
  const parsed = parseAiProfile(aiProfileJson);
  if (!parsed) {
    return buildEmptyAiProfile();
  }

  if (parsed.sections) {
    return {
      version: parsed.version || "v2",
      sections: {
        description: parsed.sections.description || null,
        capacityAnalysis: parsed.sections.capacityAnalysis || null,
        fieldAnalysis: parsed.sections.fieldAnalysis || null
      }
    };
  }

  return {
    version: "v2",
    sections: {
      description: parsed.narrative_summary
        ? {
            source: "legacy",
            narrative_summary: {
              pt: parsed.narrative_summary,
              en: parsed.narrative_summary
            },
            updatedAt: null
          }
        : null,
      capacityAnalysis: parsed.attributes
        ? {
            source: "legacy",
            attributes: parsed.attributes,
            attribute_reasoning: parsed.attribute_reasoning || null,
            updatedAt: null
          }
        : null,
      fieldAnalysis: parsed.traits || parsed.weaknesses || parsed.abilities
        ? {
            source: "legacy",
            traits: parsed.traits || [],
            weaknesses: parsed.weaknesses || [],
            abilities: parsed.abilities || [],
            evidence_summary: parsed.evidence_summary || [],
            updatedAt: null
          }
        : null
    }
  };
}

function pruneAiGeneratedSections(aiProfileJson) {
  const profile = normalizeAiProfile(aiProfileJson);
  const next = buildEmptyAiProfile();

  for (const [key, value] of Object.entries(profile.sections || {})) {
    if (value && value.source !== "ai") {
      next.sections[key] = value;
    }
  }

  return next;
}

async function listAdminCharacters(env, requestUrl) {
  const page = Math.max(1, Number(requestUrl.searchParams.get("page") || "1"));
  const pageSize = Math.min(48, Math.max(1, Number(requestUrl.searchParams.get("pageSize") || "24")));
  const search = requestUrl.searchParams.get("search")?.trim() || "";
  const params = [];
  const clauses = [];

  if (search) {
    const normalized = `%${search.toLowerCase()}%`;
    clauses.push("(LOWER(display_name) LIKE ? OR LOWER(canonical_name) LIKE ?)");
    params.push(normalized, normalized);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const offset = (page - 1) * pageSize;
  const totalRow = await env.DB.prepare(`
    SELECT COUNT(*) AS total
    FROM characters
    ${whereSql}
  `).bind(...params).first();

  const rows = await env.DB.prepare(`
    SELECT
      id,
      display_name AS displayName,
      canonical_name AS canonicalName,
      species,
      type,
      gender,
      status,
      image_url AS imageUrl,
      origin_name AS originName,
      location_name AS locationName,
      ai_profile_json AS aiProfileJson,
      updated_at AS updatedAt
    FROM characters
    ${whereSql}
    ORDER BY display_name COLLATE NOCASE ASC
    LIMIT ? OFFSET ?
  `).bind(...params, pageSize, offset).all();

  const items = (rows.results || []).map((row) => {
    const profile = normalizeAiProfile(row.aiProfileJson);
    return {
      id: String(row.id),
      displayName: row.displayName,
      canonicalName: row.canonicalName,
      species: row.species,
      type: row.type,
      gender: row.gender,
      status: row.status,
      imageUrl: row.imageUrl,
      originName: row.originName,
      locationName: row.locationName,
      updatedAt: row.updatedAt,
      enrichment: {
        description: Boolean(profile.sections.description),
        capacityAnalysis: Boolean(profile.sections.capacityAnalysis),
        fieldAnalysis: Boolean(profile.sections.fieldAnalysis),
        fullyEnriched:
          Boolean(profile.sections.description) &&
          Boolean(profile.sections.capacityAnalysis) &&
          Boolean(profile.sections.fieldAnalysis)
      },
      aiProfile: profile
    };
  });

  return {
    items,
    pagination: {
      page,
      pageSize,
      total: Number(totalRow?.total || 0),
      totalPages: Number(totalRow?.total || 0) === 0 ? 0 : Math.ceil(Number(totalRow?.total || 0) / pageSize)
    }
  };
}

async function getCharacterRow(env, characterId) {
  return env.DB.prepare(`
    SELECT
      id,
      canonical_name AS canonicalName,
      display_name AS displayName,
      species,
      type,
      gender,
      status,
      image_url AS imageUrl,
      origin_name AS originName,
      location_name AS locationName,
      episode_count AS episodeCount,
      episode_urls_json AS episodeUrlsJson,
      ai_profile_json AS aiProfileJson
    FROM characters
    WHERE id = ?
    LIMIT 1
  `).bind(characterId).first();
}

function buildCharacterPromptContext(characterRow) {
  return JSON.stringify({
    id: String(characterRow.id),
    name: characterRow.displayName,
    canonical_name: characterRow.canonicalName,
    species: characterRow.species,
    type: characterRow.type,
    gender: characterRow.gender,
    status: characterRow.status,
    origin_name: characterRow.originName,
    location_name: characterRow.locationName,
    episode_count: Number(characterRow.episodeCount || 0),
    episode_urls: characterRow.episodeUrlsJson ? JSON.parse(characterRow.episodeUrlsJson) : []
  }, null, 2);
}

async function generateGeminiJson(env, systemInstruction, userPrompt) {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const baseUrl = normalizeBaseUrl(env.GEMINI_API_BASE_URL || DEFAULT_GEMINI_BASE_URL);
  const model = env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const response = await fetch(`${baseUrl}/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemInstruction}\n\n${userPrompt}`
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return JSON.parse(text);
}

function buildSectionPrompt(section, characterRow) {
  const context = buildCharacterPromptContext(characterRow);

  if (section === "description") {
    return {
      systemInstruction:
        "You write short character dossiers for the Interdimensional Intelligence layer of a Rick and Morty fan project. The narrator sounds clinical, dry and slightly mocking, but never goofy, never slang-heavy and never out of universe. Return valid JSON only.",
      userPrompt: [
        "Based only on the character context below, generate a concise Interdimensional Intelligence description in Portuguese and English.",
        "Write as if the portal itself is evaluating the character.",
        "Tone: dry, observant, mildly sarcastic, controlled, precise.",
        "Do not sound inspirational, cute, generic, or like a fandom wiki.",
        "Do not mention that this is AI-generated.",
        "Do not invent facts beyond the provided context.",
        "Each language should be 2 or 3 sentences, readable as an actual description, not bullet points.",
        "If the character is unstable, ridiculous, dangerous, pathetic, overconfident or unusually capable, the text may quietly hint at that with restrained mockery.",
        'Return exactly: {"narrative_summary":{"pt":"string","en":"string"}}',
        context
      ].join("\n\n")
    };
  }

  if (section === "capacity") {
    return {
      systemInstruction:
        "You evaluate combat game attributes for Rick and Morty characters. Return valid JSON only.",
      userPrompt: [
        "Generate only the capacity analysis section.",
        'Return exactly: {"attributes":{"caos":0,"sobrevivencia":0,"instabilidade":0,"genialidade":0,"influencia":0,"vitalidade":0},"attribute_reasoning":{"caos":"string","sobrevivencia":"string","instabilidade":"string","genialidade":"string","influencia":"string","vitalidade":"string"}}',
        "All numeric values must be between 0 and 100.",
        context
      ].join("\n\n")
    };
  }

  return {
    systemInstruction:
      "You generate field analysis for a Rick and Morty tactical game. Return valid JSON only.",
    userPrompt: [
      "Generate only the field analysis section.",
      `Traits allowed: ${APPROVED_TRAITS.join(", ")}.`,
      `Weaknesses allowed: ${APPROVED_WEAKNESSES.join(", ")}.`,
      `Abilities allowed: ${APPROVED_ABILITIES.join(", ")}.`,
      'Return exactly: {"traits":[{"slug":"initiative","score":0,"reason":"string","confidence":0.5}],"weaknesses":[{"slug":"fragile","score":0,"reason":"string","confidence":0.5}],"abilities":[{"slug":"first_strike_round_1","power_level":0,"reason":"string","confidence":0.5}],"evidence_summary":["string"]}',
      "Each confidence must be between 0 and 1. Each score/power_level must be between 0 and 100.",
      context
    ].join("\n\n")
  };
}

function applySectionToProfile(profile, section, sectionPayload, source) {
  const next = normalizeAiProfile(JSON.stringify(profile));
  const updatedAt = new Date().toISOString();

  if (section === "description") {
    next.sections.description = {
      source,
      narrative_summary:
        typeof sectionPayload.narrative_summary === "string"
          ? {
              pt: sectionPayload.narrative_summary,
              en: sectionPayload.narrative_summary
            }
          : {
              pt: sectionPayload.narrative_summary?.pt || "",
              en: sectionPayload.narrative_summary?.en || ""
            },
      updatedAt
    };
  }

  if (section === "capacity") {
    next.sections.capacityAnalysis = {
      source,
      attributes: sectionPayload.attributes,
      attribute_reasoning: sectionPayload.attribute_reasoning,
      updatedAt
    };
  }

  if (section === "field") {
    next.sections.fieldAnalysis = {
      source,
      traits: sectionPayload.traits || [],
      weaknesses: sectionPayload.weaknesses || [],
      abilities: sectionPayload.abilities || [],
      evidence_summary: sectionPayload.evidence_summary || [],
      updatedAt
    };
  }

  return next;
}

export async function onRequestGet(context) {
  const auth = ensureAdminSession(context.request, context.env, "viewer");

  if (!auth.ok) {
    return json({
      error: {
        code: auth.status === 401 ? "admin_auth_required" : "admin_forbidden",
        message: auth.status === 401 ? "Authenticate with Cloudflare Access first." : "Authenticated user is not authorized."
      },
      meta: meta()
    }, { status: auth.status });
  }

  if (!context.env.DB) {
    return json({
      error: {
        code: "missing_db_binding",
        message: "Cloudflare D1 binding 'DB' is not configured."
      },
      meta: meta()
    }, { status: 500 });
  }

  const path = parsePath(context);

  if (path.length === 1 && path[0] === "session") {
    return json({
      data: auth.session,
      meta: meta()
    });
  }

  if (path.length === 2 && path[0] === "votes" && path[1] === "summary") {
    await writeAuditLog(context.env, {
      actorEmail: auth.session.email,
      actorRole: auth.session.role,
      action: "admin.votes.summary.read",
      targetType: "character_votes",
      metadataJson: JSON.stringify({ route: "votes/summary" })
    });

    return json({
      data: await listVoteSummary(context.env),
      meta: meta()
    });
  }

  if (path.length === 1 && path[0] === "audit-logs") {
    await writeAuditLog(context.env, {
      actorEmail: auth.session.email,
      actorRole: auth.session.role,
      action: "admin.audit_logs.read",
      targetType: "audit_logs"
    });

    return json({
      data: await listAuditLogs(context.env, new URL(context.request.url)),
      meta: meta()
    });
  }

  if (path.length === 1 && path[0] === "characters") {
    return json({
      data: await listAdminCharacters(context.env, new URL(context.request.url)),
      meta: meta()
    });
  }

  if (path.length === 1 && path[0] === "episodes") {
    return json({
      data: await listAdminEpisodes(context.env, new URL(context.request.url)),
      meta: meta()
    });
  }

  if (path.length === 1 && path[0] === "locations") {
    return json({
      data: await listAdminLocations(context.env, new URL(context.request.url)),
      meta: meta()
    });
  }

  if (path.length === 1 && path[0] === "field-library") {
    return json({
      data: {
        traits: APPROVED_TRAITS,
        weaknesses: APPROVED_WEAKNESSES,
        abilities: APPROVED_ABILITIES
      },
      meta: meta()
    });
  }

  if (path.length === 2 && path[0] === "characters") {
    const character = await getCharacterRow(context.env, path[1]);

    if (!character) {
      return json({
        error: {
          code: "not_found",
          message: "Character not found."
        },
        meta: meta()
      }, { status: 404 });
    }

    return json({
      data: {
        ...character,
        id: String(character.id),
        aiProfile: normalizeAiProfile(character.aiProfileJson)
      },
      meta: meta()
    });
  }

  return json({
    error: {
      code: "not_found",
      message: "Admin route not found."
    },
    meta: meta()
  }, { status: 404 });
}

export async function onRequestPost(context) {
  const path = parsePath(context);
  const auth = ensureAdminSession(context.request, context.env, "admin");

  if (!auth.ok) {
    return json({
      error: {
        code: auth.status === 401 ? "admin_auth_required" : "admin_forbidden",
        message: auth.status === 401 ? "Authenticate with Cloudflare Access first." : "Authenticated user is not authorized."
      },
      meta: meta()
    }, { status: auth.status });
  }

  if (!context.env.DB) {
    return json({
      error: {
        code: "missing_db_binding",
        message: "Cloudflare D1 binding 'DB' is not configured."
      },
      meta: meta()
    }, { status: 500 });
  }

  if (path.length === 2 && path[0] === "characters" && path[1] === "import-public-api") {
    const body = await context.request.json().catch(() => ({}));
    const maxPages = body?.maxPages == null ? 1 : Number(body.maxPages);
    const startPage = body?.startPage == null ? 1 : Number(body.startPage);
    const upstreamBaseUrl = normalizeBaseUrl(context.env.RICK_AND_MORTY_API_BASE_URL);
    const now = new Date().toISOString();
    let nextUrl = `${upstreamBaseUrl}/character?page=${startPage}`;
    let pagesImported = 0;
    let recordsImported = 0;
    let nextPage = null;

    while (nextUrl) {
      if (!Number.isInteger(maxPages) || maxPages <= 0 || maxPages > 5 || !Number.isInteger(startPage) || startPage <= 0) {
        return json({
          error: {
            code: "invalid_input",
            message: "maxPages must be between 1 and 5 and startPage must be a positive integer."
          },
          meta: meta()
        }, { status: 400 });
      }

      if (pagesImported >= maxPages) {
        break;
      }

      const payload = await fetchJson(nextUrl);
      const characters = Array.isArray(payload.results) ? payload.results : [];

      if (characters.length > 0) {
        const skipExisting = Boolean(body?.skipExisting);
        
        await context.env.DB.batch(
          characters.map((character) =>
            context.env.DB.prepare(`
              INSERT INTO characters (
                id,
                canonical_name,
                display_name,
                canonical_kind,
                species,
                type,
                gender,
                status,
                image_url,
                origin_name,
                location_name,
                episode_count,
                source_name,
                source_id,
                source_url,
                episode_urls_json,
                ai_profile_json,
                created_at,
                updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                canonical_name = CASE WHEN ? THEN characters.canonical_name ELSE excluded.canonical_name END,
                display_name = CASE WHEN ? THEN characters.display_name ELSE excluded.display_name END,
                species = CASE WHEN ? THEN characters.species ELSE excluded.species END,
                status = CASE WHEN ? THEN characters.status ELSE excluded.status END,
                image_url = CASE WHEN ? THEN characters.image_url ELSE excluded.image_url END,
                episode_count = CASE WHEN ? THEN characters.episode_count ELSE excluded.episode_count END,
                updated_at = CASE WHEN ? THEN characters.updated_at ELSE excluded.updated_at END
            `).bind(
              String(character.id),
              character.name,
              character.name,
              "character",
              character.species || null,
              character.type || null,
              character.gender || null,
              character.status || null,
              character.image || null,
              character.origin?.name || null,
              character.location?.name || null,
              Array.isArray(character.episode) ? character.episode.length : 0,
              "rick_and_morty_public_api",
              String(character.id),
              character.url || `${upstreamBaseUrl}/character/${character.id}`,
              JSON.stringify(Array.isArray(character.episode) ? character.episode : []),
              null,
              now,
              now,
              // Bindings for the CASE WHEN skipExisting logic
              skipExisting, skipExisting, skipExisting, skipExisting, skipExisting, skipExisting, skipExisting
            )
          )
        );
      }

      pagesImported += 1;
      recordsImported += characters.length;
      nextUrl = payload.info?.next || null;
    }

    if (nextUrl) {
      try {
        nextPage = Number(new URL(nextUrl).searchParams.get("page") || "0") || null;
      } catch {
        nextPage = null;
      }
    }

    await writeAuditLog(context.env, {
      actorEmail: auth.session.email,
      actorRole: auth.session.role,
      action: "admin.characters.import_public_api",
      targetType: "characters",
      metadataJson: JSON.stringify({ pagesImported, recordsImported, maxPages, startPage, nextPage })
    });

    return json({
      data: {
        source: "rick_and_morty_public_api",
        pagesImported,
        recordsImported,
        batchMode: true,
        maxPages,
        startPage,
        nextPage
      },
      meta: meta()
    });
  }

  if (path.length === 2 && path[0] === "episodes" && path[1] === "import-public-api") {
    const body = await context.request.json().catch(() => ({}));
    const upstreamBaseUrl = normalizeBaseUrl(context.env.RICK_AND_MORTY_API_BASE_URL);
    const now = new Date().toISOString();

    try {
      const result = await importPublicPaginatedResource({
        env: context.env,
        upstreamBaseUrl,
        resourceName: "episode",
        body,
        mapStatements: (episodes) =>
          episodes.map((episode) =>
            context.env.DB.prepare(`
              INSERT INTO episodes (
                id,
                name,
                episode_code,
                air_date,
                character_count,
                source_name,
                source_id,
                source_url,
                character_urls_json,
                created_at,
                updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                episode_code = excluded.episode_code,
                air_date = excluded.air_date,
                character_count = excluded.character_count,
                source_url = excluded.source_url,
                character_urls_json = excluded.character_urls_json,
                updated_at = excluded.updated_at
            `).bind(
              String(episode.id),
              episode.name || `Episode ${episode.id}`,
              episode.episode || null,
              episode.air_date || null,
              Array.isArray(episode.characters) ? episode.characters.length : 0,
              "rick_and_morty_public_api",
              String(episode.id),
              episode.url || `${upstreamBaseUrl}/episode/${episode.id}`,
              JSON.stringify(Array.isArray(episode.characters) ? episode.characters : []),
              now,
              now
            )
          )
      });

      await writeAuditLog(context.env, {
        actorEmail: auth.session.email,
        actorRole: auth.session.role,
        action: "admin.episodes.import_public_api",
        targetType: "episodes",
        metadataJson: JSON.stringify(result)
      });

      return json({
        data: {
          source: "rick_and_morty_public_api",
          ...result
        },
        meta: meta()
      });
    } catch (error) {
      return json({
        error: {
          code: "import_failed",
          message: error instanceof Error ? error.message : "Episode import failed."
        },
        meta: meta()
      }, { status: 400 });
    }
  }

  if (path.length === 2 && path[0] === "locations" && path[1] === "import-public-api") {
    const body = await context.request.json().catch(() => ({}));
    const upstreamBaseUrl = normalizeBaseUrl(context.env.RICK_AND_MORTY_API_BASE_URL);
    const now = new Date().toISOString();

    try {
      const result = await importPublicPaginatedResource({
        env: context.env,
        upstreamBaseUrl,
        resourceName: "location",
        body,
        mapStatements: (locations) =>
          locations.map((location) =>
            context.env.DB.prepare(`
              INSERT INTO locations (
                id,
                name,
                type,
                dimension,
                resident_count,
                source_name,
                source_id,
                source_url,
                resident_urls_json,
                created_at,
                updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                type = excluded.type,
                dimension = excluded.dimension,
                resident_count = excluded.resident_count,
                source_url = excluded.source_url,
                resident_urls_json = excluded.resident_urls_json,
                updated_at = excluded.updated_at
            `).bind(
              String(location.id),
              location.name || `Location ${location.id}`,
              location.type || null,
              location.dimension || null,
              Array.isArray(location.residents) ? location.residents.length : 0,
              "rick_and_morty_public_api",
              String(location.id),
              location.url || `${upstreamBaseUrl}/location/${location.id}`,
              JSON.stringify(Array.isArray(location.residents) ? location.residents : []),
              now,
              now
            )
          )
      });

      await writeAuditLog(context.env, {
        actorEmail: auth.session.email,
        actorRole: auth.session.role,
        action: "admin.locations.import_public_api",
        targetType: "locations",
        metadataJson: JSON.stringify(result)
      });

      return json({
        data: {
          source: "rick_and_morty_public_api",
          ...result
        },
        meta: meta()
      });
    } catch (error) {
      return json({
        error: {
          code: "import_failed",
          message: error instanceof Error ? error.message : "Location import failed."
        },
        meta: meta()
      }, { status: 400 });
    }
  }

  if (path.length === 3 && path[0] === "characters" && path[2] === "ai-profile") {
    const characterId = String(path[1]);
    const body = await context.request.json().catch(() => ({}));
    const aiProfile = body?.aiProfile;

    if (!aiProfile || typeof aiProfile !== "object") {
      return json({
        error: {
          code: "invalid_input",
          message: "Provide a valid aiProfile object."
        },
        meta: meta()
      }, { status: 400 });
    }

    const now = new Date().toISOString();
    await context.env.DB.prepare(`
      UPDATE characters
      SET ai_profile_json = ?, updated_at = ?
      WHERE id = ?
    `).bind(JSON.stringify(aiProfile), now, characterId).run();

    await writeAuditLog(context.env, {
      actorEmail: auth.session.email,
      actorRole: auth.session.role,
      action: "admin.characters.ai_profile.update",
      targetType: "characters",
      targetId: characterId,
      metadataJson: JSON.stringify({ aiProfile })
    });

    return json({
      data: { characterId, aiProfile, updatedAt: now },
      meta: meta()
    });
  }

  if (path.length === 3 && path[0] === "characters" && path[2] === "reset-ai") {
    const characterId = String(path[1]);
    const existingRow = await getCharacterRow(context.env, characterId);

    if (!existingRow) {
      return json({
        error: {
          code: "not_found",
          message: "Character not found."
        },
        meta: meta()
      }, { status: 404 });
    }

    const nextProfile = pruneAiGeneratedSections(existingRow.aiProfileJson);
    const now = new Date().toISOString();

    await context.env.DB.prepare(`
      UPDATE characters
      SET ai_profile_json = ?, updated_at = ?
      WHERE id = ?
    `).bind(JSON.stringify(nextProfile), now, characterId).run();

    await writeAuditLog(context.env, {
      actorEmail: auth.session.email,
      actorRole: auth.session.role,
      action: "admin.characters.ai_profile.reset_generated",
      targetType: "characters",
      targetId: characterId,
      metadataJson: JSON.stringify({
        preservedManualSections: Object.entries(nextProfile.sections)
          .filter(([, value]) => value && value.source === "manual")
          .map(([key]) => key)
      })
    });

    return json({
      data: {
        characterId,
        aiProfile: nextProfile,
        updatedAt: now
      },
      meta: meta()
    });
  }

  if (path.length === 3 && path[0] === "characters" && path[2] === "base-content") {
    const characterId = String(path[1]);
    const body = await context.request.json().catch(() => ({}));
    const existingRow = await getCharacterRow(context.env, characterId);

    if (!existingRow) {
      return json({
        error: {
          code: "not_found",
          message: "Character not found."
        },
        meta: meta()
      }, { status: 404 });
    }

    let sanitizedPayload;

    try {
      sanitizedPayload = validateBaseContentPayload(body?.payload, existingRow);
    } catch (error) {
      return json({
        error: {
          code: "invalid_input",
          message: error instanceof Error ? error.message : "Invalid base content payload."
        },
        meta: meta()
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    await context.env.DB.prepare(`
      UPDATE characters
      SET
        display_name = ?,
        canonical_name = ?,
        species = ?,
        type = ?,
        gender = ?,
        status = ?,
        image_url = ?,
        origin_name = ?,
        location_name = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      sanitizedPayload.displayName,
      sanitizedPayload.canonicalName,
      sanitizedPayload.species,
      sanitizedPayload.type,
      sanitizedPayload.gender,
      sanitizedPayload.status,
      sanitizedPayload.imageUrl,
      sanitizedPayload.originName,
      sanitizedPayload.locationName,
      now,
      characterId
    ).run();

    await writeAuditLog(context.env, {
      actorEmail: auth.session.email,
      actorRole: auth.session.role,
      action: "admin.characters.base_content.update",
      targetType: "characters",
      targetId: characterId,
      metadataJson: JSON.stringify({
        payload: sanitizedPayload
      })
    });

    return json({
      data: {
        characterId,
        baseContent: sanitizedPayload,
        updatedAt: now
      },
      meta: meta()
    });
  }

  if (path.length === 3 && path[0] === "characters" && path[2] === "manual-enrich") {
    const characterId = String(path[1]);
    const body = await context.request.json().catch(() => ({}));
    const section = String(body?.section || "");
    const payload = body?.payload;
    const existingRow = await getCharacterRow(context.env, characterId);

    if (!existingRow) {
      return json({
        error: {
          code: "not_found",
          message: "Character not found."
        },
        meta: meta()
      }, { status: 404 });
    }

    if (!["description", "capacity", "field"].includes(section) || !payload || typeof payload !== "object") {
      return json({
        error: {
          code: "invalid_input",
          message: "Provide section (description, capacity, field) and a valid payload object."
        },
        meta: meta()
      }, { status: 400 });
    }

    let sanitizedPayload;

    try {
      sanitizedPayload = validateSectionPayload(section, payload);
    } catch (error) {
      return json({
        error: {
          code: "invalid_input",
          message: error instanceof Error ? error.message : "Invalid enrichment payload."
        },
        meta: meta()
      }, { status: 400 });
    }

    const nextProfile = applySectionToProfile(normalizeAiProfile(existingRow.aiProfileJson), section, sanitizedPayload, "manual");
    const now = new Date().toISOString();

    await context.env.DB.prepare(`
      UPDATE characters
      SET ai_profile_json = ?, updated_at = ?
      WHERE id = ?
    `).bind(JSON.stringify(nextProfile), now, characterId).run();

    await writeAuditLog(context.env, {
      actorEmail: auth.session.email,
      actorRole: auth.session.role,
      action: `admin.characters.manual_enrich.${section}`,
      targetType: "characters",
      targetId: characterId,
      metadataJson: JSON.stringify({ section, payload: sanitizedPayload })
    });

    return json({
      data: {
        characterId,
        aiProfile: nextProfile,
        updatedAt: now
      },
      meta: meta()
    });
  }

  if (path.length === 3 && path[0] === "characters" && path[2] === "enrich") {
    const characterId = String(path[1]);
    const body = await context.request.json().catch(() => ({}));
    const section = String(body?.section || "all");
    const existingRow = await getCharacterRow(context.env, characterId);

    if (!existingRow) {
      return json({
        error: {
          code: "not_found",
          message: "Character not found."
        },
        meta: meta()
      }, { status: 404 });
    }

    const sections = section === "all" ? ["description", "capacity", "field"] : [section];
    const allowedSections = ["description", "capacity", "field"];

    if (!sections.every((item) => allowedSections.includes(item))) {
      return json({
        error: {
          code: "invalid_input",
          message: "section must be description, capacity, field or all."
        },
        meta: meta()
      }, { status: 400 });
    }

    let nextProfile = normalizeAiProfile(existingRow.aiProfileJson);

    for (const currentSection of sections) {
      const prompt = buildSectionPrompt(currentSection, existingRow);
      const generated = await generateGeminiJson(context.env, prompt.systemInstruction, prompt.userPrompt);
      const sanitized = validateSectionPayload(currentSection, generated);
      nextProfile = applySectionToProfile(nextProfile, currentSection, sanitized, "ai");
    }

    const now = new Date().toISOString();
    await context.env.DB.prepare(`
      UPDATE characters
      SET ai_profile_json = ?, updated_at = ?
      WHERE id = ?
    `).bind(JSON.stringify(nextProfile), now, characterId).run();

    await writeAuditLog(context.env, {
      actorEmail: auth.session.email,
      actorRole: auth.session.role,
      action: `admin.characters.enrich.${section}`,
      targetType: "characters",
      targetId: characterId,
      metadataJson: JSON.stringify({ section })
    });

    return json({
      data: {
        characterId,
        aiProfile: nextProfile,
        updatedAt: now
      },
      meta: meta()
    });
  }

  if (path.length === 3 && path[0] === "votes" && path[1] === "override") {
    const characterId = String(path[2]);
    const body = await context.request.json();
    const likes = Number(body?.likes);
    const dislikes = Number(body?.dislikes);
    const reason = String(body?.reason || "").trim();

    if (!Number.isInteger(likes) || likes < 0 || !Number.isInteger(dislikes) || dislikes < 0 || reason.length < 8) {
      return json({
        error: {
          code: "invalid_input",
          message: "Provide non-negative integer totals and a reason with at least 8 characters."
        },
        meta: meta()
      }, { status: 400 });
    }

    const now = new Date().toISOString();
    const result = await context.env.DB.prepare(`
      INSERT INTO character_votes (
        character_id,
        likes,
        dislikes,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(character_id) DO UPDATE SET
        likes = excluded.likes,
        dislikes = excluded.dislikes,
        updated_at = excluded.updated_at
      RETURNING character_id AS characterId, likes, dislikes, updated_at AS updatedAt
    `).bind(characterId, likes, dislikes, now, now).first();

    await writeAuditLog(context.env, {
      actorEmail: auth.session.email,
      actorRole: auth.session.role,
      action: "admin.votes.override",
      targetType: "character_votes",
      targetId: characterId,
      metadataJson: JSON.stringify({ likes, dislikes, reason })
    });

    return json({
      data: result,
      meta: meta()
    });
  }

  return json({
    error: {
      code: "not_found",
      message: "Admin route not found."
    },
    meta: meta()
  }, { status: 404 });
}
