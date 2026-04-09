# Rick & Morty — Torneio Dimensional

## Visão Geral do Jogo

| Campo | Valor |
|-------|-------|
| Nome | Rick & Morty Torneio Dimensional |
| Tipo | Torneio Mata-Mata + Card Battle |
| Participantes | 16 personagens (aleatórios da API) |
| Formato | Quartas → Semis → Final → Campeão (3 fases) |
| Controle | Apostador (não controla personagens) |
| Moeda | Flurbos |
| Persistência | Por dispositivo |

---

## APIs Externas

### Rick & Morty API (Original)

- **Base URL**: `https://rickandmortyapi.com/api`
- **GraphQL**: `https://rickandmortyapi.com/graphql`
- **Auth**: None (free)
- **Personagens**: 826
- **Localizações**: 126
- **Episódios**: 51
- **{Imagens}**: `https://rickandmortyapi.com/api/character/avatar/{id}.jpeg`

---

# Parte 1: API Reference (Rick & Morty API)

## Resources

| Resource | Endpoint | Count |
|----------|----------|-------|
| Character | `/character` | 826 |
| Location | `/location` | 126 |
| Episode | `/episode` | 51 |

## Pagination

- **Items per page**: 20
- **Page parameter**: `?page=n`
- **Info object**: `count`, `pages`, `next`, `prev`

```json
{
  "info": { "count": 826, "pages": 42, "next": "...", "prev": null },
  "results": []
}
```

---

### Character Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Character ID |
| `name` | string | Character name |
| `status` | string | `Alive`, `Dead`, `unknown` |
| `species` | string | Species |
| `type` | string | Type/subspecies |
| `gender` | string | `Female`, `Male`, `Genderless`, `unknown` |
| `origin` | object | `{name, url}` |
| `location` | object | `{name, url}` |
| `image` | string (url) | 300x300px |
| `episode` | array (urls) | Episodes |
| `url` | string (url) | Endpoint |
| `created` | string | Timestamp |

### Endpoints

```
GET /character
GET /character/{id}
GET /character/{ids}
GET /character?page={n}&name={name}&status={status}&species={species}&type={type}&gender={gender}
```

---

### Location Schema

| Field | Type |
|-------|------|
| `id` | int |
| `name` | string |
| `type` | string |
| `dimension` | string |
| `residents` | array (urls) |
| `url` | string |
| `created` | string |

### Episode Schema

| Field | Type |
|-------|------|
| `id` | int |
| `name` | string |
| `air_date` | string |
| `episode` | string |
| `characters` | array |
| `url` | string |
| `created` | string |

---

# Parte 2: Game Design

## Estrutura do Torneio

```
16 personagens sorteadosda API
         ↓
Quartas de Final (8 confrontos)
         ↓
Semi-Final (4 confrontos)
         ↓
Final (2 confrontos)
         ↓
Campeão Dimensional
```

- Cada batalhatem **até 8 turnos**
- Vencedoravança parasubsequente fase com estado persistido
- Cartas em CD **não são resetadas** enter fases

## Sistema de Batalha

### Ações por Turno

| Ação | Descrição |
|------|----------|
| **ATACAR** | ATK base vs DEF oponente. Dano = max(0, ATK − DEF) |
| **CARTA** | Joga uma carta do deck. Não ataca neste turno |
| **RECARGA** | Recupera energia e reduz 1 CD de uma carta |

### Ordem de Resolução

```
DIMENSIONAL → DEFESA → BUFF → CAMPO → ATAQUE ESPECIAL → ATAQUE BASE
```

---

## Carta Base do Personagem

Cada personagemda API gera atributos:

```
┌─────────────────────────────────────────────┐
│  RICK C-137                                 │
│  ATK: 85  |  DEF: 40  |  HP: 120          │
│  ─────────────────────────────────────────  │
│  TIPO: Tecnológico                          │
│  → Ignora 20% da DEF adversária            │
│  ─────────────────────────────────────────  │
│  PASSIVA: Gênio Instável                    │
│  → +10 ATK após usar carta                 │
│  ─────────────────────────────────────────  │
│  LIMITEÇÃO: Flask Obrigatório              │
│  → 1× por batalha: HP < 30 ativaefeito    │
└─────────────────────────────────────────────┘
```

### Atributos (Gerados por IA)

| Atributo | Origem |
|---------|-------|
| ATK | Episódiosq apareciuem + tipo |
| DEF | Espécie + status |
| HP | Importância narrativa |
| TIPO | Espécie/origem (Humano=Técnico, Alien=Físico, Caótico) |
| PASSIVA | Gerada por IA com lore |
| LIMITAÇÃO | Gerada por IA com fraquezas |

---

## Deck do Personagem

**4 cartas** por personagem, geradas porperfil:

| Perfil | Pool Principal |
|--------|----------------|
| Rick | Portal Gun, Mega Seeds, Neutrino Bomb, Flask |
| Morty | Meeseeks Box, Apagador, Robô Manteiga, Flask |
| Alien Físico | Freeze Ray, Raio Redutor, Escudo, Blaster |
| Caótico | Cronenberg Serum, Instabilidade, Transmutador |
| Genérico | Plumbus, Antigravidade, Scanner, Granada |

### Tipos de Carta

| Tipo | Comportamento | Exemplo |
|------|---------------|---------|
| **[CAMPO]** | Fica ativa. Pode ser atacada. HP próprio. | Mecha Suit |
| **[DEFESA]** | Absorve dano. Pode ser destruída. | Escudo de Força |
| **[BUFF]** | Efeito imediato, dura N turnos. | Mega Seeds |
| **[ATAQUE ESP.]** | Ataque + efeito (tag [SIMULTÂNEO]) | Neutrino Bomb |
| **[DIMENSIONAL]** | Resolve primeiro. Cancela/penaliza. | Portal Gun |

