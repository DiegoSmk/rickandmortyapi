# Schema Relacional — Fase 1

## Objetivo

Fechar a estrutura relacional minima para comecar a popular a API.

Este documento traduz o modelo conceitual para tabelas, colunas, chaves e restricoes.

## Banco inicial

- engine: SQLite
- foco: bootstrap, consolidacao, reconciliacao e enriquecimento

## Convencoes

- chaves primarias internas em texto (`uuid` ou `cuid`)
- `created_at` e `updated_at` em todas as tabelas principais
- `json` armazenado como `TEXT` quando necessario no SQLite

## Tabela `variant_families`

Colunas:

- `id` TEXT PRIMARY KEY
- `slug` TEXT NOT NULL UNIQUE
- `name` TEXT NOT NULL
- `description` TEXT
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

## Tabela `dimensions`

Colunas:

- `id` TEXT PRIMARY KEY
- `slug` TEXT NOT NULL UNIQUE
- `display_name` TEXT NOT NULL
- `source_label` TEXT
- `dimension_kind` TEXT
- `confidence` REAL NOT NULL DEFAULT 0
- `source_mode` TEXT NOT NULL
- `is_canonical` INTEGER NOT NULL DEFAULT 0
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

Restricoes:

- `confidence` entre `0` e `1`

## Tabela `locations`

Colunas:

- `id` TEXT PRIMARY KEY
- `canonical_name` TEXT NOT NULL
- `source_id` TEXT
- `source_url` TEXT
- `location_type` TEXT
- `dimension_label` TEXT
- `dimension_id` TEXT
- `is_dimension_known` INTEGER NOT NULL DEFAULT 0
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

FK:

- `dimension_id -> dimensions.id`

Indice recomendado:

- `(source_id)`
- `(canonical_name)`

## Tabela `canonical_characters`

Colunas:

- `id` TEXT PRIMARY KEY
- `canonical_name` TEXT NOT NULL
- `display_name` TEXT NOT NULL
- `variant_family_id` TEXT
- `canonical_kind` TEXT NOT NULL
- `species` TEXT
- `type` TEXT
- `gender` TEXT
- `status` TEXT
- `image_url` TEXT
- `origin_location_id` TEXT
- `current_location_id` TEXT
- `origin_dimension_id` TEXT
- `identity_confidence` REAL NOT NULL DEFAULT 0
- `is_variant` INTEGER NOT NULL DEFAULT 0
- `is_fusion` INTEGER NOT NULL DEFAULT 0
- `is_alias_only` INTEGER NOT NULL DEFAULT 0
- `is_active` INTEGER NOT NULL DEFAULT 1
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

FK:

- `variant_family_id -> variant_families.id`
- `origin_location_id -> locations.id`
- `current_location_id -> locations.id`
- `origin_dimension_id -> dimensions.id`

Indices recomendados:

- `(canonical_name)`
- `(display_name)`
- `(variant_family_id)`

Restricoes:

- `identity_confidence` entre `0` e `1`

## Tabela `character_aliases`

Colunas:

- `id` TEXT PRIMARY KEY
- `character_id` TEXT NOT NULL
- `alias_name` TEXT NOT NULL
- `alias_type` TEXT NOT NULL
- `source_name` TEXT
- `confidence` REAL NOT NULL DEFAULT 0
- `created_at` TEXT NOT NULL

FK:

- `character_id -> canonical_characters.id`

Indices recomendados:

- `(character_id)`
- `(alias_name)`

## Tabela `source_character_links`

Colunas:

- `id` TEXT PRIMARY KEY
- `character_id` TEXT NOT NULL
- `source_name` TEXT NOT NULL
- `source_id` TEXT NOT NULL
- `source_url` TEXT
- `raw_name` TEXT
- `raw_payload_hash` TEXT
- `match_status` TEXT NOT NULL
- `match_confidence` REAL NOT NULL DEFAULT 0
- `is_primary_source` INTEGER NOT NULL DEFAULT 0
- `last_seen_at` TEXT
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

FK:

- `character_id -> canonical_characters.id`

Restricoes:

