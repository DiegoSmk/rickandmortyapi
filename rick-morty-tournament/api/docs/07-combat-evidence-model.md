# Modelo de Evidencias de Combate

## Objetivo

Criar uma camada factual entre a obra e o sistema do jogo.

Essa camada existe para evitar que atributos, vantagens, fraquezas e habilidades sejam atribuídos por chute.

## Principio central

O jogo nao deve inferir diretamente das fontes canonicas para mecanicas finais sem passar por evidencias observaveis.

Fluxo esperado:

1. fonte canonica ou complementar
2. evidencia observavel da obra
3. interpretacao ludica controlada
4. atributo, trait, fraqueza ou habilidade

## Entidade `character_evidence`

Cada registro representa uma evidencia observavel ligada a um personagem.

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
- `confidence`
- `is_manual_verified`
- `created_at`
- `updated_at`

## Tipos iniciais de evidencia

- `offensive_feat`
- `defensive_feat`
- `survival_feat`
- `technology_mastery`
- `strategy_feat`
- `social_manipulation`
- `leadership_feat`
- `chaotic_behavior`
- `initiative_feat`
- `mobility_feat`
- `resilience_feat`
- `cowardice_signal`
- `instability_signal`
- `dependency_signal`
- `failure_pattern`

## Exemplo de evidencia

```json
{
  "character_id": "char_001",
  "evidence_type": "initiative_feat",
  "title": "Age antes dos demais em situacoes de confronto",
  "description": "O personagem demonstra tendencia recorrente de reagir primeiro e tomar a iniciativa do conflito.",
  "source_kind": "episode",
  "source_name": "TheTVDB",
  "source_ref": "S03E01",
  "season_number": 3,
  "episode_code": "S03E01",
  "confidence": 0.84,
  "is_manual_verified": false
}
```

## Regras de qualidade

- uma habilidade importante nao deve nascer de uma unica evidencia fraca
- evidencias devem ser acumulativas quando possivel
- evidencias geradas por IA devem ser marcadas
- evidencias revisadas manualmente devem ter prioridade

## Fontes validas

- API publica canonica
- TheTVDB
- TMDb
- Fandom / Wiki
- curadoria manual

## Regras de confianca

- `high`: evidencia confirmada por fonte estruturada ou revisao manual
- `medium`: evidencia derivada de fonte semi estruturada ou consolidada
- `low`: evidencia sugerida por IA sem verificacao complementar

## Uso no sistema

As evidencias alimentam:

- atributos do jogo
- traits
- habilidades
- fraquezas
- score de confianca do personagem
