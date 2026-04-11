# Fluxo Operacional — Fase 1

## Objetivo

Definir como a API deve comecar a ser populada sem abrir retrabalho grande.

## Escopo da fase 1

Fonte ativa:

- `rickandmortyapi_public`

Fontes previstas, mas nao obrigatorias para a primeira carga:

- `thetvdb`
- `tmdb`
- `fandom`

## Principio

Primeiro popular com estrutura canonica minima.
Depois consolidar identidade.
Depois abrir enriquecimento.

Nao misturar tudo na primeira passagem.

## Ordem operacional

### Etapa 1 — bootstrap bruto

Objetivo:

- carregar personagens, episodios e localizacoes da API publica

Saidas esperadas:

- `source_character_links`
- `episodes`
- `locations`
- personagens iniciais criados ou vinculados

### Etapa 2 — consolidacao de identidade

Objetivo:

- aplicar matching
- resolver familias de variante
- preencher confianca de identidade

Decisoes permitidas:

- `update_existing`
- `create_new`
- `attach_source_only`
- `conflict_pending_review`

### Etapa 3 — normalizacao de dimensao

Objetivo:

- extrair `origin_dimension` quando houver sinal suficiente
- criar ou relacionar entidades `dimension`
- associar dimensoes a localizacoes e personagens

### Etapa 4 — enriquecimento de evidencias

Objetivo:

- montar evidencias basicas
- preparar dossie consolidado

### Etapa 5 — avaliacao por IA

Objetivo:

- gerar atributos
- traits
- fraquezas
- habilidades

## Regras de criacao de personagem na fase 1

Um personagem pode ser criado quando houver no minimo:

- `source_name`
- `source_id`
- `canonical_name` ou `display_name`
- `status`
- `species` ou `type`

## Regras de bloqueio

Nao enviar personagem para IA quando:

- identidade estiver ambigua
- match estiver pendente de revisao
- perfil consolidado estiver incompleto

## Politica de populacao inicial

### Primeira carga

- importar tudo da API publica
- nao depender da IA
- nao depender de Fandom
- nao depender de TheTVDB

### Segunda fase de populacao

- integrar fontes complementares
- preencher dimensoes melhores
- abrir variante review

### Terceira fase

- ativar enriquecimento IA em lote

## Resultado esperado

Ao fim da fase 1, o sistema ja deve ter:

- catalogo base populado
- identidade consolidada inicial
- dimensao parcialmente tratada quando conhecida
- estrutura pronta para enriquecimento posterior