- UNIQUE (`source_name`, `source_id`)
- `match_confidence` entre `0` e `1`

## Tabela `episodes`

Colunas:

- `id` TEXT PRIMARY KEY
- `source_name` TEXT NOT NULL
- `source_id` TEXT NOT NULL
- `source_url` TEXT
- `name` TEXT NOT NULL
- `code` TEXT
- `air_date` TEXT
- `season_number` INTEGER
- `episode_number` INTEGER
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

Restricoes:

- UNIQUE (`source_name`, `source_id`)

Indices recomendados:

- `(season_number, episode_number)`
- `(code)`

## Tabela `character_episodes`

Colunas:

- `id` TEXT PRIMARY KEY
- `character_id` TEXT NOT NULL
- `episode_id` TEXT NOT NULL
- `appearance_kind` TEXT
- `created_at` TEXT NOT NULL

FK:

- `character_id -> canonical_characters.id`
- `episode_id -> episodes.id`

Restricoes:

- UNIQUE (`character_id`, `episode_id`)

## Tabela `character_evidences`

Colunas:

- `id` TEXT PRIMARY KEY
- `character_id` TEXT NOT NULL
- `evidence_type` TEXT NOT NULL
- `title` TEXT NOT NULL
- `description` TEXT NOT NULL
- `source_kind` TEXT NOT NULL
- `source_name` TEXT
- `source_ref` TEXT
- `season_number` INTEGER
- `episode_code` TEXT
- `dimension_id` TEXT
- `confidence` REAL NOT NULL DEFAULT 0
- `is_manual_verified` INTEGER NOT NULL DEFAULT 0
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

FK:

- `character_id -> canonical_characters.id`
- `dimension_id -> dimensions.id`

Indices recomendados:

- `(character_id)`
- `(evidence_type)`
- `(episode_code)`

## Tabela `character_profile_ai`

Colunas:

- `id` TEXT PRIMARY KEY
- `character_id` TEXT NOT NULL
- `analysis_version` TEXT NOT NULL
- `model_name` TEXT NOT NULL
- `prompt_version` TEXT NOT NULL
- `schema_version` TEXT NOT NULL
- `payload_json` TEXT NOT NULL
- `overall_confidence` REAL NOT NULL DEFAULT 0
- `created_at` TEXT NOT NULL

FK:

- `character_id -> canonical_characters.id`

Indices recomendados:

- `(character_id, created_at DESC)`
- `(analysis_version)`

## Tabela `sync_runs`

Colunas:

- `id` TEXT PRIMARY KEY
- `started_at` TEXT NOT NULL
- `finished_at` TEXT
- `status` TEXT NOT NULL
- `source_name` TEXT
- `pages_scanned` INTEGER NOT NULL DEFAULT 0
- `records_seen` INTEGER NOT NULL DEFAULT 0
- `records_created` INTEGER NOT NULL DEFAULT 0
- `records_updated` INTEGER NOT NULL DEFAULT 0
- `records_unchanged` INTEGER NOT NULL DEFAULT 0
- `records_deactivated` INTEGER NOT NULL DEFAULT 0
- `error_summary` TEXT

## Tabela `reconciliation_events`

Colunas:

- `id` TEXT PRIMARY KEY
- `entity_id` TEXT
- `entity_type` TEXT NOT NULL
- `source_name` TEXT NOT NULL
- `decision_type` TEXT NOT NULL
- `changed_fields_json` TEXT
- `reason` TEXT
- `confidence` REAL NOT NULL DEFAULT 0
- `created_at` TEXT NOT NULL

## Fase 1 — escopo minimo de populacao

Obrigatorio para iniciar:

- `variant_families`
- `dimensions`
- `locations`
- `canonical_characters`
- `source_character_links`
- `episodes`
- `character_episodes`
- `sync_runs`
- `reconciliation_events`

Opcional na primeira carga:

- `character_aliases`
- `character_evidences`
- `character_profile_ai`

## Resultado esperado

Com este schema, ja e possivel:

- importar personagens da fonte inicial
- consolidar identidade
- registrar variantes
- guardar dimensao quando conhecida
- preparar o terreno para enriquecimento IA
