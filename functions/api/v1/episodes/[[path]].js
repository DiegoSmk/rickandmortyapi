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

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Upstream request failed with status ${response.status}`);
  }

  return response.json();
}

async function hasStoredEpisodes(env) {
  if (!env.DB) {
    return false;
  }

  try {
    const row = await env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM episodes
    `).first();

    return Number(row?.total || 0) > 0;
  } catch {
    return false;
  }
}

function mapStoredEpisode(row) {
  const characterUrls = row.characterUrlsJson ? JSON.parse(row.characterUrlsJson) : [];

  return {
    id: String(row.id),
    name: row.name,
    episode: row.episodeCode,
    air_date: row.airDate,
    characterCount: Number(row.characterCount || 0),
    characters: characterUrls.map((sourceUrl) => ({ sourceUrl })),
    primarySource: {
      sourceName: row.sourceName,
      sourceId: row.sourceId,
      sourceUrl: row.sourceUrl
    },
    updatedAt: row.updatedAt
  };
}

function mapUpstreamEpisode(item) {
  return {
    id: String(item.id),
    name: item.name,
    episode: item.episode,
    air_date: item.air_date || null,
    characterCount: Array.isArray(item.characters) ? item.characters.length : 0,
    characters: Array.isArray(item.characters) ? item.characters.map((sourceUrl) => ({ sourceUrl })) : [],
    primarySource: {
      sourceName: "rick_and_morty_public_api",
      sourceId: String(item.id),
      sourceUrl: item.url || `${DEFAULT_UPSTREAM_BASE_URL}/episode/${item.id}`
    },
    updatedAt: null
  };
}

async function listEpisodesFromDb(env, requestUrl) {
  const page = Math.max(1, Number(requestUrl.searchParams.get("page") || "1"));
  const requestedPageSize = Number(requestUrl.searchParams.get("pageSize") || "20");
  const pageSize = Math.min(100, Math.max(1, requestedPageSize));
  const search = requestUrl.searchParams.get("search")?.trim() || "";
  const offset = (page - 1) * pageSize;
  const clauses = [];
  const params = [];

  if (search) {
    const searchParam = `%${search.toLowerCase()}%`;
    clauses.push("(LOWER(name) LIKE ? OR LOWER(episode_code) LIKE ?)");
    params.push(searchParam, searchParam);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const totalRow = await env.DB.prepare(`
    SELECT COUNT(*) AS total
    FROM episodes
    ${whereSql}
  `).bind(...params).first();

  const rows = await env.DB.prepare(`
    SELECT
      id,
      name,
      episode_code AS episodeCode,
      air_date AS airDate,
      character_count AS characterCount,
      source_name AS sourceName,
      source_id AS sourceId,
      source_url AS sourceUrl,
      character_urls_json AS characterUrlsJson,
      updated_at AS updatedAt
    FROM episodes
    ${whereSql}
    ORDER BY id ASC
    LIMIT ? OFFSET ?
  `).bind(...params, pageSize, offset).all();

  const items = (rows.results || []).map(mapStoredEpisode);
  const total = Number(totalRow?.total || 0);

  return {
    data: {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize)
      },
      filters: {
        page,
        pageSize,
        search: search || undefined
      }
    },
    meta: buildMeta()
  };
}

async function getEpisodeDetailFromDb(env, episodeId) {
  const row = await env.DB.prepare(`
    SELECT
      id,
      name,
      episode_code AS episodeCode,
      air_date AS airDate,
      character_count AS characterCount,
      source_name AS sourceName,
      source_id AS sourceId,
      source_url AS sourceUrl,
      character_urls_json AS characterUrlsJson,
      updated_at AS updatedAt
    FROM episodes
    WHERE id = ?
    LIMIT 1
  `).bind(episodeId).first();

  if (!row) {
    return null;
  }

  return {
    data: mapStoredEpisode(row),
    meta: buildMeta()
  };
}

async function listEpisodesFromUpstream(env, requestUrl) {
  const upstreamBaseUrl = getUpstreamBaseUrl(env);
  const page = requestUrl.searchParams.get("page") || "1";
  const upstreamUrl = new URL(`${upstreamBaseUrl}/episode`);
  upstreamUrl.searchParams.set("page", page);
  const search = requestUrl.searchParams.get("search")?.trim();

  if (search) {
    upstreamUrl.searchParams.set("name", search);
  }

  const payload = await fetchJson(upstreamUrl.toString());
  const items = Array.isArray(payload.results) ? payload.results.map(mapUpstreamEpisode) : [];

  return {
    data: {
      items,
      pagination: {
        page: Number(page),
        pageSize: items.length,
        total: Number(payload.info?.count || items.length),
        totalPages: Number(payload.info?.pages || 1)
      },
      filters: {
        page: Number(page),
        pageSize: items.length,
        search: search || undefined
      }
    },
    meta: buildMeta()
  };
}

async function getEpisodeDetailFromUpstream(env, episodeId) {
  const upstreamBaseUrl = getUpstreamBaseUrl(env);
  const payload = await fetchJson(`${upstreamBaseUrl}/episode/${episodeId}`);

  return {
    data: mapUpstreamEpisode(payload),
    meta: buildMeta()
  };
}

export async function onRequestGet(context) {
  const path = parsePath(context);
  const requestUrl = new URL(context.request.url);
  const dbHasEpisodes = await hasStoredEpisodes(context.env);

  if (path.length === 0) {
    const payload = dbHasEpisodes
      ? await listEpisodesFromDb(context.env, requestUrl)
      : await listEpisodesFromUpstream(context.env, requestUrl);

    return json(payload);
  }

  if (path.length === 1) {
    const payload = dbHasEpisodes
      ? await getEpisodeDetailFromDb(context.env, path[0])
      : await getEpisodeDetailFromUpstream(context.env, path[0]);

    if (!payload) {
      return json({
        error: {
          code: "not_found",
          message: "Episode not found."
        },
        meta: buildMeta()
      }, { status: 404 });
    }

    return json(payload);
  }

  return json({
    error: {
      code: "not_found",
      message: "Episode route not found."
    },
    meta: buildMeta()
  }, { status: 404 });
}
