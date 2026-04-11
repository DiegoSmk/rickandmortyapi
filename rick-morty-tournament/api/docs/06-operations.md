# Operacao

## Ambientes

- `local`
- `test`
- `prod`

## Variaveis de ambiente previstas

- `NODE_ENV`
- `PORT`
- `LOG_LEVEL`
- `DATABASE_URL`
- `RICK_AND_MORTY_API_BASE_URL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `ENABLE_GEMINI_ENRICHMENT`
- `SYNC_DEFAULT_PAGE_SIZE`

## Observabilidade

Minimo esperado:

- logs estruturados JSON
- request id por requisicao
- auditoria de sync
- auditoria de enriquecimento
- healthcheck HTTP

## Seguranca

- chaves apenas via env
- endpoints admin protegidos futuramente
- rate limiting para endpoints sensiveis
- validacao estrita de payloads

## Backup

Fase SQLite:

- volume persistente
- backup do arquivo `.sqlite`
- backup antes de syncs criticos ou migrations

## Rotinas planejadas

- sync manual sob demanda
- sync agendado
- enriquecimento manual
- enriquecimento em lote agendado

## Estrategia de rollout

1. subir API local com catalogo vazio
2. rodar bootstrap completo da API publica
3. validar dados persistidos
4. ativar enriquecimento Gemini
5. migrar frontend para a API propria

## Criterios de pronto para integrar com o frontend

- `GET /v1/health`
- `GET /v1/characters`
- `POST /v1/tournament/rosters`
- sync completo funcionando
- persistencia local confiavel
- enriquecimento IA opcional e auditavel
