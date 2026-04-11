# Arquitetura

## Escopo

A API propria sera responsavel por:

- armazenar o catalogo local de personagens
- sincronizar com a API publica do Rick and Morty
- enriquecer dados incompletos ou ausentes com Gemini
- servir endpoints estaveis para o frontend do jogo
- gerar rosters e selecoes de personagens para o torneio

## Fora de escopo inicial

- autenticacao de usuarios finais
- painel admin completo
- multiplayer
- filas distribuidas
- microsservicos

## Fronteiras

### Frontend / Tauri

- consome apenas a API local
- nao consulta a API publica diretamente
- nao calcula enriquecimento de dados
- nao controla sincronizacao

### API propria

- consolida dados canonicos e dados derivados para o jogo
- controla sync, deduplicacao e enriquecimento
- entrega payloads adequados ao jogo

### API publica Rick and Morty

- fonte primaria externa
- usada para bootstrap e atualizacoes
- nunca sera dependida diretamente pelo frontend

### Gemini

- usado apenas para complementar dados faltantes
- nunca substitui ids, nomes canonicos ou relacoes vindas da API publica
- toda saida deve ser marcada como enriquecida por IA

## Componentes planejados

### API HTTP

Responsavel por endpoints de leitura e operacoes administrativas.

### Sync Engine

Responsavel por:

- detectar novos registros
- atualizar registros alterados
- marcar registros descontinuados ou nao encontrados
- registrar historico de sincronizacao

### Enrichment Engine

Responsavel por:

- identificar lacunas de dados
- montar prompts controlados para Gemini
- persistir resultados e metadados
- evitar reprocessamento desnecessario

### Tournament Service

Responsavel por:

- selecionar personagens elegiveis
- aplicar regras de balanceamento
- gerar roster de torneio
- devolver roster pronto para a interface

## Estrategia de deploy

Fase inicial:

- 1 container para a API
- SQLite em volume local
- execucao local por Docker Compose

Fase posterior:

- API containerizada
- banco migravel para Postgres
- jobs periodicos de sync

## Diretorios planejados para a implementacao futura

- `src/server`
- `src/routes`
- `src/modules/characters`
- `src/modules/tournament`
- `src/modules/sync`
- `src/modules/enrichment`
- `src/db`
- `src/lib`
- `src/jobs`
- `storage`
