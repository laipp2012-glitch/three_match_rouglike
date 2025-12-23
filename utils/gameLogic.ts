
import { GRID_SIZE, EMOJIS, Tile, Position, TileModifier } from '../types.ts';

export const getRandomEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

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
      grid[r][c] = { emoji, modifier: 'none' };
    }
  }
  return grid;
};

export interface MatchResult {
  tiles: Position[];
  bonusType: TileModifier;
  bonusPosition: Position | null;
}

export const findMatches = (grid: Tile[][], lastActionPos: Position | null = null): MatchResult => {
  const horizontalMatches: Position[][] = [];
  const verticalMatches: Position[][] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    let count = 1;
    for (let c = 1; c <= GRID_SIZE; c++) {
      if (c < GRID_SIZE && grid[r][c].emoji === grid[r][c - 1].emoji && grid[r][c].emoji !== '') {
        count++;
      } else {
        if (count >= 3) {
          const match: Position[] = [];
          for (let i = 1; i <= count; i++) match.push({ row: r, col: c - i });
          horizontalMatches.push(match);
        }
        count = 1;
      }
    }
  }

  for (let c = 0; c < GRID_SIZE; c++) {
    let count = 1;
    for (let r = 1; r <= GRID_SIZE; r++) {
      if (r < GRID_SIZE && grid[r][c].emoji === grid[r - 1][c].emoji && grid[r][c].emoji !== '') {
        count++;
      } else {
        if (count >= 3) {
          const match: Position[] = [];
          for (let i = 1; i <= count; i++) match.push({ row: r - i, col: c });
          verticalMatches.push(match);
        }
        count = 1;
      }
    }
  }

  const allMatchedPositions = new Set<string>();
  const results: Position[] = [];
  let bonusType: TileModifier = 'none';
  let bonusPosition: Position | null = null;

  horizontalMatches.forEach(match => {
    match.forEach(p => {
        const key = `${p.row},${p.col}`;
        if (!allMatchedPositions.has(key)) {
            allMatchedPositions.add(key);
            results.push(p);
        }
    });
    if (match.length >= 5) bonusType = 'star';
    else if (match.length === 4 && bonusType !== 'star') bonusType = 'fire';
  });

  verticalMatches.forEach(match => {
    match.forEach(p => {
        const key = `${p.row},${p.col}`;
        if (!allMatchedPositions.has(key)) {
            allMatchedPositions.add(key);
            results.push(p);
        }
    });
    if (match.length >= 5) bonusType = 'star';
    else if (match.length === 4 && bonusType !== 'star' && bonusType !== 'lightning') bonusType = 'fire';
  });

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const isHoriz = horizontalMatches.some(m => m.some(p => p.row === r && p.col === c));
      const isVert = verticalMatches.some(m => m.some(p => p.row === r && p.col === c));
      if (isHoriz && isVert) {
        bonusType = 'lightning';
        bonusPosition = { row: r, col: c };
      }
    }
  }

  if (bonusType !== 'none' && !bonusPosition) {
    if (lastActionPos && results.some(p => p.row === lastActionPos.row && p.col === lastActionPos.col)) {
        bonusPosition = lastActionPos;
    } else {
        bonusPosition = results[0];
    }
  }

  return { tiles: results, bonusType, bonusPosition };
};

export const areAdjacent = (p1: Position, p2: Position): boolean => {
  const rowDiff = Math.abs(p1.row - p2.row);
  const colDiff = Math.abs(p1.col - p2.col);
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
};

export const getPotentialMatches = (grid: Tile[][]): Position[] | null => {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (c < GRID_SIZE - 1) {
        const tempGrid = grid.map(row => row.map(t => ({...t})));
        [tempGrid[r][c], tempGrid[r][c + 1]] = [tempGrid[r][c + 1], tempGrid[r][c]];
        if (findMatches(tempGrid).tiles.length > 0) return [{ row: r, col: c }, { row: r, col: c + 1 }];
      }
      if (r < GRID_SIZE - 1) {
        const tempGrid = grid.map(row => row.map(t => ({...t})));
        [tempGrid[r][c], tempGrid[r + 1][c]] = [tempGrid[r + 1][c], tempGrid[r][c]];
        if (findMatches(tempGrid).tiles.length > 0) return [{ row: r, col: c }, { row: r + 1, col: c }];
      }
    }
  }
  return null;
};
