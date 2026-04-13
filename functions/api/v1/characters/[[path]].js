const DEFAULT_UPSTREAM_BASE_URL = "https://rickandmortyapi.com/api";

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
}

function buildMeta() {
  return {
    requestId: crypto.randomUUID(),
    timestamp: new Date().toISOString()
  };
}

function normalizeBaseUrl(baseUrl) {
  return (baseUrl || DEFAULT_UPSTREAM_BASE_URL).replace(/\/+$/, "");
}

function getUpstreamBaseUrl(env) {
  return normalizeBaseUrl(env.RICK_AND_MORTY_API_BASE_URL);
}

function mapUpstreamCharacter(item, votes = {}) {
  return {
    id: String(item.id),
    canonicalName: item.name,
    displayName: item.name,
    canonicalKind: "character",
    species: item.species || null,
    type: item.type || null,
    gender: item.gender || null,
    status: item.status || null,
    imageUrl: item.image || null,
    identityConfidence: 1,
    isVariant: false,
    isFusion: false,
    isAliasOnly: false,
    isActive: true,
    origin: {
      locationName: item.origin?.name || null,
      dimensionLabel: null
    },
    location: {
      locationName: item.location?.name || null,
      dimensionLabel: null
    },
    episodeCount: Array.isArray(item.episode) ? item.episode.length : 0,
    likes: votes.likes || 0,
    dislikes: votes.dislikes || 0,
    hasAiProfile: false,
    primarySource: {
      sourceName: "rick_and_morty_public_api",
      sourceId: String(item.id),
      sourceUrl: item.url || `${DEFAULT_UPSTREAM_BASE_URL}/character/${item.id}`
    },
    firstSeenIn: null,
    createdAt: null,
    updatedAt: null
  };
}

function mapStoredCharacter(row, votes = {}) {
  const episodeUrls = row.episodeUrlsJson ? JSON.parse(row.episodeUrlsJson) : [];
  const aiProfile = row.aiProfileJson ? JSON.parse(row.aiProfileJson) : null;
  const normalizedAiProfile = aiProfile?.sections
    ? {
        ...aiProfile,
        narrative_summary: aiProfile.sections.description?.narrative_summary || null,
        attributes: aiProfile.sections.capacityAnalysis?.attributes || null,
        attribute_reasoning: aiProfile.sections.capacityAnalysis?.attribute_reasoning || null,
        traits: aiProfile.sections.fieldAnalysis?.traits || [],
        weaknesses: aiProfile.sections.fieldAnalysis?.weaknesses || [],
        abilities: aiProfile.sections.fieldAnalysis?.abilities || [],
        evidence_summary: aiProfile.sections.fieldAnalysis?.evidence_summary || []
      }
    : aiProfile;

  return {
    id: String(row.id),
    canonicalName: row.canonicalName,
    displayName: row.displayName,
    canonicalKind: row.canonicalKind,
    species: row.species,
    type: row.type,
    gender: row.gender,
    status: row.status,
    imageUrl: row.imageUrl,
    identityConfidence: 1,
    isVariant: false,
    isFusion: false,
    isAliasOnly: false,
    isActive: true,
    origin: {
      locationName: row.originName,
      dimensionLabel: null
    },
    location: {
      locationName: row.locationName,
      dimensionLabel: null
    },
    episodeCount: Number(row.episodeCount || 0),
    likes: votes.likes || 0,
    dislikes: votes.dislikes || 0,
    hasAiProfile: Boolean(
      normalizedAiProfile?.sections
        ? normalizedAiProfile.sections.description ||
            normalizedAiProfile.sections.capacityAnalysis ||
            normalizedAiProfile.sections.fieldAnalysis
        : normalizedAiProfile
    ),
    primarySource: {
      sourceName: row.sourceName,
      sourceId: row.sourceId,
      sourceUrl: row.sourceUrl
    },
    firstSeenIn: null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    episodes: episodeUrls.map((sourceUrl) => ({ sourceUrl })),
    evidences: [],
    aiProfile: normalizedAiProfile
  };
}

function serializeCatalogItem(item) {
  return {
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
    isVariant: item.isVariant,
    isFusion: item.isFusion,
    isAliasOnly: item.isAliasOnly,
    isActive: item.isActive,
    origin: item.origin,
    location: item.location,
    episodeCount: item.episodeCount,
    likes: item.likes,
    dislikes: item.dislikes,
    hasAiProfile: item.hasAiProfile,
    primarySource: item.primarySource,
    updatedAt: item.updatedAt
  };
}

