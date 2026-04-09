export interface Card {
  name: string;
  type: string;
  cd: number;
  state: string;
  used: boolean;
  duration?: number;
  hp?: number;
}

export interface Character {
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

export interface Match {
  p1: Character;
  p2: Character;
  winner: number | null;
}

export interface Gimmick {
  name: string;
  cost: number;
  effect: string;
}

export type TournamentScreen =
  | "home"
  | "loading-tournament"
  | "bracket"
  | "bet-tournament"
  | "bet-match"
  | "battle"
  | "champion";

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

export const GIMMICKS: Gimmick[] = [
  { name: "Emissor", cost: 50, effect: "Falha carta" },
  { name: "Ampulheta", cost: 75, effect: "+25 ATK" },
  { name: "Microfone", cost: 30, effect: "Revela carta" },
  { name: "Serum", cost: 100, effect: "Altera aleatório" },
];

export const MAX_TURNS = 8;

export const TOURNAMENT_LOADING_LINES = [
  "Varrendo realidades em busca dos seres menos confiáveis do multiverso...",
  "Puxando competidores direto de portais que claramente não são seguros...",
  "Convertendo caos interdimensional em cartas prontas para a pancadaria...",
  "Selecionando integrantes com potencial máximo para causar problema...",
];

export function getCardType(char: Character): string {
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
  if (type === "Rick") {
    atk += 30;
    hp += 20;
  }
  return { atk, def, hp };
}

export function generateDeck(char: Character): Card[] {
  const type = getCardType(char);
  const pool = CARDS_POOL[type] || CARDS_POOL.Default;
  return pool.map(card => ({ ...card }));
}

export function buildTournamentData(rawCharacters: Character[]) {
  const characters = rawCharacters.map(character => {
    const stats = generateStats(character as Character);
    return {
      ...character,
      ...stats,
      maxHp: stats.hp,
      deck: generateDeck(character as Character),
    } as Character;
  });

  for (let i = characters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [characters[i], characters[j]] = [characters[j], characters[i]];
  }

  const bracket: Match[] = [];
  for (let i = 0; i < 16; i += 2) {
    bracket.push({ p1: characters[i], p2: characters[i + 1], winner: null });
  }

  return { characters, bracket };
}
