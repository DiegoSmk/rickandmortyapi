# Sincronizacao Multi-Fonte e Reconciliacao

## Objetivo

Definir como a API propria deve:

- consumir mais de uma fonte
- escolher qual dado prevalece
- decidir se atualiza entidade existente
- decidir se cria nova entidade
- decidir quando enviar para revisao manual

## Principio

Nem toda fonte tem o mesmo nivel de confianca para todo tipo de dado.

Por isso, a reconciliacao deve ser feita por categoria de dado, nao por fonte unica absoluta.

## Fontes previstas

### `rickandmortyapi_public`

Uso principal:

- bootstrap de personagens
- ids de referencia iniciais
- estrutura basica de personagens, episodios e localizacoes

### `thetvdb`

Uso principal:

- temporadas
- episodios
- deteccao de material mais novo

### `tmdb`

Uso principal:

- validacao cruzada de temporadas e episodios
- apoio para deteccao de elenco e atualizacoes

### `fandom`

Uso principal:

- detalhes complementares
- variantes
- contexto de personagens
- relacoes e notas uteis para evidencia

### `manual_curation`

Uso principal:

- resolver ambiguidades
- validar variantes
- corrigir casos criticos

## Prioridade por categoria

### Identidade basica de personagem

Prioridade sugerida:

1. `rickandmortyapi_public`
2. `manual_curation`
3. `fandom`

### Temporadas e episodios

Prioridade sugerida:

1. `thetvdb`
2. `tmdb`
3. `manual_curation`

### Variantes e detalhes de diferenciacao

Prioridade sugerida:

1. `manual_curation`
2. `fandom`
3. `thetvdb`
4. `tmdb`

### Dimensao

Prioridade sugerida:

1. `manual_curation`
2. fonte estruturada com label clara
3. `fandom`
4. inferencia controlada

## Fluxo de reconciliacao

1. importar payload bruto da fonte
2. normalizar estrutura
3. classificar categoria do dado
4. aplicar politica de prioridade da categoria
5. executar matching de identidade
6. decidir:
   - atualizar entidade existente
   - criar nova entidade
   - marcar conflito
   - abrir revisao manual

## Tipos de decisao

### `update_existing`

Quando existe match confiavel e dado novo e melhor ou mais atual.

### `create_new`

Quando nao existe entidade consolidada compativel.

### `attach_source_only`

Quando a fonte nova confirma entidade existente, mas nao muda o dado consolidado.

### `conflict_pending_review`

Quando existe conflito relevante entre fontes ou ambiguidade de identidade.

## Conflitos que exigem revisao manual

- nome semelhante com contexto diferente
- mesma familia de variante com dimensao diferente
- fonte sugere nova entidade, mas outra sugere match existente
- feats ou papel narrativo mudam drasticamente
- dimensao de origem altamente relevante e conflitante

## Regras para dados novos

Criar nova entidade quando:

- nao houver match confiavel
- existir forte sinal de nova variante
- a dimensao ou contexto diferenciar claramente a entidade

Atualizar entidade existente quando:

- o match for forte
- a diferenca for apenas complemento de metadado
- a nova fonte tiver prioridade maior naquela categoria

## Regras para dimensao

Dimensao deve influenciar matching quando:

- a familia de variante for Rick, Morty ou equivalente
- a dimensao for explicitamente conhecida
- o contexto indicar que a variante depende da origem dimensional

Dimensao nao deve ser usada isoladamente quando:

- for apenas inferida com baixa confianca
- houver ausencia de suporte por outras evidencias

## Auditoria recomendada

Toda decisao de reconciliacao deve registrar:

- `entity_id`
- `source_name`
- `decision_type`
- `changed_fields`
- `reason`
- `confidence`
- `timestamp`

## Jobs recomendados

### `sync_bootstrap_public_api`

Carrega base inicial.

### `sync_latest_episodes`

Consulta fontes de episodio mais atuais.

### `reconcile_character_identities`

Resolve matches e conflitos.

### `refresh_dimension_links`

Normaliza e reavalia dimensoes conhecidas ou inferidas.

### `queue_manual_review`

Enfileira conflitos que nao podem ser decididos automaticamente.

## Resultado esperado

O sistema passa a suportar:

- mais de uma fonte sem perder consistencia
- atualizacao automatica controlada
- variantes bem tratadas
- conflitos auditaveis
- menos risco de colapsar personagens diferentes na mesma entidade
