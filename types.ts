
export type TileModifier = 'none' | 'fire' | 'star' | 'lightning';

export interface Tile {
  emoji: string;
  modifier: TileModifier;
}

export interface Position {
  row: number;
  col: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  rotation: number;
  vr: number;
}

export interface Explosion {
  id: string;
  row: number;
  col: number;
  emoji: string;
  particles: Particle[];
}

export interface Perk {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export type GameView = 'playing' | 'reward' | 'gameOver' | 'start';

export interface GameState {
  grid: Tile[][];
  view: GameView;
  floor: number;
  playerHp: number;
  playerMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  movesUntilAttack: number;
  selectedTile: Position | null;
  isAnimating: boolean;
  message: string;
  hint: Position[] | null;
  combo: number;
  explosions: Explosion[];
  activePerks: string[];
}

export const GRID_SIZE = 8;
export const ATTACK_INTERVAL = 10;
export const EMOJIS = ['🍎', '🍊', '🍋', '🍇', '🥝'];

export const ENEMIES = [
  { name: 'Slime', emoji: '🫠', hpBase: 500 },
  { name: 'Ghost', emoji: '👻', hpBase: 1200 },
  { name: 'Demon', emoji: '😈', hpBase: 2500 },
  { name: 'Dragon', emoji: '🐲', hpBase: 5000 },
  { name: 'Alien Queen', emoji: '👸', hpBase: 10000 },
];

export const PERKS: Perk[] = [
  { id: 'vampire', name: 'Vampiric Apple', description: 'Red apples heal 2 HP when matched.', icon: '🧛' },
  { id: 'pyro', name: 'Pyromancy', description: 'Fire explosions deal double damage.', icon: '🔥' },
  { id: 'tank', name: 'Iron Heart', description: '+30 Max HP and full heal.', icon: '🛡️' },
  { id: 'storm', name: 'Storm Caller', description: 'Lightning clears 2 random extra tiles.', icon: '⛈️' },
  { id: 'lucky', name: 'Lucky Coin', description: 'Combos deal 50% more damage.', icon: '🍀' },
];

export const EMOJI_COLORS: Record<string, string[]> = {
  '🍎': ['#ef4444', '#dc2626', '#f87171'],
  '🍊': ['#f97316', '#ea580c', '#fb923c'],
  '🍋': ['#eab308', '#ca8a04', '#fde047'],
  '🍇': ['#a855f7', '#9333ea', '#c084fc'],
  '🥝': ['#22c55e', '#16a34a', '#4ade80'],
};

export const getMultiplier = (iteration: number): number => {
  if (iteration <= 1) return 1;
  if (iteration === 2) return 1.5;
  if (iteration === 3) return 2;
  if (iteration === 4) return 3;
  return 5;
};
