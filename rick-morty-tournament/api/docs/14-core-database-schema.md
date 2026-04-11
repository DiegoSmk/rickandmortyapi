# Schema Central do Banco

## Objetivo

Definir as entidades centrais do banco para a fase inicial da API propria, ja considerando:

- identidade consolidada
- variantes
- alias
- evidencias
- dimensao de origem quando conhecida

## Principios

- o banco deve refletir identidade, nao apenas espelhar payload externo
- fontes externas entram como links de origem, nao como verdade absoluta do modelo interno
- dimensao deve ser tratada como dado de contexto, com confianca e proveniencia

## Entidade `canonical_character`

Representa a entidade principal usada pelo jogo.

Campos sugeridos:

- `id`
- `canonical_name`
- `display_name`
- `variant_family_id`
- `canonical_kind`
- `species`
- `type`
- `gender`
- `status`
- `image_url`
- `origin_location_id`
- `current_location_id`
- `origin_dimension_id`
- `identity_confidence`
- `is_variant`
- `is_fusion`
- `is_alias_only`
- `is_active`
- `created_at`
- `updated_at`

## Entidade `source_character_link`

Relaciona um personagem interno com uma entidade de uma fonte externa.

Campos sugeridos:

- `id`
- `character_id`
- `source_name`
- `source_id`
- `source_url`
- `raw_name`
- `raw_payload_hash`
- `match_status`
- `match_confidence`
- `is_primary_source`
- `last_seen_at`
- `created_at`
- `updated_at`

## Entidade `variant_family`

Agrupa variantes semanticamente relacionadas.

Campos sugeridos:

- `id`
- `slug`
- `name`
- `description`
- `created_at`
- `updated_at`

## Entidade `character_alias`

Guarda aliases e nomes alternativos.

Campos sugeridos:

- `id`
- `character_id`
- `alias_name`
- `alias_type`
- `source_name`
- `confidence`
- `created_at`

## Entidade `location`

Representa localizacao consolidada.

Campos sugeridos:

- `id`
- `canonical_name`
- `source_id`
- `source_url`
- `location_type`
- `dimension_label`
- `dimension_id`
- `is_dimension_known`
- `created_at`
- `updated_at`

## Entidade `dimension`

Representa dimensao consolidada.

Essa entidade e importante no universo da serie e nao deve ficar apenas como texto solto.

Campos sugeridos:

- `id`
- `slug`
- `display_name`
- `source_label`
- `dimension_kind`
- `confidence`
- `source_mode`
- `is_canonical`
- `created_at`
- `updated_at`

## Entidade `character_evidence`

Campos sugeridos:

- `id`
- `character_id`
- `evidence_type`
- `title`
- `description`
- `source_kind`
- `source_name`
- `source_ref`
- `season_number`
- `episode_code`
- `dimension_id`
- `confidence`
- `is_manual_verified`
- `created_at`
- `updated_at`

## Entidade `character_profile_ai`

Armazena a avaliacao da IA por versao.

Campos sugeridos:

- `id`
- `character_id`
- `analysis_version`
- `model_name`
- `prompt_version`
- `schema_version`
- `payload_json`
- `overall_confidence`
- `created_at`

## Entidade `episode`

Campos sugeridos:

- `id`
- `source_id`
- `source_url`
- `name`
- `code`
- `air_date`
- `season_number`
- `episode_number`
- `created_at`
- `updated_at`

## Entidade `character_episode`

Relacionamento N:N entre personagem e episodio.

Campos sugeridos:

- `id`
- `character_id`
- `episode_id`
- `appearance_kind`
- `created_at`

## Tratamento de dimensao de origem

### Objetivo

Capturar a dimensao quando ela for:

- explicitamente conhecida
- fortemente inferivel
- util para distinguir variantes

### Regra principal

Nao tratar dimensao apenas como string livre dentro de `origin`.

O sistema deve:

- normalizar labels de dimensao
- permitir ligacao entre `location` e `dimension`
- permitir ligacao direta entre `character` e `origin_dimension`

### Modos de atribuicao de dimensao

#### `canonical`

Quando a dimensao vier explicitamente da fonte com alta confianca.

#### `normalized`

Quando a dimensao vier em texto e for normalizada para uma entidade local.

#### `inferred`

Quando a dimensao for inferida a partir de evidencias ou contexto.

#### `unknown`

Quando nao houver informacao suficiente.

### Regras de uso

- dimensao inferida deve registrar confianca
- dimensao inferida nao deve sobrescrever uma dimensao canonica
- dimensao pode ser decisiva para distinguir variantes de Rick e Morty

### Relacoes minimas recomendadas

- `canonical_character.origin_location_id -> location.id`
- `canonical_character.origin_dimension_id -> dimension.id`
- `location.dimension_id -> dimension.id`
- `character_evidence.dimension_id -> dimension.id`

## Resultado esperado

Com esse schema, o sistema consegue:

- consolidar personagens complexos
- distinguir variantes
- armazenar avaliacao de IA com auditoria
- tratar dimensao como entidade util e nao apenas texto decorativo
