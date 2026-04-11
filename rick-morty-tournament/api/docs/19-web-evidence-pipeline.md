# 19. Web Evidence Pipeline

## Objetivo

Permitir uso de informacoes da web no enrichment sem deixar o modelo pesquisar livremente.

O principio da fase 2 sera:

1. a API coleta evidencias de fontes permitidas
2. a API normaliza e salva essas evidencias
3. a IA recebe apenas o dossie consolidado
4. a IA nao navega sozinha nem escolhe fonte por conta propria

Isso garante:

- rastreabilidade
- repetibilidade
- controle de qualidade
- menor risco de misturar variantes erradas de Rick e Morty

## Regra central

Nao usar "IA com busca livre" como fonte primaria de verdade canonica.

A web pode ser usada, mas apenas por um pipeline controlado pela API.

## Fontes permitidas

### Prioridade por tipo de dado

#### Episodios e temporadas

1. `thetvdb`
2. `tmdb`
3. `fandom`

#### Personagens e identidade

1. `rickandmortyapi_public`
2. `fandom`
3. `thetvdb`
4. `tmdb`

#### Feitos, comportamento e papel narrativo

1. `fandom`
2. `manual_curation`
3. `episode_summary_derived`

## Etapas do pipeline

### 1. Candidate discovery

Para cada personagem:

- localizar paginas e registros compativeis nas fontes permitidas
- verificar se o match respeita nome, variante, familia e dimensao quando existir
- rejeitar match com confianca baixa

### 2. Evidence extraction

Extrair apenas evidencias observaveis:

- uso de tecnologia
- demonstracao de inteligencia
- iniciativa em combate
- resistencia a dano
- manipulacao social
- explosoes de caos
- dependencia de recurso externo
- comportamento covarde, imprudente ou instavel

Cada evidencia precisa carregar:

- `source_name`
- `source_url`
- `source_ref`
- `evidence_type`
- `title`
- `description`
- `season_number` quando houver
- `episode_code` quando houver
- `confidence`
- `is_manual_verified`

### 3. Evidence normalization

Converter o texto bruto em um formato uniforme.

Exemplo:

- texto web: "Rick improvises a weaponized gadget and disables the enemy before anyone reacts"
- evidencia normalizada:
  - `evidence_type`: `combat_speed`
  - `title`: `Age antes do oponente com tecnologia improvisada`
  - `description`: `Demonstrou acao preemptiva e uso tecnico em confronto direto`

### 4. Identity reconciliation

Antes de anexar a evidencia:

- validar personagem canonico
- validar familia de variante
- validar dimensao quando conhecida
- marcar ambiguidade para revisao manual

### 5. Dossier assembly

Montar um `evidence_bundle` consolidado por personagem:

- evidencias da API publica
- evidencias web aprovadas
- evidencias derivadas de episodio
- evidencias manuais verificadas

### 6. AI scoring

A IA recebe:

- identidade canonica
- contexto de aparicao
- evidencias estruturadas
- regras da biblioteca fechada de traits, fraquezas e habilidades

E devolve:

- atributos
- reasons
- traits
- weaknesses
- abilities
- confidence
- evidence_summary

## O que a IA nao pode fazer

- escolher fonte livremente
- navegar na web sem filtro
- citar feito sem `source_ref`
- inventar episodio
- misturar variantes por nome parecido
- promover teoria de fandom a fato canonico sem confianca reduzida

## Modo de operacao recomendado

### Fase 2A

- implementar conectores controlados
- popular `character_evidences`
- nao alterar ainda o modelo de combate

### Fase 2B

- passar o enrichment a consumir `character_evidences`
- reduzir dependencia do resumo curto de episodios

### Fase 2C

- adicionar fila de revisao manual para conflitos
- permitir re-score de personagem quando surgirem novas evidencias

## Endpoints recomendados

### Administrativos

- `POST /v1/admin/evidence/discover/:characterId`
- `POST /v1/admin/evidence/extract/:characterId`
- `POST /v1/admin/evidence/refresh/:characterId`
- `POST /v1/admin/evidence/run`
- `GET /v1/admin/evidence/runs`

### Consulta

- `GET /v1/characters/:id/evidences`
- `GET /v1/characters/:id/dossier`

## Observacao

Se no futuro for usado um provider com "grounded search", ele ainda deve operar sobre uma allowlist de fontes e o resultado precisa ser convertido para `character_evidences` antes de entrar no scoring final.
