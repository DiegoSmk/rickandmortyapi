# Especificacao de Sincronizacao

## Objetivo

Sincronizar o catalogo local com a API publica do Rick and Morty de modo:

- completo
- repetivel
- idempotente
- auditavel

## Premissas

- a API publica e a fonte canonica externa
- o catalogo local e a fonte da verdade para o jogo
- o sync nao deve quebrar o frontend se falhar parcialmente

## Estrategia de bootstrap inicial

1. consultar `GET /character?page=1`
2. ler `info.count` e `info.pages`
3. percorrer todas as paginas
4. normalizar cada personagem
5. persistir personagens e episodios relacionados
6. registrar um `SyncRun`

## Estrategia de atualizacao

### Poll completo simples

Na fase inicial, a estrategia mais segura e:

- consultar periodicamente todas as paginas
- gerar hash do payload relevante por personagem
- comparar com `updated_at_source_hash`
- atualizar apenas quando houver diferenca

Motivo:

- a API publica nao oferece webhook
- a simplicidade operacional vale mais do que uma otimização prematura

### Frequencia recomendada

- ambiente local: manual ou sob demanda
- ambiente homologacao: 1 vez por dia
- ambiente producao: 1 vez por dia ou a cada 12 horas

## Deteccao de mudanca

Hash sugerido sobre campos canonicos:

- `name`
- `status`
- `species`
- `type`
- `gender`
- `origin`
- `location`
- `image`
- `episode`

## Tratamento de novos registros

Quando `source_id` nao existir localmente:

- tentar resolucao de identidade e variante antes da criacao final
- se for `new_entity`, criar `Character`
- se for `probable_match` ou `ambiguous`, registrar para revisao
- registrar em `SyncRun.characters_created`
- marcar para enriquecimento posterior

## Tratamento de registros alterados

Quando o hash divergir:

- atualizar campos canonicos
- recalcular campos derivados se necessario
- decidir se exige novo enriquecimento
- reavaliar matching quando houver sinais de ambiguidade de identidade

## Tratamento de registros ausentes

Se um personagem local nao aparecer mais durante um sync completo:

- nao deletar fisicamente na fase inicial
- marcar `is_active = false`
- registrar em auditoria

## Politica de reprocessamento de enriquecimento

Reenriquecer apenas quando:

- personagem novo
- campos enriquecidos ainda faltam
- houve mudanca canonica relevante
- versao do prompt ou do esquema mudou

## Falhas e resiliencia

- falha de uma pagina nao deve corromper o catalogo inteiro
- `SyncRun` deve terminar com status `partial_failure` quando aplicavel
- retries com backoff para falhas de rede
- limite de concorrencia conservador

## Endpoints administrativos planejados

- `POST /admin/sync/full`
- `POST /admin/sync/character/:sourceId`
- `GET /admin/sync/runs`
- `GET /admin/sync/runs/:id`

## Criticos para implementacao

- idempotencia
- rate limiting
- logs estruturados
- auditoria completa
- resolucao de identidade e variantes antes de consolidar entidade
