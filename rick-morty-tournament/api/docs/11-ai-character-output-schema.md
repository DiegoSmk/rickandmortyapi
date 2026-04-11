# Schema de Saida da IA por Personagem

## Objetivo

Definir o contrato exato que a IA deve devolver ao avaliar um personagem para o jogo.

Esse contrato serve para:

- validar a resposta da IA
- permitir persistencia auditavel
- separar avaliacao narrativa de mecanica executavel

## Principios

- saida obrigatoriamente em JSON puro
- sem markdown
- sem texto fora do schema
- sem criacao de traits ou habilidades fora da biblioteca aprovada
- toda decisao importante precisa de justificativa curta

## Estrutura de alto nivel

```json
{
  "character_id": "char_001",
  "analysis_version": "v1",
  "attributes": {},
  "attribute_reasoning": {},
  "traits": [],
  "weaknesses": [],
  "abilities": [],
  "narrative_summary": "",
  "confidence": {},
  "evidence_summary": []
}
```

## Campos obrigatorios

### `character_id`

Identificador interno do personagem avaliado.

### `analysis_version`

Versao do schema e da estrategia de atribuicao.

### `attributes`

Objeto com os seis atributos do jogo:

```json
{
  "caos": 0,
  "sobrevivencia": 0,
  "instabilidade": 0,
  "genialidade": 0,
  "influencia": 0,
  "vitalidade": 0
}
```

Regra:

- todos os valores devem estar entre `0` e `100`

### `attribute_reasoning`

Justificativa curta por atributo.

```json
{
  "caos": "Texto curto",
  "sobrevivencia": "Texto curto",
  "instabilidade": "Texto curto",
  "genialidade": "Texto curto",
  "influencia": "Texto curto",
  "vitalidade": "Texto curto"
}
```

Regra:

- cada justificativa deve ser curta, objetiva e ancorada em comportamento ou feitos

### `traits`

Lista de traits da biblioteca aprovada.

Formato:

```json
[
  {
    "slug": "initiative",
    "score": 78,
    "reason": "Costuma agir primeiro em situacoes de conflito.",
    "confidence": 0.82
  }
]
```

Regras:

- apenas `slug` aprovado
- `score` entre `0` e `100`
- `confidence` entre `0` e `1`

### `weaknesses`

Lista de fraquezas aprovadas.

Formato:

```json
[
  {
    "slug": "reckless",
    "score": 66,
    "reason": "Se expoe demais por impulsividade.",
    "confidence": 0.77
  }
]
```

### `abilities`

Lista de habilidades selecionadas da biblioteca aprovada.

Formato:

```json
[
  {
    "slug": "first_strike_round_1",
    "power_level": 72,
    "reason": "Demonstra tendencia de iniciar confrontos e ganhar a primeira acao.",
    "confidence": 0.81
  }
]
```

Regras:

- apenas `slug` aprovado
- sem inventar payload novo
- `power_level` entre `0` e `100`

### `narrative_summary`

Resumo curto do perfil jogavel do personagem.

Exemplo:

- "Combatente imprevisivel, altamente inteligente e perigoso em confrontos curtos."

### `confidence`

Objeto de confianca agregada.

Formato:

```json
{
  "overall": 0.84,
  "attributes": 0.86,
  "traits": 0.8,
  "weaknesses": 0.78,
  "abilities": 0.79
}
```

### `evidence_summary`

Lista resumida das evidencias usadas.

Formato:

```json
[
  "Demonstrou dominio tecnologico recorrente.",
  "Mostrou capacidade alta de manipular pessoas.",
  "Apresentou comportamento instavel em multiplos contextos."
]
```

## Exemplo completo

```json
{
  "character_id": "char_001",
  "analysis_version": "v1",
  "attributes": {
    "caos": 88,
    "sobrevivencia": 63,
    "instabilidade": 91,
    "genialidade": 99,
    "influencia": 74,
    "vitalidade": 68
  },
  "attribute_reasoning": {
    "caos": "Possui alto potencial destrutivo e capacidade ofensiva indireta.",
    "sobrevivencia": "Costuma sobreviver a cenarios extremos, mas nao e um tank puro.",
    "instabilidade": "Tem comportamento altamente imprevisivel e perigoso.",
    "genialidade": "Demonstra inteligencia cientifica excepcional de forma recorrente.",
    "influencia": "Manipula e convence outros personagens com frequencia.",
    "vitalidade": "Tem boa resistencia estrutural, mas nao depende de vigor fisico bruto."
  },
  "traits": [
    {
      "slug": "initiative",
      "score": 82,
      "reason": "Costuma tomar a dianteira em conflitos.",
      "confidence": 0.83
    },
    {
      "slug": "tech_user",
      "score": 99,
      "reason": "Tecnologia e ciencia sao centrais para sua atuacao.",
      "confidence": 0.97
    },
    {
      "slug": "chaotic",
      "score": 88,
      "reason": "Opera muito bem em cenarios instaveis e gera caos.",
      "confidence": 0.86
    }
  ],
  "weaknesses": [
    {
      "slug": "ego_driven",
      "score": 61,
      "reason": "Excesso de confianca interfere em suas decisoes.",
      "confidence": 0.74
    },
    {
      "slug": "socially_disruptive",
      "score": 55,
      "reason": "Relacoes interpessoais frequentemente entram em colapso.",
      "confidence": 0.69
    }
  ],
  "abilities": [
    {
      "slug": "first_strike_round_1",
      "power_level": 74,
      "reason": "Age cedo e tenta controlar o ritmo do confronto.",
      "confidence": 0.8
    },
    {
      "slug": "tech_combo_boost",
      "power_level": 93,
      "reason": "Seu desempenho depende fortemente de uso tecnologico.",
      "confidence": 0.95
    }
  ],
  "narrative_summary": "Perfil extremamente inteligente, caotico e ofensivamente perigoso, com alta dependencia de tecnologia e forte capacidade de manipular o combate.",
  "confidence": {
    "overall": 0.85,
    "attributes": 0.88,
    "traits": 0.87,
    "weaknesses": 0.72,
    "abilities": 0.88
  },
  "evidence_summary": [
    "Dominio tecnologico recorrente em diversos episodios.",
    "Sobrevive a cenarios extremos usando improviso e ciencia.",
    "Manipula aliados e adversarios com alta frequencia."
  ]
}
```

## Regras de validacao

- rejeitar `slug` fora da biblioteca aprovada
- rejeitar scores fora da faixa
- rejeitar lista vazia de atributos
- rejeitar ausencia de justificativa por atributo
- rejeitar mais habilidades do que o limite da fase
- rejeitar respostas sem fraqueza quando houver evidencia suficiente

## Uso na persistencia

O sistema deve persistir:

- payload bruto validado
- versao do schema
- versao do prompt
- modelo utilizado
- timestamp

## Evolucao futura

Versoes futuras podem adicionar:

- relacoes entre habilidades
- sinergias de deck
- pesos por contexto de combate
- explicacoes mais estruturadas por evidencia
