# Rick and Morty Tournament API

API proprietaria para catalogo, sincronizacao, enriquecimento e selecao de personagens usados pelo jogo.

Este diretorio agora contem o scaffold inicial da implementacao, incluindo banco SQLite, bootstrap da API publica e configuracao base do Gemini para enrichment.

## Objetivos

- Remover dependencia runtime da API publica do Rick and Morty
- Manter um catalogo local, consultavel e versionavel
- Suportar sincronizacao incremental com a API publica
- Enriquecer campos faltantes com Gemini quando necessario
- Expor endpoints especificos para o jogo, especialmente roster de torneio

## Stack proposta

- Runtime: Node.js 22
- Framework HTTP: Fastify
- Banco: SQLite no inicio
- ORM / query layer: Drizzle ou Prisma
- Validacao: Zod
- IA: Gemini API
- Container: Docker + Docker Compose

## Estrutura planejada

- `docs/01-architecture.md`: arquitetura e fronteiras
- `docs/02-domain-model.md`: modelo de dados
- `docs/03-sync-spec.md`: sincronizacao com API publica
- `docs/04-gemini-enrichment.md`: enriquecimento com IA
- `docs/05-api-spec.md`: recursos e endpoints
- `docs/06-operations.md`: operacao, seguranca e observabilidade
- `docs/07-combat-evidence-model.md`: evidencias que sustentam atributos e regras
- `docs/08-traits-and-abilities.md`: traits, fraquezas e habilidades programaveis
- `docs/09-character-balancing-rules.md`: criterios de balanceamento jogavel
- `docs/10-phase-1-combat-library.md`: biblioteca inicial aprovada para IA selecionar
- `docs/11-ai-character-output-schema.md`: contrato oficial de saida da IA por personagem
- `docs/12-ai-input-character-profile.md`: dossie minimo e recomendado antes da avaliacao por IA
- `docs/13-identity-and-variant-resolution.md`: deduplicacao, matching e tratamento de variantes
- `docs/14-core-database-schema.md`: entidades centrais do banco e tratamento de dimensao
- `docs/15-multi-source-sync-and-reconciliation.md`: politica de prioridade entre fontes e reconciliacao
- `docs/16-phase-1-relational-schema.md`: tabelas, chaves e restricoes para iniciar a populacao
- `docs/17-phase-1-ingestion-flow.md`: ordem operacional para a primeira carga
- `docs/18-matching-thresholds-and-review-rules.md`: criterios objetivos de matching e revisao
- `docs/19-web-evidence-pipeline.md`: pipeline controlado para coletar evidencias externas antes do scoring
- `docs/20-source-allowlist-and-grounding-policy.md`: regras de allowlist, provenance e grounding
- `openapi.yaml`: especificacao inicial dos endpoints principais
- `Dockerfile`: container base da API
- `docker-compose.yml`: ambiente local para subir o container
- `.env.example`: variaveis de ambiente previstas

## Decisoes principais

- A API sera criada em `rick-morty-tournament/api`, separada do frontend e do shell Tauri
- O catalogo local sera a fonte da verdade do jogo
- A sincronizacao com a API publica sera assincroma e idempotente
- O enriquecimento por Gemini sera controlado e auditavel
- Busca externa nao sera livre; ela passara por allowlist, provenance e reconciliacao antes do Gemini
- O frontend consumira a API propria, nao a API publica
- O segredo do Gemini nao fica no codigo nem no repositorio; ele entra no container via variavel de ambiente

## Proximo passo quando a implementacao comecar

1. Inicializar projeto Node/Fastify
2. Definir schema inicial SQLite
3. Implementar import completo da API publica
4. Implementar sync incremental
5. Implementar endpoints de consulta e roster
6. Implementar pipeline de enriquecimento Gemini

## Execucao local com Docker

Subir a API em modo de desenvolvimento:

```bash
docker compose up --build
```

Para subir com Gemini habilitado, exporte a chave antes:

```bash
export GEMINI_API_KEY="sua-chave-aqui"
export ENABLE_GEMINI_ENRICHMENT=true
docker compose up --build
```

Rodar migrations dentro do container:

```bash
docker compose run --rm api npm run migrate
```

Rodar o bootstrap inicial da API publica:

```bash
docker compose run --rm api npm run bootstrap:public-api
```

Baixar e internalizar as imagens dos personagens:

```bash
docker compose exec -T api npm run bootstrap:character-images
```

Checar se o provider Gemini entrou corretamente no container:

```bash
curl http://localhost:8080/v1/admin/enrichment/provider
```
