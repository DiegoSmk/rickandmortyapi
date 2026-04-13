# Data Model

## D1 Tables

### `characters`

Purpose:

- imported canonical character catalog
- editable base content
- host row for AI profile JSON

Core fields:

- `id`
- `canonical_name`
- `display_name`
- `species`
- `type`
- `gender`
- `status`
- `image_url`
- `origin_name`
- `location_name`
- `episode_count`
- `source_name`
- `source_id`
- `source_url`
- `episode_urls_json`
- `ai_profile_json`
- `created_at`
- `updated_at`

### `episodes`

Core fields:

- `id`
- `name`
- `episode_code`
- `air_date`
- `character_count`
- `character_urls_json`

### `locations`

Core fields:

- `id`
- `name`
- `type`
- `dimension`
- `resident_count`
- `resident_urls_json`

### `character_votes`

Purpose:

- persist likes/dislikes totals

### `audit_logs`

Purpose:

- privileged action trace

## AI Profile Model

`ai_profile_json` uses a normalized section structure:

```json
{
  "version": "v2",
  "sections": {
    "description": null,
    "capacityAnalysis": null,
    "fieldAnalysis": null
  }
}
```

## Description Section

```json
{
  "source": "ai",
  "narrative_summary": {
    "pt": "texto",
    "en": "text"
  },
  "updatedAt": "timestamp"
}
```

`source` may be:

- `ai`
- `manual`
- `legacy`

## Capacity Analysis Section

```json
{
  "source": "ai",
  "attributes": {
    "caos": 50,
    "sobrevivencia": 50,
    "instabilidade": 50,
    "genialidade": 50,
    "influencia": 50,
    "vitalidade": 50
  },
  "attribute_reasoning": {
    "caos": "string",
    "sobrevivencia": "string",
    "instabilidade": "string",
    "genialidade": "string",
    "influencia": "string",
    "vitalidade": "string"
  },
  "updatedAt": "timestamp"
}
```

## Field Analysis Section

```json
{
  "source": "ai",
  "traits": [],
  "weaknesses": [],
  "abilities": [],
  "evidence_summary": [],
  "updatedAt": "timestamp"
}
```

## Controlled Libraries

Traits, weaknesses, and abilities are validated against approved slugs in the admin API.

This is an established rule and should not be relaxed casually.

## Content Ownership Rules

- Base/imported content belongs to the `characters` row itself
- Generated/manual dossier content belongs to `ai_profile_json`
- Votes belong to `character_votes`
- Image binaries belong to `R2`

This separation is intentional and should be preserved.
