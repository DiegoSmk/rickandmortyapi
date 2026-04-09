# Rick & Morty — Torneio Dimensional

## Visão Geral do Jogo

| Campo | Valor |
|-------|-------|
| Tipo | Torneio Mata-Mata (Card Battle) |
| Participantes | 16 personagens (aleatórios da API) |
| Formato | Quartas → Semis → Final → Campeão (3 fases) |
| Controle | Apostador (não controla personagens) |
| Moeda | Flurbos |
| Persistência | Por dispositivo |

---

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

- Cada partidatem até 8 turnos
- Vencedoravança parasubsequente fase com estado (HP, cartas, buffs) persistido
- Cartas em CD não são resetadasenter fases

---

## Sistema de Batalha

### Turno

Cada personagemescolheuma das 3 ações por turno:

| Ação | Descrição |
|------|----------|
| **ATACAR** | Usa ATK base contra DEF do oponente. Dano = max(0, ATK_ATK − DEF_DEF) |
| **CARTA** | Joga uma carta do deck. Não pode atacar nem defender neste turno |
| **RECARGA** | Recupera energia e reduz 1 round de CD em 1 carta |

### Ordem de Resolução

Cartas são resolvidas nesta ordem (importa estratégica):

```
DIMENSIONAL → DEFESA → BUFF → CAMPO → ATAQUE ESPECIAL → ATAQUE BASE
```

---

## Personagem (Carta Base)

Cada personagemda API gerauma carta-base com atributos derivados + enriquecidos:

```
┌─────────────────────────────────────────────┐
│  RICK C-137                                 │
│  ─────────────────────────────────────────  │
│  ATK: 85  |  DEF: 40  |  HP: 120          │
│  ─────────────────────────────────────────  │
│  TIPO DE ATAQUE: Tecnológico                 │
│  → Ignora 20% da DEF adversária            │
│  ─────────────────────────────────────────  │
│  PASSIVA: Gênio Instável                    │
│  → +10 ATK no próximoataque após usar carta│
│  ─────────────────────────────────────────  │
│  LIMITAÇÃO: Flask Obrigatório              │
│  → 1× por batalha: HP < 30 ativaefeitoaleatório │
└─────────────────────────────────────────────┘
```

### Atributos Gerados por IA

| Atributo | Origem |
|---------|-------|
| **ATK** | Baseado em episódiosq apareciuem + tipo (físico/mágico) |
| **DEF** | Baseado em espécie + status (vivo>morto) |
| **HP** | Baseado em importância narrativa (Rick > Morty > Outros) |
| **TIPO** | Derivado da espécie e origem (Humano=Técnico, Alien=Físico, Entidade=Caótico) |
| **PASSIVA** | Gerada por IA com basena lore do personagem |
| **LIMITAÇÃO** | Gerada por IA соm base em fraquezas narrativas |

---

## Deck do Personagem

Cada personagem recebe 4 cartoonhaipes porperfil durante a geracao do torneo:

**Perfis e Probabilidades**

| Perfil | Pool Principal |
|--------|----------------|
| **Rick** | Portal Gun, Mega Seeds, Neutrino Bomb, Flask do Rick |
| **Morty** | Meeseeks Box, Apagador, Robô de Manteiga, Flask |
| **Alien Físico** | Freeze Ray, Raio Redutor, Escudo de Força, Blaster |
| **Caótico** | Cronenberg Serum, instability Dimensional, Transmutador |
| **Genérico** | Plumbus, Sapatos Antigravidade, Scanner, Granada |

### Tipos de Carta

| Tipo | Comportamento | Exemplo |
|------|---------------|---------|
| **[CAMPO]** | Fica em campo aplicando efeitos. Pode ser atacada. HP próprio. | Mecha Suit |
| **[DEFESA]** | Absorve dano no lugar do personagem. Pode ser destruída. | Escudo de Força |
| **[BUFF]** | Efeito imediato, dura N turnos. Não é entidade. | Mega Seeds |
| **[ATAQUE ESP.]** | Ataque + efeito no mesmo turno (tag [SIMULTÂNEO]) | Neutrino Bomb |
| **[DIMENSIONAL]** | Resolve antes de qualquer ação. Cancela/penaliza. | Portal Gun |

### Carta sample — Campo

