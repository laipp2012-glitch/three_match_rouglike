
import React, { useState, useCallback, useMemo } from 'react';
import { 
  GameState, Position, GRID_SIZE, EMOJI_COLORS, Particle, 
  Tile, Perk, PERKS, ENEMIES, ATTACK_INTERVAL,
  getMultiplier, Explosion
} from './types';
// Import getRandomEmoji from utils/gameLogic instead of types
import { createInitialGrid, findMatches, areAdjacent, getPotentialMatches, getRandomEmoji } from './utils/gameLogic';
import Board from './components/Board';
import Stats from './components/Stats';
import Controls from './components/Controls';
import ParticleEffect from './components/ParticleEffect';

const App: React.FC = () => {
  const [state, setState] = useState<GameState>({
    grid: createInitialGrid(),
    view: 'start',
    floor: 1,
    playerHp: 100,
    playerMaxHp: 100,
    enemyHp: ENEMIES[0].hpBase,
    enemyMaxHp: ENEMIES[0].hpBase,
    movesUntilAttack: ATTACK_INTERVAL,
    selectedTile: null,
    isAnimating: false,
    message: "Welcome to the Emoji Dungeon!",
    hint: null,
    combo: 0,
    explosions: [],
    activePerks: [],
  });

  const currentEnemy = useMemo(() => {
    return ENEMIES[(state.floor - 1) % ENEMIES.length];
  }, [state.floor]);

  const createExplosion = (row: number, col: number, emoji: string, scale: number = 1): Explosion => {
    const particles: Particle[] = [];
    const colors = EMOJI_COLORS[emoji] || ['#ffffff'];
    for (let i = 0; i < Math.floor(16 * scale); i++) {
      particles.push({
        id: Math.random().toString(36).substr(2, 9),
        x: (col * 12.5) + 6.25,
        y: (row * 12.5) + 6.25,
        vx: (Math.random() - 0.5) * 4 * scale,
        vy: (Math.random() - 0.5) * 4 * scale - 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 4 + 3,
        life: 1,
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 10
      });
    }
    return { id: Math.random().toString(36).substr(2, 9), row, col, emoji, particles };
  };

  const processBoard = useCallback(async (currentGrid: Tile[][], lastPlayerAction: Position | null = null) => {
    let damageToEnemy = 0;
    let healingToPlayer = 0;
    let grid = currentGrid.map(row => row.map(t => ({...t})));
    let iterationCount = 0;

    while (true) {
      let matchResult = findMatches(grid, lastPlayerAction);
      if (matchResult.tiles.length === 0) break;
      
      iterationCount++;
      const multiplier = getMultiplier(iterationCount);
      let tilesToClear = new Set<string>();
      matchResult.tiles.forEach(t => tilesToClear.add(`${t.row},${t.col}`));

      matchResult.tiles.forEach(t => {
        const tile = grid[t.row][t.col];
        // Perk: Vampire Apple
        if (tile.emoji === '🍎' && state.activePerks.includes('vampire')) {
            healingToPlayer += 2;
        }

        if (tile.modifier === 'fire') {
          const fireScale = state.activePerks.includes('pyro') ? 2 : 1;
          damageToEnemy += 100 * fireScale;
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              const nr = t.row + dr, nc = t.col + dc;
              if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) tilesToClear.add(`${nr},${nc}`);
            }
          }
        } else if (tile.modifier === 'lightning') {
          damageToEnemy += 150;
          for (let i = 0; i < GRID_SIZE; i++) {
            tilesToClear.add(`${t.row},${i}`);
            tilesToClear.add(`${i},${t.col}`);
          }
        }
      });

      const clearArray = Array.from(tilesToClear).map(s => {
        const [row, col] = s.split(',').map(Number);
        return { row, col };
      });

      const baseDamage = clearArray.length * 10 * multiplier;
      const finalTurnDamage = state.activePerks.includes('lucky') ? baseDamage * 1.5 : baseDamage;
      damageToEnemy += finalTurnDamage;

      const newExplosions = clearArray.map(m => {
        const t = grid[m.row][m.col];
        return createExplosion(m.row, m.col, t.emoji || '🍎', t.modifier !== 'none' ? 2 : 1);
      });
      
      setState(prev => ({ 
        ...prev, 
        explosions: [...prev.explosions, ...newExplosions],
        isAnimating: true,
        combo: iterationCount,
        enemyHp: Math.max(0, prev.enemyHp - Math.floor(damageToEnemy / iterationCount))
      }));

      const bonusTile = matchResult.bonusType !== 'none' && matchResult.bonusPosition ? {
        pos: matchResult.bonusPosition,
        type: matchResult.bonusType,
        emoji: grid[matchResult.bonusPosition.row][matchResult.bonusPosition.col].emoji
      } : null;

      clearArray.forEach(p => { grid[p.row][p.col] = { emoji: '', modifier: 'none' }; });
      if (bonusTile) { grid[bonusTile.pos.row][bonusTile.pos.col] = { emoji: bonusTile.emoji, modifier: bonusTile.type }; }

      await new Promise(resolve => setTimeout(resolve, 400));

      // Gravity
      for (let c = 0; c < GRID_SIZE; c++) {
        let emptySpots = 0;
        for (let r = GRID_SIZE - 1; r >= 0; r--) {
          if (grid[r][c].emoji === '') emptySpots++;
          else if (emptySpots > 0) {
            grid[r + emptySpots][c] = { ...grid[r][c] };
            grid[r][c] = { emoji: '', modifier: 'none' };
          }
        }
        for (let r = 0; r < emptySpots; r++) { grid[r][c] = { emoji: getRandomEmoji(), modifier: 'none' }; }
      }

      setState(prev => ({ ...prev, grid: grid.map(row => row.map(t => ({...t}))) }));
      await new Promise(resolve => setTimeout(resolve, 200));
      lastPlayerAction = null; 
    }

    if (iterationCount === 0 && lastPlayerAction) return null;
    return { grid, damage: damageToEnemy, healing: healingToPlayer };
  }, [state.activePerks]);

  const handleTileClick = async (row: number, col: number) => {
    if (state.isAnimating || state.view !== 'playing') return;

    if (!state.selectedTile) {
      setState(prev => ({ ...prev, selectedTile: {row, col}, hint: null }));
    } else {
      const p1 = state.selectedTile;
      const p2 = {row, col};

      if (areAdjacent(p1, p2)) {
        const newGrid = state.grid.map(r => r.map(t => ({...t})));
        const temp = { ...newGrid[p1.row][p1.col] };
        newGrid[p1.row][p1.col] = { ...newGrid[p2.row][p2.col] };
        newGrid[p2.row][p2.col] = temp;

        setState(prev => ({ 
          ...prev, 
          grid: newGrid, 
          selectedTile: null, 
          isAnimating: true,
          movesUntilAttack: prev.movesUntilAttack - 1 
        }));

        const result = await processBoard(newGrid, p2);

        if (result === null) {
          setState(prev => ({ ...prev, grid: state.grid, isAnimating: false, movesUntilAttack: prev.movesUntilAttack + 1 }));
        } else {
          setState(prev => {
            let nextHp = Math.max(0, prev.enemyHp - Math.floor(result.damage));
            let nextPlayerHp = Math.min(prev.playerMaxHp, prev.playerHp + result.healing);
            let nextMoves = prev.movesUntilAttack;
            let message = "Good hit!";

            if (nextMoves <= 0) {
              const attackPower = 10 + prev.floor * 5;
              nextPlayerHp = Math.max(0, nextPlayerHp - attackPower);
              nextMoves = ATTACK_INTERVAL;
              message = `Enemy attacked for ${attackPower}!`;
            }

            if (nextHp <= 0) {
                return { ...prev, enemyHp: 0, playerHp: nextPlayerHp, isAnimating: false, view: 'reward', message: "Boss Defeated!" };
            }

            if (nextPlayerHp <= 0) {
                return { ...prev, playerHp: 0, isAnimating: false, view: 'gameOver', message: "You died in the dungeon..." };
            }

            return { ...prev, enemyHp: nextHp, playerHp: nextPlayerHp, movesUntilAttack: nextMoves, isAnimating: false, message };
          });
        }
      } else {
        setState(prev => ({ ...prev, selectedTile: p2 }));
      }
    }
  };

  const selectPerk = (perkId: string) => {
    setState(prev => {
      const perk = PERKS.find(p => p.id === perkId);
      let nextMaxHp = prev.playerMaxHp;
      let nextHp = prev.playerHp;
      
      if (perkId === 'tank') {
          nextMaxHp += 30;
          nextHp = nextMaxHp;
      }
      
      const nextFloor = prev.floor + 1;
      const nextEnemy = ENEMIES[(nextFloor - 1) % ENEMIES.length];
      const difficultyMultiplier = 1 + (nextFloor * 0.2);

      return {
        ...prev,
        view: 'playing',
        floor: nextFloor,
        activePerks: [...prev.activePerks, perkId],
        playerMaxHp: nextMaxHp,
        playerHp: nextHp,
        enemyHp: Math.floor(nextEnemy.hpBase * difficultyMultiplier),
        enemyMaxHp: Math.floor(nextEnemy.hpBase * difficultyMultiplier),
        movesUntilAttack: ATTACK_INTERVAL,
        message: `Entered Floor ${nextFloor}`,
        grid: createInitialGrid()
      };
    });
  };

  const startNewGame = () => {
    setState({
      grid: createInitialGrid(),
      view: 'playing',
      floor: 1,
      playerHp: 100,
      playerMaxHp: 100,
      enemyHp: ENEMIES[0].hpBase,
      enemyMaxHp: ENEMIES[0].hpBase,
      movesUntilAttack: ATTACK_INTERVAL,
      selectedTile: null,
      isAnimating: false,
      message: "Deep into the emoji dungeon...",
      hint: null,
      combo: 0,
      explosions: [],
      activePerks: [],
    });
  };

  const rewardPerks = useMemo(() => {
    const shuffled = [...PERKS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }, [state.view === 'reward']);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-950 overflow-hidden font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative">
        
        {state.view === 'start' ? (
          <div className="text-center py-20 space-y-8">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-pink-600">EMOJI ROGUE</h1>
            <p className="text-slate-400">Battle emoji bosses, collect perks, and survive the dungeon depths.</p>
            <button onClick={startNewGame} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-xl shadow-lg transform active:scale-95 transition-all">
                Enter Dungeon
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-tighter">Current Floor</span>
                    <span className="text-xl font-black text-white">B{state.floor}</span>
                </div>
                <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Enemy: {currentEnemy.name}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-3xl">{currentEnemy.emoji}</span>
                    </div>
                </div>
            </div>

            {/* Enemy HP Bar */}
            <div className="w-full h-3 bg-slate-800 rounded-full mb-6 overflow-hidden border border-white/5">
                <div 
                    className="h-full bg-red-600 transition-all duration-500 shadow-[0_0_10px_rgba(220,38,38,0.5)]" 
                    style={{ width: `${(state.enemyHp / state.enemyMaxHp) * 100}%` }}
                />
            </div>

            <Stats score={state.playerHp} moves={state.movesUntilAttack} combo={state.combo} maxHp={state.playerMaxHp} />
            
            <div className="relative mb-6 flex justify-center">
                <Board 
                    grid={state.grid} 
                    onTileClick={handleTileClick} 
                    selectedTile={state.selectedTile}
                    hintTiles={state.hint}
                    isAnimating={state.isAnimating}
                />
                {state.explosions.map(e => (
                    <ParticleEffect key={e.id} particles={e.particles} emoji={e.emoji} onComplete={() => setState(p => ({...p, explosions: p.explosions.filter(ex => ex.id !== e.id)}))} />
                ))}

                {state.view === 'reward' && (
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-xl flex flex-col items-center justify-center z-50 p-6">
                        <h2 className="text-2xl font-black text-yellow-400 mb-2">Victory!</h2>
                        <p className="text-slate-400 text-sm mb-6">Choose a permanent perk:</p>
                        <div className="grid gap-3 w-full">
                            {rewardPerks.map(perk => (
                                <button 
                                    key={perk.id}
                                    onClick={() => selectPerk(perk.id)}
                                    className="p-3 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-left transition-all active:scale-95 flex items-center gap-4"
                                >
                                    <span className="text-3xl">{perk.icon}</span>
                                    <div>
                                        <div className="font-bold text-white text-sm">{perk.name}</div>
                                        <div className="text-xs text-slate-400">{perk.description}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {state.view === 'gameOver' && (
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-50">
                        <span className="text-6xl mb-4">💀</span>
                        <h2 className="text-3xl font-black text-white mb-2">Defeated</h2>
                        <p className="text-slate-400 mb-6">You reached floor {state.floor}</p>
                        <button onClick={startNewGame} className="px-10 py-3 bg-white text-black rounded-full font-bold">Try Again</button>
                    </div>
                )}
            </div>

            <div className="mb-4 text-center py-3 bg-slate-900 border border-white/5 rounded-2xl">
                <p className="text-sm text-slate-300 font-medium">{state.message}</p>
            </div>

            <Controls onNewGame={startNewGame} onHint={() => setState(p => ({...p, hint: getPotentialMatches(p.grid)}))} disabled={state.isAnimating || state.view !== 'playing'} />
            
            <div className="mt-4 flex flex-wrap gap-1 justify-center">
                {state.activePerks.map((pid, i) => {
                    const perk = PERKS.find(p => p.id === pid);
                    return <span key={i} title={perk?.name} className="text-lg grayscale-0 hover:grayscale transition-all cursor-help">{perk?.icon}</span>;
                })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
