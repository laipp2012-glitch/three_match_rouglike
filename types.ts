
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
  ability?: string;
}

export interface Perk {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

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

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  life: number;
}

export interface ManaPool {
  '🍎': number;
  '🍋': number;
  '🍇': number;
}

export type GameView = 'start' | 'playing' | 'reward' | 'gameOver';

export const GRID_SIZE = 8;
export const ATTACK_INTERVAL = 10;
export const MANA_MAX = 50;
export const EMOJIS = ['🍎', '🍊', '🍋', '🍇', '🥝'];

export const ENEMIES: Enemy[] = [
  { name: 'Лесной Слизень', emoji: '🫠', hp: 600, damage: 15 },
  { name: 'Теневой Дух', emoji: '👻', hp: 1500, damage: 25, ability: 'Призрачный щит' },
  { name: 'Огненный Демон', emoji: '😈', hp: 4000, damage: 35, ability: 'Поджог' },
  { name: 'Древний Дракон', emoji: '🐲', hp: 10000, damage: 50, ability: 'Дыхание бездны' }
];

export const PERKS: Perk[] = [
  { id: 'vampire', name: 'Вампиризм', desc: 'Яблоки 🍎 лечат +5 HP за стак', icon: '🧛' },
  { id: 'pyro', name: 'Пиромантия', desc: 'Взрывы 🔥 в 2 раза сильнее за стак', icon: '🔥' },
  { id: 'tank', name: 'Броня', desc: '+100 к Макс. HP и лечение', icon: '🛡️' },
  { id: 'lucky', name: 'Удача', desc: '+15% шанс и +0.5 к силе крита', icon: '🍀' }
];