```
┌─────────────────────────────────────────────┐
│  MECHA SUIT                    [CAMPO]      │
│  HP: 80  |  DEF: 50                            │
│  ─────────────────────────────────────────  │
│  Ao entrar: personagem não ataca            │
│  ─────────────────────────────────────────  │
│  While ativo:                               │
│    +40 ATK no ataque base                    │
│    +30 DEF ao personagem                    │
│  ─────────────────────────────────────────  │
│  Ao destruir:                               │
│    Explosão → 20 dano aooponente             │
│  ─────────────────────────────────────────  │
│  CD pós-destruição: 1 batalha                │
└─────────────────────────────────────────────┘
```

### Carta sample — Buff

```
┌─────────────────────────────────────────────┐
│  MEGA SEEDS                     [BUFF]      │
│  Duração: 2 turnos                          │
│  ─────────────────────────────────────────  │
│  +35 ATK por 2 turnos                        │
│  ─────────────────────────────────────────  │
│  Ao expirar:                                │
│    -15 ATK por 1 turno (crash cerebral)      │
│  ─────────────────────────────────────────  │
│  CD: 4 rounds detorneio                      │
└─────────────────────────────────────────────┘
```

### Carta sample — Ataque Especial

```
┌─────────────────────────────────────────────┐
│  NEUTRINO BOMB               [ATAQUE ESP.]  │
│                            [SIMULTÂNEO]     │
│  ─────────────────────────────────────────  │
│  Dano fixo: 55                              │
│  Ignora DEF e cartas de campo                 │
│  ─────────────────────────────────────────  │
│  Custo: próximo turno em Recarga            │
│  ─────────────────────────────────────────  │
│  CD: 8 rounds de torneo                     │
└───────────��─────────────────────────────────┘
```

### Carta sample — Dimensional

```
┌─────────────────────────────────────────────┐
│  PORTAL GUN                   [DIMENSIONAL]│
│  ─────────────────────────────────────────  │
│  Cancela completamente a ação adversária    │
│  neste turno (ataque ou carta)             │
│  ─────────────────────────────────────────  │
│  Adiciona +3 rounds de CD nacarta cancelada │
│  ─────────────────────────────────────────  │
│  CD: 6 rounds de tournament                 │
└─────────────────────────────────────────────┘
```

---

## Estados das Cartas

| Estado | Descrição |
|--------|-----------|
| **[DISPONÍVEL]** | Pode ser jogada |
| **[ATIVA]** | Carta de campo/defesa em jogo |
| **[EM CD]** | Aguardando X rounds de tournaments |
| **[DESTRUÍDA]** | Eliminada em campo → entra em CD obrigatório de 1 batalha |
| **[EXPIRADA]** | Buff terminou normalmente → entra em CD normal |

---

## Sistema de Apostas

### Apostas Pré-Batalha

Antes decada confronto, o jogadortemFlurbosepode apostaremum dos dois personagens:

```
APOSTAR EM:
  [Personagem A] vs [Personagem B]
  
Quantos Flurbos? → [ Input ]
```

- Seacertar → multiplicaFlurbos apostados
- Se errar → perde Flurbos apostados

### Visualização Pré-Batalha

O jogador vê ambos os personagens com:

- Atributos base (ATK, DEF, HP)
- Deck de 4 cartas (nome + tipo)
- Estado das cartas (DISPONÍVEL / EM CD / ATIVA)
- histórico deHP anterior (se veio de batalha anterior)

---

## Sistema de Trapaças (Gimmicks)

O universo de Rick and Morty revolveu ao redor de trapaças, esquemaese corrupção. O sistemade trapaçaspermiteao jogador influenciaro resultado a cambio deFlurbos e com risco de penalidade.

### Trapaças Disponível

| Trapaça | Custo | Efeito | Risco (ao falhar) |
|---------|-------|--------|-------------------|
| **Emissor de Interferência** | 50 Flurbos | Faz uma carta específica do oponente falhar | -30 Flurbos, não pode Apostar por 3 turnos |
| **Ampulheta Dimensional** | 75 Flurbos | Dá +25 ATK ou +25 DEF a um personagem por 1 turno | -50 Flurbos, não pode Apostar por 3 turnos |
| **Microfone do Jerry** | 30 Flurbos | Revela a próximo carta que o oponente vai jogar | -20 Flurbos, não pode Apostar por 2 turnos |
| **Serum da Persuasão** | 100 Flurbos | Altera o resultado de um efeito aleatório a seu favor | -75 Flurbos, não pode Apostar por 5 turnos |

