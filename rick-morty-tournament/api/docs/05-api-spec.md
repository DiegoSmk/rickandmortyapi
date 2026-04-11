# Especificacao da API

## Principios do contrato

- respostas estaveis para o frontend
- payloads focados no jogo
- separacao entre endpoints publicos do app e endpoints administrativos

## Base URL local

- `http://localhost:8080`

## Versionamento

- prefixo inicial: `/v1`

## Endpoints publicos do app

### `GET /v1/health`

Retorna status da API.

### `GET /v1/characters`

Lista personagens do catalogo local.

Query params previstos:

- `page`
- `pageSize`
- `search`
- `species`
- `status`
- `eligible`

### `GET /v1/characters/:id`

Detalha um personagem do catalogo local.

### `GET /v1/characters/random`

Retorna uma selecao aleatoria do catalogo.

Query params previstos:

- `count`
- `eligibleOnly`

### `POST /v1/tournament/rosters`

Gera um roster do torneio.

Body previsto:

- `count`
- `seed`
- `strategy`
- `eligibleOnly`

### `GET /v1/tournament/rosters/:id`

Retorna um roster previamente gerado.

## Endpoints administrativos

### `POST /v1/admin/sync/full`

Dispara sincronizacao completa.

### `POST /v1/admin/sync/character/:sourceId`

Sincroniza apenas um personagem.

### `GET /v1/admin/sync/runs`

Lista execucoes de sync.

### `POST /v1/admin/enrichment/run`

Dispara enriquecimento em lote.

### `POST /v1/admin/enrichment/character/:id`

Reenriquece um personagem.

### `GET /v1/admin/enrichment/runs`

Lista execucoes de enriquecimento.

## Resposta padrao sugerida

```json
{
  "data": {},
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-04-09T12:00:00.000Z"
  }
}
```

## Erros

Formato sugerido:

```json
{
  "error": {
    "code": "character_not_found",
    "message": "Character not found"
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-04-09T12:00:00.000Z"
  }
}
```

## Regras de roster

Versao inicial:

- `count` padrao 16
- personagens unicos
- apenas personagens elegiveis
- estrategia default `random_uniform`

Estruturas futuras:

- `balanced_by_archetype`
- `weighted_random`
- `manual_pool`
