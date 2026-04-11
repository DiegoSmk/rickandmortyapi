# Thresholds de Matching e Regras de Revisao

## Objetivo

Definir criterios objetivos para decidir:

- se um personagem ja existe
- se e uma nova entidade
- se e uma variante
- se precisa de revisao manual

## Principio

Sem threshold objetivo, o sistema fica inconsistente e perigoso para um universo com muitas variantes.

## Sinais de matching

### Sinais fortes

- mesmo `source_name` + `source_id`
- mesma URL canonica de fonte
- mesma entidade ja previamente consolidada

### Sinais medios

- nome muito semelhante
- mesma especie
- mesma origem
- mesma localizacao
- mesma familia de variante

### Sinais fracos

- nome parcialmente parecido
- mesma especie apenas
- mesmo arquétipo narrativo

## Score sugerido

Faixa de confianca de matching:

- `0.90 a 1.00` -> `exact_match`
- `0.75 a 0.89` -> `probable_match`
- `0.50 a 0.74` -> `ambiguous`
- `< 0.50` -> `new_entity`

## Regras praticas

### `exact_match`

Quando:

- `source_name + source_id` ja existem
ou
- URL canonica da mesma fonte bate com entidade consolidada

Acao:

- atualizar entidade existente

### `probable_match`

Quando:

- ha forte semelhanca contextual
- nao ha conflito relevante de variante
- dimensao nao contradiz a entidade existente

Acao:

- permitir associacao automatica com auditoria

### `ambiguous`

Quando:

- existem 2 ou mais candidatos plausiveis
- a familia e a mesma, mas a variante pode ser diferente
- a dimensao ou o contexto nao sao suficientes

Acao:

- nao consolidar automaticamente
- abrir revisao manual

### `new_entity`

Quando:

- nao existe match forte
- o conjunto de sinais nao e suficiente
- ha forte indicio de nova variante

Acao:

- criar nova entidade canonica

## Regras especiais para Rick e Morty

Para personagens da familia Rick ou Morty:

- nome parecido nunca e suficiente
- dimensao conhecida aumenta peso, mas nao decide sozinha
- diferenca forte de contexto narrativo pesa como variante nova
- conflito entre duas fontes deve cair em revisao manual com facilidade maior

## Casos que obrigam revisao manual

- duas entidades com score parecido
- mesma familia com dimensao conflitante
- mesma familia com feats muito diferentes
- aliases contraditorios
- baixa confianca + alto impacto no jogo

## Resultado esperado

O sistema fica mais conservador onde precisa e evita colapsar variantes distintas na mesma entidade.
