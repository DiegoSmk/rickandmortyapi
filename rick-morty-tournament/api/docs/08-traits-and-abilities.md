# Traits e Habilidades Programaveis

## Objetivo

Permitir mecanicas no estilo TCG / card battle que facam sentido dentro do universo da serie, mas sem permitir que a IA invente regras arbitrarias.

## Principio

A IA nao cria mecanicas livres.

A IA pode:

- sugerir traits
- sugerir fraquezas
- selecionar habilidades de uma biblioteca fechada
- justificar a selecao com base em evidencias

## Entidade `combat_trait`

Trait representa uma propriedade semantica de combate.

Campos sugeridos:

- `id`
- `slug`
- `name`
- `description`
- `category`
- `is_positive`
- `is_negative`
- `version`

## Traits iniciais sugeridos

- `initiative`
- `first_strike`
- `evasive`
- `resilient`
- `tech_user`
- `schemer`
- `manipulative`
- `chaotic`
- `unstable`
- `cowardly`
- `reckless`
- `dimensionally_aware`
- `supportive`
- `fragile`
- `leader`

## Entidade `character_trait`

Relaciona personagem a um trait.

Campos sugeridos:

- `id`
- `character_id`
- `trait_id`
- `score`
- `reason`
- `confidence`
- `source_mode`
- `verified`

## Entidade `ability`

Biblioteca fechada de habilidades programaveis.

Campos sugeridos:

- `id`
- `slug`
- `name`
- `description`
- `trigger_type`
- `targeting_type`
- `effect_type`
- `rule_payload`
- `version`
- `is_active`

## Entidade `character_ability`

Relaciona personagem a habilidade.

Campos sugeridos:

- `id`
- `character_id`
- `ability_id`
- `power_level`
- `reason`
- `confidence`
- `evidence_refs`
- `source_mode`
- `verified`

## Habilidades iniciais sugeridas

### `first_strike_round_1`

Uso:

- personagem age primeiro no primeiro turno

Payload sugerido:

```json
{
  "trigger_type": "round_start",
  "condition": { "round_lte": 1 },
  "effect": { "action_priority_bonus": 100 }
}
```

### `chaotic_spike`

Uso:

- chance de pico de caos no inicio do turno

### `tech_combo_boost`

Uso:

- cartas tecnológicas recebem bonus

### `panic_under_pressure`

Uso:

- quando a vitalidade cair abaixo de um limite, perde eficiencia

### `manipulate_targeting`

Uso:

- altera alvo ou ordem de acao em situacoes especificas

### `survival_rebound`

Uso:

- pequena recuperacao ou mitigacao ao sobreviver a dano alto

## Fraquezas

As fraquezas tambem devem ser modeladas.

Exemplos:

- `impulsivo`
- `fisicamente_fragil`
- `instavel_demais`
- `dependente_de_tecnologia`
- `ego_excessivo`
- `covarde`
- `facilmente_destrutivel`

## Regra de projeto

- trait nao e a mesma coisa que habilidade
- habilidade nao e a mesma coisa que atributo
- fraqueza nao deve ser deduzida apenas por ausencia de forca

## Regra para IA

A IA deve:

1. ler evidencias
2. pontuar traits
3. sugerir fraquezas
4. escolher habilidades existentes na biblioteca
5. justificar a atribuicao

Nao deve:

- criar slug novo de habilidade sem aprovacao humana
- inventar trigger sem suporte do motor
- criar regra sem payload validavel
