# 20. Source Allowlist and Grounding Policy

## Objetivo

Definir as regras de quais fontes podem sustentar enriquecimento e como a IA deve tratar confianca.

## Politica de allowlist

A IA nunca recebe permissao para consultar "a web inteira".

Toda busca externa deve sair de uma allowlist controlada pela API.

## Allowlist inicial

- `rickandmortyapi.com`
- `thetvdb.com`
- `themoviedb.org`
- `rickandmorty.fandom.com`

## Niveis de confianca por fonte

### Alta

- `rickandmortyapi_public`
- `thetvdb`
- `tmdb`

Uso esperado:

- ids
- episodios
- temporadas
- nomes de personagem
- origem estruturada

### Media

- `fandom`

Uso esperado:

- feitos
- contexto narrativo
- relacoes
- comportamento

### Curadoria

- `manual_curation`

Uso esperado:

- correcao de ambiguidade
- ajuste fino de variante
- consolidacao de evidencias relevantes

## Regras de grounding

### Regra 1

Nenhum atributo alto deve existir sem pelo menos uma evidencia clara.

### Regra 2

Traits e habilidades exigem justificativa observavel, nao fama geral do personagem.

### Regra 3

Quando a evidencia for curta, rara ou contraditoria:

- reduzir score
- reduzir confidence
- evitar habilidades fortes

### Regra 4

Quando a variante for ambigua:

- nao anexar evidencia automaticamente
- mandar para revisao

### Regra 5

Evidencia derivada de fandom sem suporte adicional nao pode ser tratada como verdade absoluta.

## Campos minimos de provenance

Toda evidencia externa precisa manter:

- `source_name`
- `source_url`
- `source_ref`
- `captured_at`
- `confidence`
- `extraction_method`

## Extraction methods previstos

- `structured_api`
- `page_parse`
- `manual_review`
- `ai_normalized_from_source`

## Regras para a IA de scoring

O scoring final deve:

- ler o pacote de evidencias
- respeitar provenance
- considerar conflitos
- refletir falta de base na confidence

O scoring final nao deve:

- inventar fonte
- inventar episodio
- transformar uma fan theory em feito confirmado

## Decisao

Busca externa sera permitida apenas via pipeline controlado e com allowlist.

Nao sera adotado, como regra principal, um modo em que a IA pesquise livremente e decida sozinha o que e canonico.
