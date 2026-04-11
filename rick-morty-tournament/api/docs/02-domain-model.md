# Modelo de Dominio

## Entidades principais

### Character

Representa o personagem canonico armazenado localmente.

Campos base:

- `id`: id interno
- `source_id`: id do personagem na API publica
- `source_url`: URL canonica da API publica
- `name`
- `status`
- `species`
- `type`
- `gender`
- `origin_name`
- `origin_url`
- `origin_dimension`
- `location_name`
- `location_url`
- `image_url`
- `episode_count`
- `created_at_source`
- `updated_at_source_hash`
- `last_synced_at`
- `is_active`

Campos derivados para o jogo:

- `archetype`
- `caos`
- `sobrevivencia`
- `instabilidade`
- `genialidade`
- `influencia`
- `vitalidade`
- `deck_profile`
- `tournament_weight`
- `is_eligible`

Campos enriquecidos por IA:

- `short_lore`
- `combat_style`
- `personality_tags`
- `power_notes`
- `danger_rating`
- `enrichment_status`
- `enrichment_model`
- `enrichment_version`
- `enrichment_updated_at`

## Atributos do jogo

Os atributos do jogo nao devem usar nomenclatura generica de RPG quando forem expostos ao produto.
O conjunto inicial aprovado para o universo do jogo e:

- `caos`
- `sobrevivencia`
- `instabilidade`
- `genialidade`
- `influencia`
- `vitalidade`

### Definicoes

#### `caos`

Representa poder ofensivo, capacidade de causar estrago e desorganizar o combate.

#### `sobrevivencia`

Representa resistencia, defesa e capacidade de suportar ambientes hostis, dano e efeitos negativos.

#### `instabilidade`

Representa imprevisibilidade, chance de virada, afinidade com efeitos caoticos e sinergia com eventos fora do padrao.

#### `genialidade`

Representa inteligencia, ciencia, improviso tecnico, estrategia e dominio tecnologico.

#### `influencia`

Representa persuasao, manipulacao, presenca social, intimidacao e controle indireto do combate.

#### `vitalidade`

Representa reserva estrutural de vida do personagem.
Mesmo com `sobrevivencia` existindo, `vitalidade` permanece como atributo tecnico separado para evitar sobrecarga semantica.

### Faixa numerica sugerida

Faixa inicial sugerida para atributos expostos:

- minimo: `0`
- maximo padrao: `100`

Faixa inicial sugerida para calculo:

- personagens comuns: `20` a `70`
- personagens fortes ou centrais: `70` a `95`
- casos excepcionais: `95+` apenas com criterio especial

### Regras de design

- atributos do jogo sao derivados localmente, nao vindos da API publica
- atributos do jogo podem ser recalculados ao longo das versoes
- atributos do jogo serao decididos por IA com versionamento e auditoria
- `vitalidade` pode ser usada internamente como base para HP efetivo do combate

### Politica oficial de atribuicao

Os atributos do jogo nao serao gerados por formulas simplistas baseadas em contagem de episodios.

A politica aprovada e:

- a API publica fornece identidade canonica e estrutura minima
- a IA atribui os atributos do jogo
- a atribuicao deve considerar o que o personagem demonstrou na serie
- toda atribuicao deve ser acompanhada de justificativa curta por atributo
- toda atribuicao deve registrar nivel de confianca
- toda atribuicao deve ser versionada por modelo, prompt e schema

### Evidencias esperadas para a IA

A IA deve trabalhar sobre um perfil consolidado do personagem, incluindo quando possivel:

- dados canonicos importados
- episodios em que apareceu
- contexto narrativo consolidado
- notas de feats, comportamento e papel no universo
- dados complementares de fontes secundarias aprovadas

### Saida esperada da IA para atributos

Para cada personagem, a IA deve retornar:

- `caos`
- `sobrevivencia`
- `instabilidade`
- `genialidade`
- `influencia`
- `vitalidade`
- justificativa curta para cada atributo
- `confidence`

### Restricoes

- a IA nao define ids canonicos
- a IA nao sobrescreve dados canonicos da fonte primaria
- a IA nao gera atributos sem trilha de auditoria
- scores devem respeitar faixa numerica aprovada

### Exposicao sugerida por fase

Fase 1 da API:

- persistir apenas campos da API publica

Fase 2 da API:

- adicionar atributos do jogo como camada derivada por IA

Fase 3:

- permitir refinamento da inferencia por IA com mais fontes e revisao de versoes

### EpisodeReference

Relacao simplificada para episodios relevantes.

Campos:

- `id`
- `source_id`
- `name`
- `code`
- `air_date`

### CharacterEpisode

Relacionamento N:N entre personagem e episodio.

### SyncRun

Audita cada execucao de sincronizacao.

Campos:

- `id`
- `started_at`
- `finished_at`
- `status`
- `pages_scanned`
- `characters_seen`
- `characters_created`
- `characters_updated`
- `characters_unchanged`
- `characters_deactivated`
- `error_summary`

### EnrichmentRun

Audita execucoes de enriquecimento IA.

Campos:

- `id`
- `started_at`
- `finished_at`
- `status`
- `model`
- `characters_targeted`
- `characters_enriched`
- `characters_failed`
- `token_estimate`
- `error_summary`

### TournamentRoster

Snapshot de um roster gerado.

Campos:

- `id`
- `seed`
- `selection_strategy`
- `size`
- `created_at`

### TournamentRosterEntry

Campos:

- `id`
- `roster_id`
- `character_id`
- `slot_index`
- `selection_reason`

## Regras de negocio iniciais

- `source_id` deve ser unico
- um personagem pode existir mesmo sem enriquecimento IA
- enriquecimento IA nunca sobrescreve dados canonicos da API publica
- personagens inativos ou removidos podem ser mantidos historicamente
- o roster do torneio deve trabalhar sobre snapshot, nao sobre busca solta

## Regras de elegibilidade propostas

- excluir personagens sem imagem
- excluir personagens marcados manualmente como banidos
- excluir personagens com dados minimos invalidos
- permitir pesos diferentes por archetype ou raridade

## Persistencia

Fase 1:

- SQLite com migrations versionadas

Fase 2:

- migracao opcional para Postgres sem mudar o contrato HTTP

## Dimensao de origem

O universo de Rick and Morty exige tratamento explicito de dimensao quando essa informacao for conhecida.

Regras:

- dimensao de origem deve ser armazenada separadamente do nome da localizacao quando possivel
- dimensao pode vir da fonte, de normalizacao ou de inferencia controlada
- dimensao ajuda a resolver identidade de variantes
- dimensao nao deve ser tratada como texto livre sem provenance