async function hydrateEpisodeReferences(env, episodes) {
  if (!env.DB || !Array.isArray(episodes) || episodes.length === 0) {
    return episodes;
  }

  const refs = episodes
    .map((episode) => String(episode.sourceUrl || "").trim())
    .filter(Boolean);

  if (refs.length === 0) {
    return episodes;
  }

  const results = await env.DB.batch(
    refs.map((sourceUrl) =>
      env.DB.prepare(`
        SELECT
          source_url AS sourceUrl,
          name,
          episode_code AS code
        FROM episodes
        WHERE source_url = ?
        LIMIT 1
      `).bind(sourceUrl)
    )
  );

  const byUrl = new Map();

  for (const row of results) {
    const item = row.results?.[0];
    if (item?.sourceUrl) {
      byUrl.set(String(item.sourceUrl), item);
    }
  }

  return episodes.map((episode) => {
    const hydrated = byUrl.get(String(episode.sourceUrl || ""));
    return hydrated
      ? {
          sourceUrl: hydrated.sourceUrl,
          code: hydrated.code,
          name: hydrated.name
        }
      : episode;
  });
}

async function hasStoredCharacters(env) {
  if (!env.DB) {
    return false;
  }

  try {
    const row = await env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM characters
    `).first();

    return Number(row?.total || 0) > 0;
  } catch {
    return false;
  }
}

async function getVoteByCharacterId(env, characterId) {
  if (!env.DB) {
    return { likes: 0, dislikes: 0 };
  }

  const row = await env.DB.prepare(`
    SELECT likes, dislikes
    FROM character_votes
    WHERE character_id = ?
    LIMIT 1
  `).bind(characterId).first();

  return {
    likes: Number(row?.likes || 0),
    dislikes: Number(row?.dislikes || 0)
  };
}

async function getVotesMap(env, characterIds) {
  if (!env.DB || characterIds.length === 0) {
    return new Map();
  }

  const results = await env.DB.batch(
    characterIds.map((characterId) =>
      env.DB.prepare(`
        SELECT character_id, likes, dislikes
        FROM character_votes
        WHERE character_id = ?
        LIMIT 1
      `).bind(characterId)
    )
  );

  const votesMap = new Map();

  for (const row of results) {
    if (!row.results?.length) {
      continue;
    }

    const vote = row.results[0];
    votesMap.set(String(vote.character_id), {
      likes: Number(vote.likes || 0),
      dislikes: Number(vote.dislikes || 0)
    });
  }

  return votesMap;
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

async function listCharactersFromDb(env, requestUrl) {
  const page = Math.max(1, Number(requestUrl.searchParams.get("page") || "1"));
  const requestedPageSize = Number(requestUrl.searchParams.get("pageSize") || "20");
  const pageSize = Math.min(100, Math.max(1, requestedPageSize));
  const search = requestUrl.searchParams.get("search")?.trim() || "";
  const species = requestUrl.searchParams.get("species")?.trim() || "";
  const offset = (page - 1) * pageSize;
  const clauses = [];
  const params = [];

  if (search) {
    const searchParam = `%${search.toLowerCase()}%`;
    clauses.push("(LOWER(display_name) LIKE ? OR LOWER(canonical_name) LIKE ?)");
    params.push(searchParam, searchParam);
  }

  if (species) {
    clauses.push("species = ?");
    params.push(species);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const totalRow = await env.DB.prepare(`
    SELECT COUNT(*) AS total
    FROM characters
    ${whereSql}
  `).bind(...params).first();

  const rows = await env.DB.prepare(`
    SELECT
      id,
      canonical_name AS canonicalName,
      display_name AS displayName,
      canonical_kind AS canonicalKind,
      species,
      type,
      gender,
      status,
      image_url AS imageUrl,
      origin_name AS originName,
      location_name AS locationName,
      episode_count AS episodeCount,
      source_name AS sourceName,
      source_id AS sourceId,
      source_url AS sourceUrl,
      episode_urls_json AS episodeUrlsJson,
      ai_profile_json AS aiProfileJson,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM characters
    ${whereSql}
    ORDER BY display_name COLLATE NOCASE ASC
    LIMIT ? OFFSET ?
  `).bind(...params, pageSize, offset).all();

  const voteIds = (rows.results || []).map((row) => String(row.id));
  const votesMap = await getVotesMap(env, voteIds);
  const items = (rows.results || []).map((row) => mapStoredCharacter(row, votesMap.get(String(row.id))));
  const total = Number(totalRow?.total || 0);

  return {
    data: {
      items: items.map(serializeCatalogItem),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize)
      },
      filters: {
        page,
        pageSize,
        search: search || undefined,
        species: species || undefined
      }
    },
    meta: buildMeta()
  };
}

async function listRandomCharactersFromDb(env, requestUrl) {
  const requestedCount = Number(requestUrl.searchParams.get("count") || "16");
  const count = Math.min(64, Math.max(1, requestedCount));
  const species = requestUrl.searchParams.get("species")?.trim() || "";
  const clauses = [];
  const params = [];

  if (species) {
    clauses.push("species = ?");
    params.push(species);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const rows = await env.DB.prepare(`
    SELECT
      id,
      canonical_name AS canonicalName,
      display_name AS displayName,
      canonical_kind AS canonicalKind,
      species,
      type,
      gender,
      status,
      image_url AS imageUrl,
      origin_name AS originName,
      location_name AS locationName,
      episode_count AS episodeCount,
      source_name AS sourceName,
      source_id AS sourceId,
      source_url AS sourceUrl,
      episode_urls_json AS episodeUrlsJson,
      ai_profile_json AS aiProfileJson,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM characters
    ${whereSql}
    ORDER BY RANDOM()
    LIMIT ?
  `).bind(...params, count).all();

  const voteIds = (rows.results || []).map((row) => String(row.id));
  const votesMap = await getVotesMap(env, voteIds);
  const items = (rows.results || []).map((row) => mapStoredCharacter(row, votesMap.get(String(row.id))));

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
        likes: item.likes,
        dislikes: item.dislikes,
        hasAiProfile: item.hasAiProfile,
        isVariant: item.isVariant,
        isActive: item.isActive
      })),
      count: items.length,
      eligibleOnly: true,
      species: species || undefined
    },
    meta: buildMeta()
  };
}

async function getCharacterDetailFromDb(env, characterId) {
  const row = await env.DB.prepare(`
    SELECT
      id,
      canonical_name AS canonicalName,
      display_name AS displayName,
      canonical_kind AS canonicalKind,
      species,
      type,
      gender,
      status,
      image_url AS imageUrl,
      origin_name AS originName,
      location_name AS locationName,
      episode_count AS episodeCount,
      source_name AS sourceName,
      source_id AS sourceId,
      source_url AS sourceUrl,
      episode_urls_json AS episodeUrlsJson,
      ai_profile_json AS aiProfileJson,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM characters
    WHERE id = ?
    LIMIT 1
  `).bind(characterId).first();

  if (!row) {
    return null;
  }

  const votes = await getVoteByCharacterId(env, String(row.id));
  const item = mapStoredCharacter(row, votes);
  item.episodes = await hydrateEpisodeReferences(env, item.episodes);
  item.firstSeenIn = item.episodes?.[0]
    ? {
        code: item.episodes[0].code || null,
        name: item.episodes[0].name || null
      }
    : null;

  return {
    data: item,
    meta: buildMeta()
  };
}

async function getRandomCharacterFromDb(env) {
  const row = await env.DB.prepare(`
    SELECT
      id,
      canonical_name AS canonicalName,
      display_name AS displayName,
      canonical_kind AS canonicalKind,
      species,
      type,
      gender,
      status,
      image_url AS imageUrl,
      origin_name AS originName,
      location_name AS locationName,
      episode_count AS episodeCount,
      source_name AS sourceName,
      source_id AS sourceId,
      source_url AS sourceUrl,
      episode_urls_json AS episodeUrlsJson,
      ai_profile_json AS aiProfileJson,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM characters
    ORDER BY RANDOM()
    LIMIT 1
  `).first();

  if (!row) {
    return null;
  }

  const votes = await getVoteByCharacterId(env, String(row.id));
  const item = mapStoredCharacter(row, votes);

  return {
    data: item,
    meta: buildMeta()
  };
}

async function fetchCharactersFromUpstream(env, requestUrl) {
  const upstreamBaseUrl = getUpstreamBaseUrl(env);
  const page = requestUrl.searchParams.get("page") || "1";
  const upstreamUrl = new URL(`${upstreamBaseUrl}/character`);
  upstreamUrl.searchParams.set("page", page);

  const payload = await fetchJson(upstreamUrl.toString());
  const results = Array.isArray(payload.results) ? payload.results : [];
  const ids = results.map((item) => String(item.id));
  const votesMap = await getVotesMap(env, ids);

  const items = results.map((item) => mapUpstreamCharacter(item, votesMap.get(String(item.id))));

  return {
    data: {
      items,
      pagination: {
        page: Number(payload.info?.prev ? page : page),
        pageSize: items.length,
        total: Number(payload.info?.count || items.length),
        totalPages: Number(payload.info?.pages || 1)
      },
      filters: {
        page: Number(page),
        pageSize: items.length
      }
    },
    meta: buildMeta()
  };
}

async function fetchCharacterDetailFromUpstream(env, characterId) {
  const upstreamBaseUrl = getUpstreamBaseUrl(env);
  const payload = await fetchJson(`${upstreamBaseUrl}/character/${characterId}`);
  const votes = await getVoteByCharacterId(env, String(payload.id));
  const firstEpisodeUrl = Array.isArray(payload.episode) ? payload.episode[0] : null;
  let firstSeenIn = null;

  if (firstEpisodeUrl) {
    try {
      const episodePayload = await fetchJson(firstEpisodeUrl);
      firstSeenIn = {
        code: episodePayload.episode || null,
        name: episodePayload.name || null
      };
    } catch {
      firstSeenIn = null;
    }
  }

  return {
    data: {
      ...mapUpstreamCharacter(payload, votes),
      episodes: Array.isArray(payload.episode)
        ? payload.episode.map((episodeUrl) => ({
            sourceUrl: episodeUrl
          }))
        : [],
      firstSeenIn,
      evidences: [],
      aiProfile: null
    },
    meta: buildMeta()
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

export async function onRequestGet(context) {
  const path = parsePath(context);

  try {
    if (await hasStoredCharacters(context.env)) {
      if (path.length === 0) {
        return json(await listCharactersFromDb(context.env, new URL(context.request.url)));
      }

      if (path.length === 1 && path[0] === "random") {
        return json(await listRandomCharactersFromDb(context.env, new URL(context.request.url)));
      }

      if (path.length === 1) {
        const detail = await getCharacterDetailFromDb(context.env, path[0]);

        if (!detail) {
          return json({
            error: {
              code: "not_found",
              message: "Character not found."
            },
            meta: buildMeta()
          }, { status: 404 });
        }

        return json(detail);
      }
    }

    if (path.length === 0) {
      return json(await fetchCharactersFromUpstream(context.env, new URL(context.request.url)));
    }

    if (path.length === 1) {
      return json(await fetchCharacterDetailFromUpstream(context.env, path[0]));
    }

    return json({
      error: {
        code: "not_found",
        message: "Route not found."
      },
      meta: buildMeta()
    }, { status: 404 });
  } catch (error) {
    return json({
      error: {
        code: "upstream_error",
        message: error instanceof Error ? error.message : "Unexpected upstream error."
      },
      meta: buildMeta()
    }, { status: 502 });
  }
}

export async function onRequestPost(context) {
  const path = parsePath(context);

  if (path.length !== 2 || path[1] !== "vote") {
    return json({
      error: {
        code: "not_found",
        message: "Route not found."
      },
      meta: buildMeta()
    }, { status: 404 });
  }

  if (!context.env.DB) {
    return json({
      error: {
        code: "missing_db_binding",
        message: "Cloudflare D1 binding 'DB' is not configured."
      },
      meta: buildMeta()
    }, { status: 500 });
  }

  const body = await context.request.json();
  const likesDelta = Number.isInteger(body?.likes) ? body.likes : 0;
  const dislikesDelta = Number.isInteger(body?.dislikes) ? body.dislikes : 0;
  const sync = Boolean(body?.sync);
  const characterId = String(path[0]);
  const now = new Date().toISOString();

  try {
    const result = await context.env.DB.prepare(`
      INSERT INTO character_votes (
        character_id,
        likes,
        dislikes,
        created_at,
        updated_at
      )
      VALUES (
        ?1,
        MAX(0, ?2),
        MAX(0, ?3),
        ?4,
        ?4
      )
      ON CONFLICT(character_id) DO UPDATE SET
        likes = MAX(0, character_votes.likes + ?2),
        dislikes = MAX(0, character_votes.dislikes + ?3),
        updated_at = ?4
      RETURNING character_id, likes, dislikes, updated_at
    `).bind(characterId, likesDelta, dislikesDelta, now).first();

    return json({
      data: {
        id: String(result.character_id),
        likes: Number(result.likes || 0),
        dislikes: Number(result.dislikes || 0),
        updatedAt: result.updated_at,
        sync
      },
      meta: buildMeta()
    });
  } catch (error) {
    return json({
      error: {
        code: "vote_update_failed",
        message: error instanceof Error ? error.message : "Failed to persist vote."
      },
      meta: buildMeta()
    }, { status: 500 });
  }
}
