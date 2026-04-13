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

async function hasStoredLocations(env) {
  if (!env.DB) {
    return false;
  }

  try {
    const row = await env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM locations
    `).first();

    return Number(row?.total || 0) > 0;
  } catch {
    return false;
  }
}

function mapStoredLocation(row) {
  const residentUrls = row.residentUrlsJson ? JSON.parse(row.residentUrlsJson) : [];

  return {
    id: String(row.id),
    name: row.name,
    type: row.type,
    dimension: row.dimension,
    residentCount: Number(row.residentCount || 0),
    residents: residentUrls.map((sourceUrl) => ({ sourceUrl })),
    primarySource: {
      sourceName: row.sourceName,
      sourceId: row.sourceId,
      sourceUrl: row.sourceUrl
    },
    updatedAt: row.updatedAt
  };
}

function mapUpstreamLocation(item) {
  return {
    id: String(item.id),
    name: item.name,
    type: item.type || null,
    dimension: item.dimension || null,
    residentCount: Array.isArray(item.residents) ? item.residents.length : 0,
    residents: Array.isArray(item.residents) ? item.residents.map((sourceUrl) => ({ sourceUrl })) : [],
    primarySource: {
      sourceName: "rick_and_morty_public_api",
      sourceId: String(item.id),
      sourceUrl: item.url || `${DEFAULT_UPSTREAM_BASE_URL}/location/${item.id}`
    },
    updatedAt: null
  };
}

async function listLocationsFromDb(env, requestUrl) {
  const page = Math.max(1, Number(requestUrl.searchParams.get("page") || "1"));
  const requestedPageSize = Number(requestUrl.searchParams.get("pageSize") || "20");
  const pageSize = Math.min(100, Math.max(1, requestedPageSize));
  const search = requestUrl.searchParams.get("search")?.trim() || "";
  const offset = (page - 1) * pageSize;
  const clauses = [];
  const params = [];

  if (search) {
    const searchParam = `%${search.toLowerCase()}%`;
    clauses.push("(LOWER(name) LIKE ? OR LOWER(type) LIKE ? OR LOWER(dimension) LIKE ?)");
    params.push(searchParam, searchParam, searchParam);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const totalRow = await env.DB.prepare(`
    SELECT COUNT(*) AS total
    FROM locations
    ${whereSql}
  `).bind(...params).first();

  const rows = await env.DB.prepare(`
    SELECT
      id,
      name,
      type,
      dimension,
      resident_count AS residentCount,
      source_name AS sourceName,
      source_id AS sourceId,
      source_url AS sourceUrl,
      resident_urls_json AS residentUrlsJson,
      updated_at AS updatedAt
    FROM locations
    ${whereSql}
    ORDER BY name COLLATE NOCASE ASC
    LIMIT ? OFFSET ?
  `).bind(...params, pageSize, offset).all();

  const items = (rows.results || []).map(mapStoredLocation);
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

async function getLocationDetailFromDb(env, locationId) {
  const row = await env.DB.prepare(`
    SELECT
      id,
      name,
      type,
      dimension,
      resident_count AS residentCount,
      source_name AS sourceName,
      source_id AS sourceId,
      source_url AS sourceUrl,
      resident_urls_json AS residentUrlsJson,
      updated_at AS updatedAt
    FROM locations
    WHERE id = ?
    LIMIT 1
  `).bind(locationId).first();

  if (!row) {
    return null;
  }

  return {
    data: mapStoredLocation(row),
    meta: buildMeta()
  };
}

async function listLocationsFromUpstream(env, requestUrl) {
  const upstreamBaseUrl = getUpstreamBaseUrl(env);
  const page = requestUrl.searchParams.get("page") || "1";
  const upstreamUrl = new URL(`${upstreamBaseUrl}/location`);
  upstreamUrl.searchParams.set("page", page);
  const search = requestUrl.searchParams.get("search")?.trim();

  if (search) {
    upstreamUrl.searchParams.set("name", search);
  }

  const payload = await fetchJson(upstreamUrl.toString());
  const items = Array.isArray(payload.results) ? payload.results.map(mapUpstreamLocation) : [];

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

async function getLocationDetailFromUpstream(env, locationId) {
  const upstreamBaseUrl = getUpstreamBaseUrl(env);
  const payload = await fetchJson(`${upstreamBaseUrl}/location/${locationId}`);

  return {
    data: mapUpstreamLocation(payload),
    meta: buildMeta()
  };
}

export async function onRequestGet(context) {
  const path = parsePath(context);
  const requestUrl = new URL(context.request.url);
  const dbHasLocations = await hasStoredLocations(context.env);

  if (path.length === 0) {
    const payload = dbHasLocations
      ? await listLocationsFromDb(context.env, requestUrl)
      : await listLocationsFromUpstream(context.env, requestUrl);

    return json(payload);
  }

  if (path.length === 1) {
    const payload = dbHasLocations
      ? await getLocationDetailFromDb(context.env, path[0])
      : await getLocationDetailFromUpstream(context.env, path[0]);

    if (!payload) {
      return json({
        error: {
          code: "not_found",
          message: "Location not found."
        },
        meta: buildMeta()
      }, { status: 404 });
    }

    return json(payload);
  }

  return json({
    error: {
      code: "not_found",
      message: "Location route not found."
    },
    meta: buildMeta()
  }, { status: 404 });
}
