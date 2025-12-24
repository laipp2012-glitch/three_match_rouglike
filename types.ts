
export type TileModifier = 'none' | 'fire' | 'star' | 'lightning';

export interface Tile {
  id: string;
  emoji: string;
  modifier: TileModifier;
}

export interface Position {
  row: number;
  col: number;
}

export interface Enemy {
  name: string;
  emoji: string;
  hp: number;
  damage: number;
}

export interface Perk {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

// Added Particle interface to fix the module export error in ParticleEffect.tsx
export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  vr: number;
  rotation: number;
  life: number;
  size: number;
  color: string;
}

export type GameView = 'start' | 'playing' | 'reward' | 'gameOver';

export const GRID_SIZE = 8;
export const ATTACK_INTERVAL = 10;
export const EMOJIS = ['🍎', '🍊', '🍋', '🍇', '🥝'];

export const ENEMIES: Enemy[] = [
  { name: 'Лесной Слизень', emoji: '🫠', hp: 600, damage: 15 },
  { name: 'Теневой Дух', emoji: '👻', hp: 1500, damage: 20 },
  { name: 'Огненный Демон', emoji: '😈', hp: 3500, damage: 25 },
  { name: 'Древний Дракон', emoji: '🐲', hp: 8000, damage: 40 }
];

export const PERKS: Perk[] = [
  { id: 'vampire', name: 'Вампиризм', desc: 'Яблоки 🍎 лечат +5 HP', icon: '🧛' },
  { id: 'pyro', name: 'Пиромантия', desc: 'Бомбы 🔥 в 2 раза сильнее', icon: '🔥' },
  { id: 'tank', name: 'Броня', desc: '+50 к Макс. HP и лечение', icon: '🛡️' },
  { id: 'lucky', name: 'Удача', desc: 'Комбо дают +50% урона', icon: '🍀' }
];
