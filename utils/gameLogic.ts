import { GRID_SIZE, EMOJIS, Tile, Position, TileModifier } from '../types';

export const getRandomEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

export const createTile = (emoji = getRandomEmoji(), modifier: TileModifier = 'none'): Tile => ({
  id: Math.random().toString(36).substr(2, 9),
  emoji,
  modifier
});

export const createInitialGrid = (): Tile[][] => {
  let grid: Tile[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    grid[r] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      let emoji;
      do {
        emoji = getRandomEmoji();
      } while (
        (r >= 2 && grid[r - 1][c].emoji === emoji && grid[r - 2][c].emoji === emoji) ||
        (c >= 2 && grid[r][c - 1].emoji === emoji && grid[r][c - 2].emoji === emoji)
      );
      grid[r][c] = createTile(emoji);
    }
  }
  return grid;
};

export interface MatchGroup {
  type: 'row' | 'col';
  tiles: Position[];
}

export const findMatches = (grid: Tile[][]): MatchGroup[] => {
  const matches: MatchGroup[] = [];

  // Horizontal
  for (let r = 0; r < GRID_SIZE; r++) {
    let count = 1;
    for (let c = 1; c <= GRID_SIZE; c++) {
      if (c < GRID_SIZE && grid[r][c].emoji === grid[r][c - 1].emoji && grid[r][c].emoji !== '') {
        count++;
      } else {
        if (count >= 3) {
          const tiles: Position[] = [];
          for (let i = 1; i <= count; i++) tiles.push({ row: r, col: c - i });
          matches.push({ type: 'row', tiles });
        }
        count = 1;
      }
    }
  }

  // Vertical
  for (let c = 0; c < GRID_SIZE; c++) {
    let count = 1;
    for (let r = 1; r <= GRID_SIZE; r++) {
      if (r < GRID_SIZE && grid[r][c].emoji === grid[r - 1][c].emoji && grid[r][c].emoji !== '') {
        count++;
      } else {
        if (count >= 3) {
          const tiles: Position[] = [];
          for (let i = 1; i <= count; i++) tiles.push({ row: r - i, col: c });
          matches.push({ type: 'col', tiles });
        }
        count = 1;
      }
    }
  }

  return matches;
};

export const areAdjacent = (p1: Position, p2: Position): boolean => {
  return Math.abs(p1.row - p2.row) + Math.abs(p1.col - p2.col) === 1;
};