---

## Carta Sample — Campo

```
┌─────────────────────────────────────────────┐
│  MECHA SUIT                    [CAMPO]      │
│  HP: 80  |  DEF: 50                            │
│  ─────────────────────────────────────────  │
│  Ao entrar: personagem não ataca            │
│  While ativo: +40 ATK, +30 DEF            │
│  Ao destruir: Explosão → 20 dano          │
│  CD pós-destruição: 1 batalha                │
└─────────────────────────────────────────────┘
```

## Carta Sample — Buff

```
┌─────────────────────────────────────────────┐
│  MEGA SEEDS                     [BUFF]      │
│  Duração: 2 turnos                          │
│  +35 ATK por 2 turnos                        │
│  Ao expirar: -15 ATK por 1 turno              │
│  CD: 4 rounds                                │
└─────────────────────────────────────────────┘
```

## Carta Sample — Ataque Especial

```
┌─────────────────────────────────────────────┐
│  NEUTRINO BOMB               [ATAQUE ESP.]  │
│                            [SIMULTÂNEO]     │
│  Dano fixo: 55                              │
│  Ignora DEF e cartas de campo                 │
│  Custo: próximo turno em Recarga             │
│  CD: 8 rounds                               │
└─────────────────────────────────────────────┘
```

## Carta Sample — Dimensional

```
┌─────────────────────────────────────────────┐
│  PORTAL GUN                   [DIMENSIONAL]│
│  Cancela ação adversária +3 CD na carta     │
│  CD: 6 rounds                             │
└─────────────────────────────────────────────┘
```

---

## Estados das Cartas

| Estado | Descrição |
|--------|-----------|
| **[DISPONÍVEL]** | Pode ser jogada |
| **[ATIVA]** | Carta de campo em jogo |
| **[EM CD]** | Aguardando X rounds |
| **[DESTRUÍDA]** | CD obrigatório de 1 batalha |
| **[EXPIRADA]** | Buff terminou → CD normal |

---

## Sistema de Apostas

### Pré-Batalha

```
APOSTAR EM:
  [Personagem A] vs [Personagem B]
  
Quantos Flurbos? → [Input]
```

- Acertar → multiplicaFlurbos
- Errar → perde Flurbos

### Visualização Pré-Batalha

- Atributos base (ATK, DEF, HP)
- Deck de 4 cartas + estado
- HP anterior (se veio de batalha anterior)

---

## Sistema de Trapaças (Gimmicks)

### Trapaças Disponível

| Trapaça | Custo | Efeito | Risco (ao falhar) |
|---------|-------|--------|-------------------|
| **Emissor de Interferência** | 50 Flurbos | Faz carta do oponente falhar | -30 Flurbos, 3 turnos sem aposta |
| **Ampulheta Dimensional** | 75 Flurbos | +25 ATK ou +25 DEF por 1 turno | -50 Flurbos, 3 turnos sem aposta |
| **Microfone do Jerry** | 30 Flurbos | Revela próxima carta do oponente | -20 Flurbos, 2 turnos sem aposta |
| **Serum da Persuasão** | 100 Flurbos | Altera efeito aleatório | -75 Flurbos, 5 turnos sem aposta |

### Teste de Detecção

```
Detecção = Custo - Segurança + random(1-20)
```

- ≤ 10: Sucesso total
- 11-20: Sucesso parcial
- > 20: FAILHA + penalidade

### Referências da Obra

| Trapaça | Origem |
|---------|--------|
| Emissor de Interferência | "The Rickshank Rickdemption" |
| Ampulheta Dimensional | "Time Travel Shoes" |
| Microfone do Jerry | "Get Schwifty" |
| Serum da Persuasão | "Pickle Rick" |

---

## Fluxo do Jogo

```
1. GERAR TORNEIO
   ├── 16 personagensaleatórios
   ├── Gera deck por perfil (salvo)
   └── Chaveamentoaleatório

2. QUARTAS / SEMI / FINAL
   ├── Apresentaconfronto
   ├── Visualiza stats + deck
   ├── [Opcional] Usa trapaça
   ├── Apostae Flurbos
   ├── Batalha: 8 turnos máx
   └── Vencedoravança

3. FIM DE TORNEIO
   ├── Flurbos atualizados
   └── Novo torneo (opcional)
```

---

## Persistência Local

```json
{
  "deviceId": "device_xxx",
  "flurbos": 500,
  "characters": {
    "1": {
      "name": "Rick Sanchez",
      "atk": 85, "def": 40, "hp": 120,
      "deck": [...]
    }
  },
  "tournament": { "status": "NOT_STARTED", "round": 0 },
  "penalties": { "banEndsAt": null, "locked": 0 }
}
```

---

## Glossário

| Termo | Definição |
|------|----------|
| Flurbos | Moeda do jogo |
| CD | Cooldown |
| Campo | Carta ativa com HP |
| Turno | Uma jogada |
| Batalha | Confronto (máx 8 turnos) |
| Torneio | Competição completa |
| Gimmick | Trapaça do jogador |

---

## Sua API (Backend Proposto)

Endpoints sugeridos:

```
GET /api/character/:id
     → dados base + statsIA +deck

GET /api/tournament/generate?size=16
     → 16 personagens + chaveamento

GET /api/items
     → lista de itens com efeitos
```

---

## Links

- Rick & Morty API: https://rickandmortyapi.com/documentation
- Docs: https://rickandmortyapi.com
- GitHub: https://github.com/afuh/rick-and-morty-api