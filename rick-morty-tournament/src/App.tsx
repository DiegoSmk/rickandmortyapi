import { useState, useCallback, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";
import { HomeMenuButton } from "./components/HomeMenuButton";

interface Character {
  id: number;
  name: string;
  image: string;
  status: string;
  species: string;
  episode: string[];
  atk: number;
  def: number;
  hp: number;
  maxHp: number;
  deck: Card[];
  currentHp?: number;
}

interface Card {
  name: string;
  type: string;
  cd: number;
  state: string;
  used: boolean;
  duration?: number;
  hp?: number;
}

interface Match {
  p1: Character;
  p2: Character;
  winner: number | null;
}

interface Gimmick {
  name: string;
  cost: number;
  effect: string;
}

const CARDS_POOL: Record<string, Card[]> = {
  Rick: [
    { name: "Portal Gun", type: "Dimensional", cd: 6, state: "available", used: false },
    { name: "Mega Seeds", type: "Buff", cd: 4, state: "available", used: false, duration: 2 },
    { name: "Neutrino Bomb", type: "Ataque", cd: 8, state: "available", used: false },
    { name: "Flask", type: "Buff", cd: 2, state: "available", used: false },
  ],
  Morty: [
    { name: "Mecha Suit", type: "Campo", cd: 5, state: "available", used: false, hp: 80 },
    { name: "Meeseeks Box", type: "Buff", cd: 5, state: "available", used: false },
    { name: "Apagador", type: "Dimensional", cd: 4, state: "available", used: false },
    { name: "Robô Manteiga", type: "Buff", cd: 1, state: "available", used: false },
  ],
  Default: [
    { name: "Plumbus", type: "Buff", cd: 1, state: "available", used: false },
    { name: "AntiGravidade", type: "Defesa", cd: 1, state: "available", used: false },
    { name: "Scanner", type: "Buff", cd: 2, state: "available", used: false },
    { name: "Granada", type: "Ataque", cd: 3, state: "available", used: false },
  ],
};

const GIMMICKS: Gimmick[] = [
  { name: "Emissor", cost: 50, effect: "Falha carta" },
  { name: "Ampulheta", cost: 75, effect: "+25 ATK" },
  { name: "Microfone", cost: 30, effect: "Revela carta" },
  { name: "Serum", cost: 100, effect: "Altera aleatório" },
];

const MAX_TURNS = 8;
const TOURNAMENT_LOADING_LINES = [
  "Varrendo realidades em busca dos seres menos confiáveis do multiverso...",
  "Puxando competidores direto de portais que claramente não são seguros...",
  "Convertendo caos interdimensional em cartas prontas para a pancadaria...",
  "Selecionando integrantes com potencial máximo para causar problema...",
];


function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function getCardType(char: Character): string {
  const name = char.name.toLowerCase();
  if (name.includes("rick") && !name.includes("morty")) return "Rick";
  if (name.includes("morty")) return "Morty";
  return "Default";
}

function generateStats(char: Character): { atk: number; def: number; hp: number } {
  const episodes = char.episode?.length || 1;
  const type = getCardType(char);
  let atk = 30 + Math.min(episodes, 50);
  let def = 20 + Math.min(Math.floor(episodes / 2), 20);
  let hp = 80 + Math.min(episodes, 40);
  if (type === "Rick") { atk += 30; hp += 20; }
  return { atk, def, hp };
}

function generateDeck(char: Character): Card[] {
  const type = getCardType(char);
  const pool = CARDS_POOL[type] || CARDS_POOL.Default;
  return pool.map(c => ({ ...c }));
}

function App() {
  const [screen, setScreen] = useState<string>("home");
  const [flurbos, setFlurbos] = useState(500);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [bracket, setBracket] = useState<Match[]>([]);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [player1, setPlayer1] = useState<Character | null>(null);
  const [player2, setPlayer2] = useState<Character | null>(null);
  const [tournamentBet, setTournamentBet] = useState<number | null>(null);
  const [tournamentBetAmount, setTournamentBetAmount] = useState(0);
  const [matchBet, setMatchBet] = useState<number | null>(null);
  const [matchBetAmount, setMatchBetAmount] = useState(0);
  const [activeGimmick, setActiveGimmick] = useState<Gimmick | null>(null);
  const [usedGimmick, setUsedGimmick] = useState(false);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [battleKey, setBattleKey] = useState(0);
  const [champion, setChampion] = useState<Character | null>(null);
  const [loadingRoster, setLoadingRoster] = useState<Array<Character | null>>([]);
  const [loadingLineIndex, setLoadingLineIndex] = useState(0);
  const [loadingReady, setLoadingReady] = useState(false);

  const log = useCallback((msg: string) => {
    setBattleLog(prev => [...prev, msg]);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("home-body", screen === "home");

    return () => {
      document.body.classList.remove("home-body");
    };
  }, [screen]);

  useEffect(() => {
    if (screen !== "loading-tournament") {
      setLoadingLineIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setLoadingLineIndex(prev => (prev + 1) % TOURNAMENT_LOADING_LINES.length);
    }, 1700);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [screen]);

  const playTournamentLoading = useCallback(async (chars: Character[]) => {
    setLoadingRoster(Array.from({ length: 8 }, () => null));
    setLoadingLineIndex(0);
    setLoadingReady(false);
    setScreen("loading-tournament");

    for (const [index, character] of chars.slice(0, 8).entries()) {
      await wait(180);
      setLoadingRoster(prev => prev.map((item, itemIndex) => (
        itemIndex === index ? character : item
      )));
    }

    await wait(220);
    setLoadingReady(true);
  }, []);

  const startTournament = async () => {
    try {
      const res = await fetch("https://rickandmortyapi.com/api/character?limit=16");
      const data = await res.json();
      let chars: Character[] = data.results;

      chars = chars.map(c => {
        const stats = generateStats(c as unknown as Character);
        return {
          ...c,
          ...stats,
          maxHp: stats.hp,
          deck: generateDeck(c as unknown as Character),
        } as Character;
      });

      for (let i = chars.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [chars[i], chars[j]] = [chars[j], chars[i]];
      }

      const newBracket: Match[] = [];
      for (let i = 0; i < 16; i += 2) {
        newBracket.push({ p1: chars[i], p2: chars[i + 1], winner: null });
      }

      setCharacters(chars);
      setBracket(newBracket);
      setCurrentMatch(0);
      setTournamentBet(null);
      setTournamentBetAmount(0);
      await playTournamentLoading(chars);
    } catch (e) {
      console.error(e);
      alert("Erro ao carregar personagens");
    }
  };

  const placeTournamentBet = () => {
    if (!tournamentBet) {
      alert("Escolha um campeão!");
      return;
    }
    if (tournamentBetAmount > flurbos) {
      alert("Flurbos insuficientes!");
      return;
    }
    setFlurbos(prev => prev - tournamentBetAmount);
    setScreen("bet-match");
  };

  const startMatchBet = () => {
    const match = bracket[currentMatch];
    if (!match) return;

    setPlayer1({ ...match.p1, currentHp: match.p1.hp, deck: generateDeck(match.p1) });
    setPlayer2({ ...match.p2, currentHp: match.p2.hp, deck: generateDeck(match.p2) });
    setMatchBet(null);
    setMatchBetAmount(0);
    setActiveGimmick(null);
    setUsedGimmick(false);
    setScreen("bet-match");
  };

  const placeMatchBet = () => {
    if (matchBet && matchBetAmount > 0) {
      if (matchBetAmount > flurbos) {
        alert("Flurbos insuficientes!");
        return;
      }
      setFlurbos(prev => prev - matchBetAmount);
    }
    if (activeGimmick) {
      setFlurbos(prev => prev - activeGimmick.cost);
    }
    runBattle();
  };

  const runBattle = () => {
    let p1 = { ...player1! };
    let p2 = { ...player2! };

    setBattleLog([]);
    setBattleKey(k => k + 1);
    setScreen("battle");
    log(`⚔️ Luta começa!`);

    let turn = 1;

    const battleLoop = () => {
      if (turn > MAX_TURNS || !p1.currentHp || !p2.currentHp || p1.currentHp <= 0 || p2.currentHp <= 0) {
        finishBattle(p1, p2);
        return;
      }

      const p1Deck = p1.deck.filter(c => c.state === "available");
      const p2Deck = p2.deck.filter(c => c.state === "available");

      let cardP1: Card | null = null;
      let cardP2: Card | null = null;

      if (p1Deck.length > 0 && Math.random() < 0.35) {
        cardP1 = p1Deck[Math.floor(Math.random() * p1Deck.length)];
        useCard(cardP1, p1, p2);
      }
      if (p2Deck.length > 0 && Math.random() < 0.35) {
        cardP2 = p2Deck[Math.floor(Math.random() * p2Deck.length)];
        useCard(cardP2, p2, p1);
      }

      if (!cardP1 && p1.currentHp && p2.currentHp) {
        const dmg1 = Math.max(0, p1.atk - p2.def);
        p2.currentHp -= dmg1;
        log(`${p1.name} ataca → ${dmg1} dano`);
      }
      if (!cardP2 && p1.currentHp && p2.currentHp) {
        const dmg2 = Math.max(0, p2.atk - p1.def);
        p1.currentHp -= dmg2;
        log(`${p2.name} ataca → ${dmg2} dano`);
      }

      if (activeGimmick && !usedGimmick && turn <= 3) {
        if (activeGimmick.name === "Ampulheta" && p1.currentHp) {
          p1.atk += 25;
          log(`🎭 Ampulheta: +25 ATK para ${p1.name}!`);
        }
        setUsedGimmick(true);
      }

      p1.deck.forEach(c => {
        if (c.cd > 0) c.cd--;
        if (c.cd === 0 && c.used) c.state = "available";
      });
      p2.deck.forEach(c => {
        if (c.cd > 0) c.cd--;
        if (c.cd === 0 && c.used) c.state = "available";
      });

      setPlayer1({ ...p1 });
      setPlayer2({ ...p2 });
      setBattleKey(k => k + 1);

      turn++;
      setTimeout(battleLoop, 1000);
    };

    setTimeout(battleLoop, 500);
  };

  const useCard = (card: Card, user: Character, target: Character) => {
    card.used = true;
    card.state = "used";
    card.cd = card.cd || 3;

    log(`🃏 ${user.name} usa ${card.name}!`);

    if (card.type === "Ataque" || card.type === "Buff") {
      if (card.name.includes("Neutrino") || card.name.includes("Granada")) {
        const dmg = card.name === "Neutrino Bomb" ? 55 : 35;
        if (target.currentHp) target.currentHp -= dmg;
        log(`   → ${dmg} dano!`);
      } else if (card.name.includes("Mega") || card.name.includes("Meeseeks")) {
        const bonus = card.name === "Mega Seeds" ? 35 : 25;
        user.atk += bonus;
        log(`   → +${bonus} ATK!`);
      }
    }
  };

  const finishBattle = (p1: Character, p2: Character) => {
    const p1Wins = (p1.currentHp || 0) > (p2.currentHp || 0);
    const winner = p1Wins ? p1 : p2;

    const newBracket = [...bracket];
    newBracket[currentMatch].winner = winner.id;
    setBracket(newBracket);

    setPlayer1(p1);
    setPlayer2(p2);

    log(`🏆 ${winner.name} venceu!`);

    setTimeout(() => {
      if (matchBetAmount > 0) {
        const won = (matchBet === 1 && p1Wins) || (matchBet === 2 && !p1Wins);
        if (won) {
          setFlurbos(prev => prev + matchBetAmount * 2);
          log(`+${matchBetAmount * 2} Flurbos (luta)`);
        }
      }
      if (tournamentBetAmount > 0 && newBracket[13]?.winner) {
        const wonT = tournamentBet === newBracket[13].winner;
        if (wonT) {
          setFlurbos(prev => prev + tournamentBetAmount * 8);
          log(`+${tournamentBetAmount * 8} Flurbos (torneio)!`);
        }
      }

      setTimeout(() => nextMatch(), 1500);
    }, 500);
  };

  const nextMatch = () => {
    let next = currentMatch + 1;
    while (next < 14 && bracket[next]?.winner) {
      next++;
    }
    if (next >= 14) {
      const final = bracket[13];
      const champ = characters.find(c => c.id === final?.winner);
      setChampion(champ || null);
      setScreen("champion");
      return;
    }
    setCurrentMatch(next);
    startMatchBet();
  };

  const resetGame = () => {
    setFlurbos(500);
    setTournamentBet(null);
    setTournamentBetAmount(0);
    setScreen("home");
  };

  const renderFighterCard = (char: Character | null, hpPercent: number, cls: string) => {
    if (!char) return null;
    return (
      <div className={`fighter-card ${cls}`}>
        <div className="type-badge">{getCardType(char)}</div>
        <img className="card-image" src={char.image} alt={char.name} />
        <div className="card-name">{char.name}</div>
        <div className="card-stats">
          <div className="card-stat">
            <div className="stat-value">{char.atk}</div>
            <div className="stat-label">ATK</div>
          </div>
          <div className="card-stat">
            <div className="stat-value">{char.def}</div>
            <div className="stat-label">DEF</div>
          </div>
        </div>
        <div className="card-hp-bar">
          <div className="card-hp-fill" style={{ width: `${hpPercent}%` }} />
        </div>
      </div>
    );
  };

  const renderDeckCard = (card: Card) => {
    let stateClass = "available";
    if (card.used) stateClass = "used";
    else if (card.cd > 0) stateClass = "cooldown";

    return (
      <div key={card.name} className={`deck-card ${stateClass}`}>
        <div className="deck-card-name">{card.name}</div>
        <div className="deck-card-type">{card.type}</div>
        <div className="deck-card-cd">{card.cd > 0 ? `CD:${card.cd}` : ""}</div>
      </div>
    );
  };

  return (
    <div className="app-shell">
      <div className="custom-titlebar">
        <div className="titlebar-drag" data-tauri-drag-region>
          <span className="titlebar-title">RICK AND MORTY</span>
        </div>
        <div className="titlebar-right">
          <button
            className="titlebar-btn minimize"
            onClick={() => getCurrentWindow().minimize()}
            title="Minimize"
          >
            <svg width="12" height="12" viewBox="0 0 12 12"><rect y="5" width="12" height="2" fill="currentColor"/></svg>
          </button>
          <button
            className="titlebar-btn maximize"
            onClick={() => getCurrentWindow().toggleMaximize()}
            title="Maximize"
          >
            <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
          </button>
          <button 
            className="titlebar-btn close" 
            onClick={() => getCurrentWindow().close()}
            title="Close"
          >
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 1L11 11M1 11L11 1" stroke="currentColor" strokeWidth="2"/></svg>
          </button>
        </div>
      </div>

      <main className={`app ${screen === "home" || screen === "loading-tournament" ? "app-home" : ""}`}>

{screen === "home" && (
        <div className="screen home-screen">
          <div className="home-bg">
          </div>

          <div className="home-content">
            <div className="logo-area">
              <div className="home-kicker">TRETA MULTIVERSAL</div>
              <img
                src="/Rick and Morty logo sticker design.png"
                alt="Rick & Morty"
              />
            </div>

            <div className="menu-area">
              <HomeMenuButton variant="portal" onClick={startTournament}>
                Iniciar Torneio
              </HomeMenuButton>
              <HomeMenuButton onClick={() => {}}>
                Regras
              </HomeMenuButton>
              <HomeMenuButton onClick={() => {}}>
                Configuracoes
              </HomeMenuButton>
            </div>
          </div>

          <div className="credits">
            Wubba Lubba Dub Dub!
          </div>
        </div>
      )}

      {screen === "loading-tournament" && (
        <div className="screen tournament-loading-screen">
          <div className="tournament-loading-bg" />
          <div className="tournament-loading-portal" />
          <img
            className="loading-corner-logo"
            src="/Rick and Morty logo sticker design.png"
            alt="Rick & Morty"
          />

          <div className="tournament-loading-copy">
            <div className="tournament-loading-eyebrow">Treta Multiversal em Curso</div>
            <h2>Convocando os integrantes da bagunca interdimensional</h2>
            {!loadingReady && <p>{TOURNAMENT_LOADING_LINES[loadingLineIndex]}</p>}
          </div>

          <div className="transport-grid">
            {loadingRoster.map((character, index) => (
              <div
                key={character ? character.id : `placeholder-${index}`}
                className={`transport-card ${character ? "is-arriving" : "is-placeholder"}`}
                style={{ animationDelay: `${index * 0.12}s` }}
              >
                <div className="transport-card-frame">
                  {character ? (
                    <>
                      <img src={character.image} alt={character.name} />
                      <div className="transport-card-meta">
                        <span>{character.name}</span>
                        <small>{character.species}</small>
                      </div>
                    </>
                  ) : (
                    <div className="transport-card-placeholder">
                      <div className="placeholder-portal" />
                      <span>Materializando...</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className={`loading-actions ${loadingReady ? "is-visible" : ""}`}>
            <HomeMenuButton
              variant="portal"
              onClick={() => setScreen("bracket")}
              disabled={!loadingReady}
            >
              Continuar
            </HomeMenuButton>
          </div>
        </div>
      )}

      {screen === "bracket" && (
        <div className="screen bracket-screen">
          <h2>Chaveamento</h2>
          <div className="bracket">
            {["Quartas", "Semi", "Final"].map((roundName, ri) => {
              const startIdx = ri === 0 ? 0 : ri === 1 ? 8 : 12;
              const count = ri === 0 ? 8 : ri === 1 ? 4 : 2;
              return (
                <div key={ri} className="bracket-round">
                  <div className="bracket-title">{roundName}</div>
                  {bracket.slice(startIdx, startIdx + count).map((m, mi) => {
                    const idx = startIdx + mi;
                    return (
                      <div
                        key={mi}
                        className={`bracket-match ${m.winner ? "completed" : ""} ${idx === currentMatch ? "active" : ""}`}
                      >
                        <div className={`bracket-fighter ${m.winner === m.p1.id ? "winner" : ""}`}>
                          <img src={m.p1.image} alt={m.p1.name} />
                          <span>{m.p1.name}</span>
                        </div>
                        <div className={`bracket-fighter ${m.winner === m.p2.id ? "winner" : ""}`}>
                          <img src={m.p2.image} alt={m.p2.name} />
                          <span>{m.p2.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <button className="btn btn-purple" onClick={() => setScreen("bet-tournament")}>
            💰 Apostar no Campeão
          </button>
          <button
            className="btn"
            onClick={() => {
              void playTournamentLoading(characters);
            }}
            style={{ marginLeft: 12 }}
          >
            Voltar ao Loading
          </button>
        </div>
      )}

      {screen === "bet-tournament" && (
        <div className="screen betting-screen">
          <div className="betting">
            <div className="betting-title">🏆 Quem vai ganhar o Torneio?</div>
            <div className="bet-options">
              {characters.slice(0, 8).map(c => (
                <div
                  key={c.id}
                  className={`bet-option ${tournamentBet === c.id ? "selected" : ""}`}
                  onClick={() => setTournamentBet(c.id)}
                >
                  <img src={c.image} alt={c.name} />
                  <div>{c.name}</div>
                </div>
              ))}
            </div>
            <div className="bet-amount">
              <span>🪙</span>
              <input
                type="number"
                value={tournamentBetAmount}
                onChange={e => setTournamentBetAmount(Number(e.target.value))}
                min={10}
              />
            </div>
            <button className="btn btn-yellow" onClick={placeTournamentBet}>
              Confirmar
            </button>
          </div>
        </div>
      )}

      {screen === "bet-match" && player1 && player2 && (
        <div className="screen betting-screen">
          <div className="betting">
            <div className="betting-title">⚔️ Luta #{currentMatch + 1}</div>
            <div className="bet-options">
              <div
                className={`bet-option ${matchBet === 1 ? "selected" : ""}`}
                onClick={() => setMatchBet(1)}
              >
                <img src={player1.image} alt={player1.name} />
                <div>{player1.name}</div>
              </div>
              <div
                className={`bet-option ${matchBet === 2 ? "selected" : ""}`}
                onClick={() => setMatchBet(2)}
              >
                <img src={player2.image} alt={player2.name} />
                <div>{player2.name}</div>
              </div>
            </div>
            <div className="bet-amount">
              <span>🪙</span>
              <input
                type="number"
                value={matchBetAmount}
                onChange={e => setMatchBetAmount(Number(e.target.value))}
                min={10}
              />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn" onClick={placeMatchBet}>
                Apostar
              </button>
              <button className="btn btn-purple" onClick={placeMatchBet}>
                Pular
              </button>
            </div>
          </div>
          <div className="gimmicks">
            <div className="gimmicks-title">🎭 Gimmick</div>
            <div className="gimmick-list">
              {GIMMICKS.map(g => (
                <div
                  key={g.name}
                  className={`gimmick ${activeGimmick?.name === g.name ? "selected" : ""}`}
                  onClick={() => {
                    if (usedGimmick) {
                      alert("Gimmick já usado!");
                      return;
                    }
                    if (flurbos < g.cost) {
                      alert("Flurbos insuficientes!");
                      return;
                    }
                    setActiveGimmick(g);
                  }}
                >
                  <div className="gimmick-name">{g.name}</div>
                  <div className="gimmick-cost">🪙 {g.cost}</div>
                  <div className="gimmick-effect">{g.effect}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {screen === "battle" && player1 && player2 && (() => {
        const hp1 = Math.max(0, ((player1.currentHp || player1.maxHp) / player1.maxHp) * 100);
        const hp2 = Math.max(0, ((player2.currentHp || player2.maxHp) / player2.maxHp) * 100);
        return (
        <div key={battleKey} className="screen battle-screen">
          <h2>⚔️ Luta #{currentMatch + 1}</h2>
          <div className="battle-arena">
            <div className="card-wrapper">
              {renderFighterCard(player1, hp1, "player")}
              <div className="deck-display">
                {player1.deck.map(renderDeckCard)}
              </div>
            </div>
            <div className="vs">VS</div>
            <div className="card-wrapper">
              {renderFighterCard(player2, hp2, "enemy")}
              <div className="deck-display">
                {player2.deck.map(renderDeckCard)}
              </div>
            </div>
          </div>
          <div className="battle-log">
            {battleLog.map((msg, i) => (
              <div key={i} className="log-entry">
                {msg}
              </div>
            ))}
          </div>
        </div>
        );
      })()}

      {screen === "champion" && champion && (
        <div className="screen champion-screen">
          <h2>🏆 CAMPEÃO DIMENSIONAL 🏆</h2>
          <div className="fighter-card winner champion-card">
            <div className="type-badge">CAMPEÃO</div>
            <img className="card-image" src={champion.image} alt={champion.name} />
            <div className="card-name">{champion.name}</div>
            <div className="card-stats">
              <div className="card-stat">
                <div className="stat-value">{champion.atk}</div>
                <div className="stat-label">ATK</div>
              </div>
              <div className="card-stat">
                <div className="stat-value">{champion.def}</div>
                <div className="stat-label">DEF</div>
              </div>
            </div>
          </div>
          <div className="champion-deck">
            <div>Deck do Campeão</div>
            <div className="deck-display">
              {champion.deck.map(renderDeckCard)}
            </div>
          </div>
          <button className="btn" onClick={resetGame} style={{ marginTop: 30 }}>
            🔄 Novo Torneio
          </button>
        </div>
      )}
      </main>
    </div>
  );
}

export default App;
