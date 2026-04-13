# API Spec

This is the practical contract currently established by the project.

## Public Routes

### `GET /api/v1/characters`

Purpose:

- paginated character catalog

Core query params:

- `page`
- `pageSize`
- `search`
- `species`

Core response shape:

- `data.items[]`
- `data.pagination`

Character item includes:

- `id`
- `canonicalName`
- `displayName`
- `species`
- `type`
- `gender`
- `status`
- `imageUrl`
- `origin`
- `location`
- `episodeCount`
- `likes`
- `dislikes`
- `hasAiProfile`
- `primarySource`

### `GET /api/v1/characters/random`

Purpose:

- random character selection

Core query params:

- `count`
- `species`

### `GET /api/v1/characters/:id`

Purpose:

- character detail

Detail includes:

- catalog fields
- `episodes`
- `firstSeenIn`
- `evidences`
- `aiProfile`

### `POST /api/v1/characters/:id/vote`

Purpose:

- persist likes/dislikes deltas

Accepted body:

```json
{
  "likes": 1,
  "dislikes": 0,
  "sync": true
}
```

## Public Episode Routes

### `GET /api/v1/episodes`

Purpose:

- paginated episode catalog

Core query params:

- `page`
- `pageSize`
- `search`

### `GET /api/v1/episodes/:id`

Purpose:

- episode detail

## Public Location Routes

### `GET /api/v1/locations`

Purpose:

- paginated location catalog

Core query params:

- `page`
- `pageSize`
- `search`

### `GET /api/v1/locations/:id`

Purpose:

- location detail

## Admin Routes

All admin routes require Cloudflare Access and role authorization.

### Session / telemetry

- `GET /api/v1/admin/session`
- `GET /api/v1/admin/votes/summary`
- `GET /api/v1/admin/audit-logs`
- `GET /api/v1/admin/field-library`

### Admin catalog access

- `GET /api/v1/admin/characters`
- `GET /api/v1/admin/episodes`
- `GET /api/v1/admin/locations`

### Import routes

- `POST /api/v1/admin/characters/import-public-api`
- `POST /api/v1/admin/episodes/import-public-api`
- `POST /api/v1/admin/locations/import-public-api`

Import body supports:

- `maxPages`
- `startPage`

### Enrichment routes

- `POST /api/v1/admin/characters/:id/enrich`
- `POST /api/v1/admin/characters/:id/manual-enrich`
- `POST /api/v1/admin/characters/:id/reset-ai`

`enrich` body:

```json
{
  "section": "description"
}
```

Allowed sections:

- `description`
- `capacity`
- `field`
- `all`

### Base content editing

- `POST /api/v1/admin/characters/:id/base-content`

Editable fields:

- `displayName`
- `canonicalName`
- `species`
- `type`
- `gender`
- `status`
- `imageUrl`
- `originName`
- `locationName`

### Moderation

- `POST /api/v1/admin/votes/override/:id`

## Stability Notes

These routes should be treated as the current contract for:

- the public portal
- the admin portal
- future game clients consuming the catalog
