# Perfil Consolidado de Entrada para a IA

## Objetivo

Definir o pacote minimo e recomendado de informacoes que deve ser montado antes de enviar um personagem para avaliacao por IA.

Sem esse perfil consolidado, a IA tende a superestimar, simplificar ou chutar atributos, traits e habilidades.

## Principio

A IA nao deve receber apenas o payload cru da API publica.

Ela deve receber um dossie consolidado do personagem, contendo:

- identidade canonica
- aparicoes
- evidencias da obra
- contexto narrativo
- notas de relacionamento e comportamento quando disponiveis

## Estrutura proposta

```json
{
  "character_id": "char_001",
  "canonical_identity": {},
  "source_snapshot": {},
  "appearance_summary": {},
  "evidence_bundle": [],
  "narrative_context": {},
  "combat_context": {},
  "quality_flags": {}
}
```

## Blocos obrigatorios

### `character_id`

Identificador interno da entidade consolidada.

### `canonical_identity`

Dados canonicos minimamente consolidados.

Campos sugeridos:

- `name`
- `canonical_label`
- `source_ids`
- `species`
- `type`
- `gender`
- `status`
- `origin_name`
- `location_name`
- `image_url`

### `source_snapshot`

Resumo das fontes que sustentam o personagem.

Campos sugeridos:

- `primary_source`
- `secondary_sources`
- `last_synced_at`
- `source_confidence`

### `appearance_summary`

Resumo de aparicoes e contexto de tela.

Campos sugeridos:

- `episode_count`
- `first_seen_episode`
- `last_seen_episode`
- `season_span`
- `major_arc_presence`

### `evidence_bundle`

Colecao de evidencias da obra.

Cada item deve conter:

- `evidence_type`
- `title`
- `description`
- `season_number`
- `episode_code`
- `confidence`
- `is_manual_verified`

### `narrative_context`

Contexto de personalidade e papel no universo.

Campos sugeridos:

- `role_summary`
- `behavioral_patterns`
- `recurring_motifs`
- `social_patterns`
- `known_limitations`

### `combat_context`

Interpretações de combate sem fechar mecanica ainda.

Campos sugeridos:

- `offensive_signals`
- `defensive_signals`
- `technology_signals`
- `initiative_signals`
- `instability_signals`
- `influence_signals`

### `quality_flags`

Indicadores de qualidade do dossie.

Campos sugeridos:

- `has_minimum_evidence`
- `has_multi_source_support`
- `has_manual_review`
- `is_variant_identity`
- `is_low_confidence_profile`

## Niveis de completude

### Nivel 0 — cru

Somente dados da API publica.

Uso:

- proibido para atribuicao final de personagem complexo

### Nivel 1 — basico

Dados canonicos + episodios + algumas evidencias.

Uso:

- aceitavel para personagens secundarios simples

### Nivel 2 — consolidado

Dados canonicos + evidencias + contexto narrativo + sinais de combate.

Uso:

- nivel recomendado para avaliacao da IA

### Nivel 3 — revisado

Perfil consolidado com verificacao manual parcial.

Uso:

- recomendado para protagonistas, antagonistas e variantes centrais

## Regras de envio para a IA

- nao enviar personagem sem `character_id`
- nao enviar personagem sem `canonical_identity`
- nao enviar personagem sem ao menos um conjunto minimo de evidencias
- marcar explicitamente quando o perfil for de baixa confianca
- marcar explicitamente quando o personagem for variante de uma familia maior

## Casos que exigem perfil reforcado

- Rick variants
- Morty variants
- personagens duplicados com nomes parecidos
- personagens que mudam muito ao longo da obra
- personagens com aparicoes pequenas mas feitos muito fortes

## Resultado esperado

O perfil consolidado deve reduzir a liberdade interpretativa da IA e aumentar consistencia entre avaliacoes.