### Risk x Reward

Cada trapaça temum **teste de detecção**:

```Detecção = (Valor da Trapaça) - (Nível de Segurança do Apostador) + random(1-20)
```

- Se Detecção ≤ 10 → Sucesso total
- Se Detecção 11-20 → Sucecsso parcial (的一半 do efeito)
- Se Detecção > 20 → FALHA → penalidade aplicadapara jogador (não para personaje)

### Referências da Obra

| Trapaça | Origem no Episódio |
|---------|------------------|
| Emissor de Interferência | „The Rickshank Rickdemption" - Rick escapa da prisão |
| Ampulheta Dimensional | „Time Travel Shoes" - Rick viajas no tempo |
| Microfone do Jerry | „Get Schwifty" - Jerryhost programa de TV |
| Serum da Persuasão | „Pickle Rick" - Rick transforma em picles |

---

## Fluxo do Jogo

```
1. GERAR TORNEIO
   ├── Busca 16 personagens da API (aleatório)
   ├── Gera deck de 4 cartas por perfil para cada um
   ├── Salva no dispositivo (persistência)
   └── Gera chaveamento aleatório

2. QUARTAS DE FINAL
   ├── Apresenta confronto (Personagem A vs B)
   ├── Jogadorvisualiza stats + deck + HP anterior
   ├── [Opcional] Jogador usa trapaça
   ├── Jogador apostae Flurbos
   ├── Batalha: 8 turnos máx (turno-a-turno)
   ├── Resultado → vencedoravança, perdedor eliminado

3. SEMI-FINAL (repetem quartas)
   └── same flow

4. FINAL (mesmo fluxo)
   └── Campeão Dimensional

5. FIM DE TORNEIO
   ├── Flurbos atualizados
   ├── Ranking de personagens
   └── [Opcional] novo torneo
```

---

## Persistência Local (device)

Salvo no localStorage do navegador:

```json
{
  "deviceId": "device_abc123",
  "flurbos": 500,
  "characters": {
    "1": {
      "name": "Rick Sanchez",
      "atk": 85,
      "def": 40,
      "hp": 120,
      "deck": [
        {"name": "Portal Gun", "type": "DIMENSIONAL", "cd": 0, "state": "DISPONIVEL"},
        {"name": "Mega Seeds", "type": "BUFF", "cd": 0, "state": "DISPONIVEL"},
        {"name": "Neutrino Bomb", "type": "ATAQUE ESP.", "cd": 0, "state": "DISPONIVEL"},
        {"name": "Flask do Rick", "type": "CAOTICO", "cd": 0, "state": "DISPONIVEL"}
      ]
    }
  },
  "tournament": {
    "status": "NOT_STARTED",
    "currentRound": 0,
    "bracket": []
  },
  "penalties": {
    "banEndsAt": null,
    "flurbosLocked": 0
  }
}
```

---

## API Externa

### Rick & Morty API (Original)

- **Base**: `https://rickandmortyapi.com/api`
- **Personagens**: `/character`
- **Imagens**: `/character/avatar/{id}.jpeg`

###Sua API (Backend Proposto)

Endpoints sugeridos:

```
GET  /api/character/:id
     → dados base (da API original)
     → stats de combate (gerados por IA)
     → pool de itens disponíveis
     → passiva + limitação

GET  /api/tournament/generate?size=16
     → 16 personagens aleatórios enriquecidos
     → chaveamento gerado

GET  /api/items
     → lista completa de itens com efeitos
```

---

## Glossário

| Termo | Definição |
|------|----------|
| **Flurbos** | Moeda do jogo |
| **CD** | Cooldown (turnos de espera |
| **Campo** | Carta ativa em jogo (tem HP próprio) |
| **Turno** | Uma jogada por personagem |
| **Batalha** | Confronto (máx 8 turnos) |
| **Torneio** | Competição completa (3 fases) |
| **Gimmick** | Trapaça do jogador |

---

## Próximos Passos

1. [ ] Implementar protótipo funcional (sem API ainda)
2. [ ] Design da architecture de API com IA
3. [ ] Testar balanceamento de cartas
4. [ ] Implementar sistema de persistência
5. [ ] Adicionar mais cartas/itens temáticos