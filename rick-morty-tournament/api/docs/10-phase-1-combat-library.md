# Biblioteca de Combate — Fase 1

## Objetivo

Definir a primeira biblioteca fechada de:

- traits
- fraquezas
- habilidades programaveis

Essa biblioteca existe para a IA escolher de um conjunto controlado, em vez de inventar mecanicas novas.

## Regras da fase 1

- biblioteca pequena e auditavel
- mecanicas simples
- gatilhos claros
- payloads programaveis
- foco em coerencia com a serie

## Traits positivos aprovados

### `initiative`

Uso:

- personagem costuma agir primeiro ou tomar a dianteira

Categoria:

- `tempo`

### `evasive`

Uso:

- personagem evita dano, escapa ou se reposiciona bem

Categoria:

- `defesa`

### `resilient`

Uso:

- personagem aguenta dano, caos ou pressao acima da media

Categoria:

- `defesa`

### `tech_user`

Uso:

- personagem depende ou domina tecnologia como parte central do kit

Categoria:

- `tecnico`

### `schemer`

Uso:

- personagem planeja, manipula timing ou joga no longo prazo

Categoria:

- `controle`

### `manipulative`

Uso:

- personagem influencia comportamento, alvos ou decisoes dos outros

Categoria:

- `controle`

### `chaotic`

Uso:

- personagem opera bem em situacoes instaveis e pode gerar efeitos fora do padrao

Categoria:

- `caos`

### `dimensionally_aware`

Uso:

- personagem lida bem com portais, mudancas de cenario e efeitos dimensionais

Categoria:

- `especial`

### `supportive`

Uso:

- personagem ajuda aliados ou fortalece interacoes indiretas

Categoria:

- `suporte`

### `leader`

Uso:

- personagem organiza, dirige ou melhora o desempenho do grupo

Categoria:

- `suporte`

## Fraquezas aprovadas

### `fragile`

Uso:

- pouca durabilidade estrutural

### `cowardly`

Uso:

- perde eficiencia sob pressao

### `reckless`

Uso:

- tende a se expor demais

### `unstable`

Uso:

- varia muito de desempenho

### `ego_driven`

Uso:

- excesso de confianca prejudica decisao

### `tech_dependent`

Uso:

- cai de rendimento sem suporte tecnico

### `socially_disruptive`

Uso:

- dificuldade de cooperacao ou de manter estrategia coletiva

## Habilidades programaveis aprovadas

### `first_strike_round_1`

Intencao:

- agir primeiro no primeiro turno

Payload:

```json
{
  "trigger_type": "round_start",
  "targeting_type": "self",
  "effect_type": "modify_priority",
  "rule_payload": {
    "condition": { "round_lte": 1 },
    "priority_bonus": 100
  }
}
```

### `chaotic_spike`

Intencao:

- chance de receber bonus temporario de `caos`

Payload:

```json
{
  "trigger_type": "turn_start",
  "targeting_type": "self",
  "effect_type": "temporary_stat_bonus",
  "rule_payload": {
    "chance": 0.3,
    "stat": "caos",
    "value": 12,
    "duration_rounds": 1
  }
}
```

### `tech_combo_boost`

Intencao:

- cartas tecnologicas ficam mais fortes

Payload:

```json
{
  "trigger_type": "card_play",
  "targeting_type": "self",
  "effect_type": "conditional_card_modifier",
  "rule_payload": {
    "card_tag": "tech",
    "bonus_percent": 20
  }
}
```

### `panic_under_pressure`

Intencao:

- quando a vitalidade cai, o personagem perde rendimento

Payload:

```json
{
  "trigger_type": "health_threshold",
  "targeting_type": "self",
  "effect_type": "temporary_stat_penalty",
  "rule_payload": {
    "threshold_percent": 35,
    "stats": {
      "caos": -10,
      "influencia": -8
    }
  }
}
```

### `manipulate_targeting`

Intencao:

- pequena chance de redirecionar ou baguncar escolha de alvo

Payload:

```json
{
  "trigger_type": "target_selection",
  "targeting_type": "opponent",
  "effect_type": "retarget",
  "rule_payload": {
    "chance": 0.2
  }
}
```

### `survival_rebound`

Intencao:

- ao sobreviver a dano alto, ganha mitigacao ou recuperacao leve

Payload:

```json
{
  "trigger_type": "damage_taken",
  "targeting_type": "self",
  "effect_type": "conditional_recovery",
  "rule_payload": {
    "minimum_damage": 20,
    "heal_flat": 8,
    "max_triggers_per_battle": 1
  }
}
```

### `dimensional_escape`

Intencao:

- chance limitada de evitar um ataque ou efeito hostil

Payload:

```json
{
  "trigger_type": "incoming_attack",
  "targeting_type": "self",
  "effect_type": "evade",
  "rule_payload": {
    "chance": 0.18,
    "max_triggers_per_battle": 2
  }
}
```

### `social_pressure`

Intencao:

- reduz temporariamente a eficiencia do oponente via influencia

Payload:

```json
{
  "trigger_type": "turn_start",
  "targeting_type": "enemy",
  "effect_type": "temporary_stat_penalty",
  "rule_payload": {
    "chance": 0.22,
    "stats": {
      "instabilidade": -6,
      "caos": -6
    },
    "duration_rounds": 1
  }
}
```

## Regras de atribuicao

- um personagem comum deve receber de `0` a `2` habilidades
- personagens centrais podem receber ate `3` habilidades
- toda habilidade precisa apontar para evidencias
- toda fraqueza precisa ser explicitada quando aplicavel

## Regras para a IA

A IA pode:

- pontuar traits aprovados
- selecionar fraquezas aprovadas
- selecionar habilidades aprovadas

A IA nao pode:

- inventar novo trait
- inventar nova fraqueza
- inventar nova habilidade
- alterar payload aprovado

## Proxima evolucao

Fase 2 pode adicionar:

- habilidades de sinergia entre personagens
- efeitos por especie
- efeitos por familia de carta
- habilidades reativas por episodio ou arco narrativo
