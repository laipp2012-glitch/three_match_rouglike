import React, { useState, useEffect, useCallback } from 'react';
import { 
  GRID_SIZE, ENEMIES, PERKS, ATTACK_INTERVAL, 
  Tile, Position, GameView, TileModifier, Enemy, Particle 
} from './types';
import { createInitialGrid, findMatches, areAdjacent, createTile, getRandomEmoji } from './utils/gameLogic';
import Board from './components/Board';
import Stats from './components/Stats';
import ParticleEffect from './components/ParticleEffect';

interface ActiveEffect {
  id: string;
  emoji: string;
  particles: Particle[];
}

const EMOJI_COLORS: Record<string, string> = {
  '🍎': '#ef4444',
  '🍊': '#f97316',
  '🍋': '#facc15',
  '🍇': '#a855f7',
  '🥝': '#4ade80'
};

const App: React.FC = () => {
  const [view, setView] = useState<GameView>('start');
  const [grid, setGrid] = useState<Tile[][]>(createInitialGrid());
  const [selected, setSelected] = useState<Position | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [effects, setEffects] = useState<ActiveEffect[]>([]);
  
  // Game Stats
  const [floor, setFloor] = useState(1);
  const [playerHp, setPlayerHp] = useState(100);
  const [playerMaxHp, setPlayerMaxHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(ENEMIES[0].hp);
  const [maxEnemyHp, setMaxEnemyHp] = useState(ENEMIES[0].hp);
  const [moves, setMoves] = useState(ATTACK_INTERVAL);
  const [activePerks, setActivePerks] = useState<string[]>([]);

  const currentEnemy: Enemy = ENEMIES[(floor - 1) % ENEMIES.length];

  const createParticlesForTile = (r: number, c: number, emoji: string): Particle[] => {
    const color = EMOJI_COLORS[emoji] || '#ffffff';
    const particles: Particle[] = [];
    const count = 12; // Количество пикселей на плитку
    
    // Центр плитки в процентах (100 / 8 = 12.5 на плитку)
    const centerX = (c * 12.5) + 6.25;
    const centerY = (r * 12.5) + 6.25;

    for (let i = 0; i < count; i++) {
      particles.push({
        id: Math.random().toString(36).substr(2, 9),
        x: centerX + (Math.random() - 0.5) * 5,
        y: centerY + (Math.random() - 0.5) * 5,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.8) * 4, // Больше импульс вверх
        vr: (Math.random() - 0.5) * 20,
        rotation: Math.random() * 360,
        life: 1,
        size: Math.random() * 6 + 4,
        color
      });
    }
    return particles;
  };

  const triggerModifier = async (r: number, c: number, modifier: TileModifier, emoji: string, currentGrid: Tile[][]) => {
    let affected: Position[] = [{ row: r, col: c }];
    if (modifier === 'fire') {
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        let nr = r + i, nc = c + j;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) affected.push({ row: nr, col: nc });
      }
    } else if (modifier === 'lightning') {
      for (let i = 0; i < GRID_SIZE; i++) {
        affected.push({ row: i, col: c });
        affected.push({ row: r, col: i });
      }
    } else if (modifier === 'star') {
      for (let i = 0; i < GRID_SIZE; i++) for (let j = 0; j < GRID_SIZE; j++) {
        if (currentGrid[i][j].emoji === emoji) affected.push({ row: i, col: j });
      }
    }
    return affected;
  };

  const processTurn = async (currentGrid: Tile[][]): Promise<boolean> => {
    const matches = findMatches(currentGrid);
    if (matches.length === 0) return false;

    setIsAnimating(true);
    let newGrid = currentGrid.map(row => [...row]);
    let allMatchedPositions: Position[] = [];
    let bonusesToCreate: { row: number, col: number, type: TileModifier }[] = [];

    matches.forEach(m => {
      allMatchedPositions.push(...m.tiles);
      if (m.tiles.length === 4) bonusesToCreate.push({ ...m.tiles[0], type: 'fire' });
      if (m.tiles.length >= 5) bonusesToCreate.push({ ...m.tiles[0], type: 'star' });
    });

    let posMap: Record<string, number> = {};
    allMatchedPositions.forEach(p => {
      const key = `${p.row},${p.col}`;
      posMap[key] = (posMap[key] || 0) + 1;
      if (posMap[key] > 1) bonusesToCreate.push({ ...p, type: 'lightning' });
    });

    let finalClearSet = new Set<string>();
    allMatchedPositions.forEach(p => finalClearSet.add(`${p.row},${p.col}`));
    
    for (const p of allMatchedPositions) {
      if (newGrid[p.row][p.col].modifier !== 'none') {
        const extra = await triggerModifier(p.row, p.col, newGrid[p.row][p.col].modifier, newGrid[p.row][p.col].emoji, newGrid);
        extra.forEach(ep => finalClearSet.add(`${ep.row},${ep.col}`));
      }
    }

    const finalClear: Position[] = Array.from(finalClearSet).map(s => {
      const [r, c] = s.split(',').map(Number);
      return { row: r, col: c };
    });

    // DAMAGE AND PARTICLES
    let damage = finalClear.length * 10;
    const newEffects: ActiveEffect[] = [];

    finalClear.forEach(p => {
      const tile = currentGrid[p.row][p.col];
      if (tile.emoji) {
        newEffects.push({
          id: Math.random().toString(),
          emoji: tile.emoji,
          particles: createParticlesForTile(p.row, p.col, tile.emoji)
        });
      }
    });

    setEffects(prev => [...prev, ...newEffects]);

    if (activePerks.includes('lucky')) damage *= 1.5;
    if (activePerks.includes('pyro')) {
        const hasFire = finalClear.some(p => newGrid[p.row][p.col].modifier === 'fire');
        if (hasFire) damage *= 1.5;
    }
    
    if (activePerks.includes('vampire')) {
        const apples = finalClear.filter(p => newGrid[p.row][p.col].emoji === '🍎').length;
        if (apples > 0) setPlayerHp(h => Math.min(playerMaxHp, h + apples * 2));
    }

    setEnemyHp(h => Math.max(0, h - damage));

    // Clear tiles
    finalClear.forEach(p => {
      newGrid[p.row][p.col] = { id: Math.random().toString(), emoji: '', modifier: 'none' };
    });

    bonusesToCreate.forEach(b => {
      newGrid[b.row][b.col] = createTile(getRandomEmoji(), b.type);
    });

    setGrid([...newGrid]);
    await new Promise(res => setTimeout(res, 350));

    // Refill Grid
    for (let c = 0; c < GRID_SIZE; c++) {
      let empty = 0;
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        if (newGrid[r][c].emoji === '') empty++;
        else if (empty > 0) {
          newGrid[r + empty][c] = newGrid[r][c];
          newGrid[r][c] = { id: Math.random().toString(), emoji: '', modifier: 'none' };
        }
      }
      for (let r = 0; r < empty; r++) newGrid[r][c] = createTile();
    }

    setGrid([...newGrid]);
    await new Promise(res => setTimeout(res, 200));

    await processTurn(newGrid);
    setIsAnimating(false);
    return true;
  };

  const handleTileClick = useCallback(async (r: number, c: number) => {
    if (isAnimating || view !== 'playing') return;

    if (!selected) {
      setSelected({ row: r, col: c });
    } else {
      if (areAdjacent(selected, { row: r, col: c })) {
        let newGrid = grid.map(row => [...row]);
        const temp = newGrid[selected.row][selected.col];
        newGrid[selected.row][selected.col] = newGrid[r][c];
        newGrid[r][c] = temp;

        setGrid(newGrid);
        const matched = await processTurn(newGrid);

        if (!matched) {
          setTimeout(() => setGrid(grid), 250);
        } else {
          setMoves(m => {
            if (m <= 1) {
              setPlayerHp(hp => Math.max(0, hp - currentEnemy.damage));
              return ATTACK_INTERVAL;
            }
            return m - 1;
          });
        }
      }
      setSelected(null);
    }
  }, [grid, selected, isAnimating, view, currentEnemy, playerMaxHp, activePerks]);

  const addPerk = (perkId: string) => {
    setActivePerks(prev => [...prev, perkId]);
    if (perkId === 'tank') {
        setPlayerMaxHp(h => h + 50);
        setPlayerHp(h => h + 50);
    }
    const nextFloorNum = floor + 1;
    setFloor(nextFloorNum);
    const enemy = ENEMIES[(nextFloorNum - 1) % ENEMIES.length];
    const scaledHp = enemy.hp * (1 + (nextFloorNum - 1) * 0.4);
    setEnemyHp(scaledHp);
    setMaxEnemyHp(scaledHp);
    setMoves(ATTACK_INTERVAL);
    setGrid(createInitialGrid());
    setView('playing');
  };

  useEffect(() => {
    if (enemyHp <= 0 && view === 'playing') setView('reward');
    if (playerHp <= 0 && view === 'playing') setView('gameOver');
  }, [enemyHp, playerHp, view]);

  if (view === 'start') return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <h1 className="text-7xl font-black mb-4 tracking-tighter bg-gradient-to-br from-indigo-400 to-purple-600 bg-clip-text text-transparent">EMOJI ROGUE</h1>
      <p className="text-slate-400 mb-12 text-lg">Уничтожай монстров, собирай бонусы, выбирай перки!</p>
      <button onClick={() => setView('playing')} className="px-16 py-5 bg-indigo-600 rounded-3xl font-black text-2xl shadow-2xl hover:bg-indigo-500 transition-all active:scale-95">НАЧАТЬ</button>
    </div>
  );

  if (view === 'reward') return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="text-6xl mb-6">🎁</div>
      <h2 className="text-4xl font-black mb-2">ПОБЕДА!</h2>
      <p className="text-slate-400 mb-10">Выберите усиление:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
        {PERKS.map(perk => (
          <button key={perk.id} onClick={() => addPerk(perk.id)} className="bg-slate-900 border border-white/10 p-6 rounded-3xl hover:bg-indigo-900/40 transition-all text-left group">
            <div className="text-3xl mb-3 group-hover:scale-125 transition-transform">{perk.icon}</div>
            <div className="font-bold text-lg">{perk.name}</div>
            <div className="text-sm text-slate-500">{perk.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 select-none">
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-6 shadow-2xl relative overflow-hidden">
        
        {/* Render Particle Effects */}
        {effects.map(effect => (
          <ParticleEffect 
            key={effect.id} 
            particles={effect.particles} 
            emoji={effect.emoji} 
            onComplete={() => setEffects(prev => prev.filter(e => e.id !== effect.id))}
          />
        ))}

        {/* Enemy Stats */}
        <div className="flex justify-between items-end mb-4 relative z-10">
          <div>
            <div className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">Этаж {floor}</div>
            <div className="text-2xl font-black">{currentEnemy.name}</div>
          </div>
          <div className="text-5xl animate-bounce">{currentEnemy.emoji}</div>
        </div>

        {/* Health Bar with Numeric HP */}
        <div className="w-full h-5 bg-slate-800 rounded-full mb-8 overflow-hidden border border-white/5 relative z-10 flex items-center shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-500" 
            style={{width: `${(enemyHp/maxEnemyHp)*100}%`}} 
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[11px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-wider">
              {Math.ceil(enemyHp)} / {Math.ceil(maxEnemyHp)}
            </span>
          </div>
        </div>

        {/* Game Board */}
        <div className="relative z-10">
          <Board 
            grid={grid} 
            onTileClick={handleTileClick} 
            selectedTile={selected} 
            isAnimating={isAnimating} 
          />
        </div>

        {/* Player Stats */}
        <div className="relative z-10">
          <Stats 
              playerHp={playerHp} 
              playerMaxHp={playerMaxHp} 
              moves={moves} 
              attackInterval={ATTACK_INTERVAL} 
          />
        </div>

        {view === 'gameOver' && (
          <div className="absolute inset-0 bg-red-950/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-10 text-center rounded-[3rem]">
            <div className="text-7xl mb-6">💀</div>
            <h2 className="text-4xl font-black mb-4">КОНЕЦ</h2>
            <p className="text-red-200/70 mb-10">Этаж: {floor}</p>
            <button onClick={() => window.location.reload()} className="w-full py-5 bg-white text-red-950 rounded-3xl font-black text-xl">ЗАНОВО</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;