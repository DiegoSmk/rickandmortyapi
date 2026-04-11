# Resolucao de Identidade e Variantes

## Objetivo

Tratar corretamente personagens que:

- ja existem na base
- possuem variantes
- compartilham nome base
- pertencem a familias como Rick e Morty

Esse problema e central em Rick and Morty.
Nao basta usar o nome como chave de identidade.

## Principio

A identidade do jogo deve ser baseada em entidade consolidada, nao apenas em string de nome.

## Problema

Exemplos de risco:

- varios Ricks
- varios Mortys
- nomes quase iguais
- variantes dimensionais
- personagens com apelidos, titulos ou labels ambiguos

## Regra principal

`source_id` de uma fonte especifica identifica um registro naquela fonte.
Ele nao resolve sozinho a identidade global do personagem no seu sistema.

Por isso, o sistema deve separar:

- `source entity`
- `canonical entity`
- `variant family`

## Camadas de identidade

### `source_character`

Registro bruto vindo de uma fonte.

Exemplo:

- id 1 da API publica
- id X da wiki
- id Y do TMDb

### `canonical_character`

Entidade consolidada usada no jogo.

Essa e a unidade principal para:

- atributos
- traits
- habilidades
- roster

### `variant_family`

Grupo mais amplo para familias conceituais.

Exemplos:

- `rick_family`
- `morty_family`
- `summer_family`

## Campos sugeridos para identidade

### Em `canonical_character`

- `id`
- `canonical_name`
- `display_name`
- `variant_family_id`
- `canonical_kind`
- `identity_confidence`
- `is_variant`
- `is_fusion`
- `is_alias`

### Em `character_alias`

- `id`
- `character_id`
- `alias_name`
- `alias_type`

### Em `variant_family`

- `id`
- `slug`
- `name`
- `description`

### Em `source_character_link`

- `id`
- `character_id`
- `source_name`
- `source_id`
- `source_url`
- `match_status`
- `match_confidence`

## Estados de matching

- `exact_match`
- `probable_match`
- `ambiguous`
- `new_entity`
- `manual_review_required`

## Estrategia de resolucao

1. tentar match por `source_id` da mesma fonte
2. tentar match por URL canônica da fonte
3. tentar match por nome + contexto + origem + especie
4. tentar match por familia de variante
5. se continuar ambiguo, abrir revisao manual

## Regras especiais para Rick e Morty

- nome contendo `Rick` nao significa a mesma entidade
- nome contendo `Morty` nao significa a mesma entidade
- a familia pode ser a mesma, mas a entidade canonica pode ser diferente
- o sistema deve suportar:
  - mesma familia
  - entidades diferentes
  - kits diferentes

## Regras para o jogo

- duas variantes podem coexistir no catalogo
- cada variante pode ter atributos, traits e habilidades proprios
- familias servem para agrupamento e analise, nao para colapsar tudo numa entidade so
- o roster deve decidir se permite multiplas variantes na mesma composicao

## Quando considerar que "ja existe"

Considerar que ja existe apenas quando houver:

- match exato de fonte
ou
- match consolidado com alta confianca e sem ambiguidade

Nao considerar que ja existe apenas porque:

- o nome e parecido
- a familia e a mesma
- a variante e do mesmo arquétipo narrativo

## Casos obrigatorios de revisao manual

- dois ou mais candidatos com confianca parecida
- personagem novo da mesma familia com fonte divergente
- variante com feats muito diferentes da entidade mais conhecida
- mudanca de nome ou alias relevante

## Impacto na IA

O perfil enviado para a IA deve incluir:

- `canonical_name`
- `display_name`
- `variant_family`
- `is_variant_identity`
- resumo de diferenciacao da variante

Assim a IA nao mistura, por exemplo, um Rick dominante com outro Rick secundario ou fragil.

## Resultado esperado

O sistema passa a suportar:

- catalogo rico
- variantes coexistindo
- deduplicacao segura
- menos erro de identidade
- melhor coerencia na atribuicao de kit
