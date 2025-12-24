
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  GRID_SIZE, ENEMIES, PERKS, ATTACK_INTERVAL, MANA_MAX,
  Tile, Position, GameView, TileModifier, Enemy, Particle, FloatingText, ManaPool 
} from './types';
import { createInitialGrid, findMatches, areAdjacent, createTile, getRandomEmoji } from './utils/gameLogic';
import Board from './components/Board';
import Stats from './components/Stats';
import ParticleEffect from './components/ParticleEffect';
import FloatingCombatText from './components/FloatingCombatText';

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

const SKILL_DATA = {
  '🍎': { title: 'Ярость', desc: '500 УРОНА', color: 'text-red-400' },
  '🍋': { title: 'Свет', desc: '+100 HP', color: 'text-yellow-400' },
  '🍇': { title: 'Хаос', desc: 'РИСК/БОНУС', color: 'text-purple-400' }
};

const App: React.FC = () => {
  const [view, setView] = useState<GameView>('start');
  const [grid, setGrid] = useState<Tile[][]>(createInitialGrid());
  const [selected, setSelected] = useState<Position | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [effects, setEffects] = useState<ActiveEffect[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  
  const [floor, setFloor] = useState(1);
  const [playerHp, setPlayerHp] = useState(100);
  const [playerMaxHp, setPlayerMaxHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(ENEMIES[0].hp);
  const [maxEnemyHp, setMaxEnemyHp] = useState(ENEMIES[0].hp);
  const [moves, setMoves] = useState(ATTACK_INTERVAL);
  const [activePerks, setActivePerks] = useState<string[]>([]);
  const [mana, setMana] = useState<ManaPool>({ '🍎': 0, '🍋': 0, '🍇': 0 });

  const currentEnemy: Enemy = ENEMIES[(floor - 1) % ENEMIES.length];
  const comboRef = useRef(0);

  const getPerkCount = (id: string) => activePerks.filter(p => p === id).length;

  const addFloatingText = (text: string, x: number, y: number, color: string) => {
    setFloatingTexts(prev => [...prev, {
      id: Math.random().toString(),
      text, x, y, color, life: 1
    }]);
  };

  const createParticlesForTile = (r: number, c: number, emoji: string): Particle[] => {
    const color = EMOJI_COLORS[emoji] || '#ffffff';
    const particles: Particle[] = [];
    const count = 12;
    const centerX = (c * 12.5) + 6.25;
    const centerY = (r * 12.5) + 6.25;
    for (let i = 0; i < count; i++) {
      particles.push({
        id: Math.random().toString(36).substr(2, 9),
        x: centerX,
        y: centerY,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.8) * 6,
        vr: (Math.random() - 0.5) * 30,
        rotation: Math.random() * 360,
        life: 1,
        size: Math.random() * 5 + 3,
        color
      });
    }
    return particles;
  };

  const getAffectedPositions = (r: number, c: number, modifier: TileModifier, emoji: string, currentGrid: Tile[][]): Position[] => {
    let affected: Position[] = [];
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

  const processTurn = async (currentGrid: Tile[][], isFirstPass = false): Promise<boolean> => {
    if (isFirstPass) comboRef.current = 0;

    const matches = findMatches(currentGrid);
    if (matches.length === 0) return false;

    comboRef.current += 1;
    setIsAnimating(true);
    let newGrid = currentGrid.map(row => [...row]);
    let positionsToProcess: Position[] = [];
    let bonusesToCreate: { row: number, col: number, type: TileModifier }[] = [];

    matches.forEach(m => {
      positionsToProcess.push(...m.tiles);
      if (m.tiles.length === 4) bonusesToCreate.push({ ...m.tiles[0], type: 'fire' });
      if (m.tiles.length >= 5) bonusesToCreate.push({ ...m.tiles[0], type: 'star' });
    });

    let finalClearSet = new Set<string>();
    let triggeredModifiers = new Set<string>();
    let explosionTilesSet = new Set<string>(); 
    let queue = [...positionsToProcess];

    while (queue.length > 0) {
      const p = queue.shift()!;
      const key = `${p.row},${p.col}`;
      if (finalClearSet.has(key)) {
        const tile = newGrid[p.row][p.col];
        if (tile.modifier !== 'none' && !triggeredModifiers.has(key)) {
          triggeredModifiers.add(key);
          const extra = getAffectedPositions(p.row, p.col, tile.modifier, tile.emoji, newGrid);
          extra.forEach(ep => {
            if (tile.modifier === 'fire') explosionTilesSet.add(`${ep.row},${ep.col}`);
            queue.push(ep);
          });
        }
        continue;
      }
      finalClearSet.add(key);
      const tile = newGrid[p.row][p.col];
      if (tile.modifier !== 'none' && !triggeredModifiers.has(key)) {
        triggeredModifiers.add(key);
        const extra = getAffectedPositions(p.row, p.col, tile.modifier, tile.emoji, newGrid);
        extra.forEach(ep => {
          if (tile.modifier === 'fire') explosionTilesSet.add(`${ep.row},${ep.col}`);
          queue.push(ep);
        });
      }
    }

    const finalClear: Position[] = Array.from(finalClearSet).map(s => {
      const [r, c] = s.split(',').map(Number);
      return { row: r, col: c };
    });

    // --- РАСЧЕТ УРОНА ---
    const pyroCount = getPerkCount('pyro');
    const luckyCount = getPerkCount('lucky');
    const critChance = 0.1 + (luckyCount * 0.15);
    const critMultiplier = 1.5 + (luckyCount * 0.5);
    let comboMultiplier = 1 + (comboRef.current - 1) * 0.3;
    
    let totalTurnDamage = 0;
    let hadCrit = false;

    finalClear.forEach(p => {
      const key = `${p.row},${p.col}`;
      let tileBaseDamage = 10;
      if (explosionTilesSet.has(key)) tileBaseDamage *= Math.pow(2, pyroCount);
      if (Math.random() < critChance) {
        tileBaseDamage *= critMultiplier;
        hadCrit = true;
      }
      totalTurnDamage += tileBaseDamage;
    });

    const finalDamage = Math.round(totalTurnDamage * comboMultiplier);

    // --- МАНА ---
    setMana(prevMana => {
      const nextMana = { ...prevMana };
      finalClear.forEach(p => {
        const tile = currentGrid[p.row][p.col];
        if (['🍎', '🍋', '🍇'].includes(tile.emoji)) {
          nextMana[tile.emoji as keyof ManaPool] = Math.min(MANA_MAX, nextMana[tile.emoji as keyof ManaPool] + 5.0);
        }
      });
      return nextMana;
    });

    if (hadCrit) addFloatingText("CRIT!", 50, 30, '#facc15');
    if (comboRef.current > 1) addFloatingText(`COMBO x${comboRef.current}!`, 50, 40, '#a855f7');
    addFloatingText(`-${finalDamage}`, 50, 20, hadCrit ? '#fbbf24' : '#ef4444');

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
    setEnemyHp(h => Math.max(0, h - finalDamage));

    const vampireCount = getPerkCount('vampire');
    if (vampireCount > 0) {
        const apples = finalClear.filter(p => currentGrid[p.row][p.col].emoji === '🍎').length;
        if (apples > 0) setPlayerHp(h => Math.min(playerMaxHp, h + apples * (5 * vampireCount)));
    }

    finalClear.forEach(p => {
      newGrid[p.row][p.col] = { id: Math.random().toString(), emoji: '', modifier: 'none' };
    });

    bonusesToCreate.forEach(b => {
      newGrid[b.row][b.col] = createTile(getRandomEmoji(), b.type);
    });

    setGrid([...newGrid]);
    await new Promise(res => setTimeout(res, 350));

    // Гравитация
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

    const hasMoreMatches = await processTurn(newGrid);
    if (!hasMoreMatches) setIsAnimating(false);
    return true;
  };

  const useSkill = async (type: '🍎' | '🍋' | '🍇') => {
    if (isAnimating || mana[type] < MANA_MAX) return;
    setIsAnimating(true);
    setMana(prev => ({ ...prev, [type]: 0 }));

    if (type === '🍎') {
        addFloatingText("ЯРОСТЬ!!!", 50, 20, "#ef4444");
        setEnemyHp(h => Math.max(0, h - 500));
    } else if (type === '🍋') {
        addFloatingText("+100 HP", 50, 80, "#4ade80");
        setPlayerHp(h => Math.min(playerMaxHp, h + 100));
    } else if (type === '🍇') {
        const roll = Math.random();
        if (roll < 0.3) {
            addFloatingText("ПРОВАЛ!", 50, 80, "#ef4444");
            setPlayerHp(h => Math.max(0, h - 40));
        } else {
            addFloatingText("УДАЧА!", 50, 50, "#a855f7");
            let newGrid = grid.map(row => [...row]);
            for (let i = 0; i < 4; i++) {
                const r = Math.floor(Math.random() * GRID_SIZE), c = Math.floor(Math.random() * GRID_SIZE);
                newGrid[r][c].modifier = (['fire', 'lightning', 'star'] as TileModifier[])[Math.floor(Math.random() * 3)];
            }
            setGrid(newGrid);
        }
    }
    await new Promise(r => setTimeout(r, 600));
    processTurn(grid, true);
  };

  const handleTileClick = useCallback(async (r: number, c: number) => {
    if (isAnimating || view !== 'playing') return;
    if (!selected) {
      setSelected({ row: r, col: c });
    } else {
      if (areAdjacent(selected, { row: r, col: c })) {
        let currentGridState = grid.map(row => [...row]);
        const temp = currentGridState[selected.row][selected.col];
        currentGridState[selected.row][selected.col] = currentGridState[r][c];
        currentGridState[r][c] = temp;
        setGrid(currentGridState);
        const matched = await processTurn(currentGridState, true);
        if (!matched) {
          setTimeout(() => setGrid(grid), 250);
        } else {
          setMoves(m => {
            if (m <= 1) {
              const dmg = currentEnemy.damage;
              setPlayerHp(hp => Math.max(0, hp - dmg));
              addFloatingText(`-${dmg}`, 50, 80, "#ef4444");
              return ATTACK_INTERVAL;
            }
            return m - 1;
          });
        }
      }
      setSelected(null);
    }
  }, [grid, selected, isAnimating, view, floor, currentEnemy]);

  const addPerk = (perkId: string) => {
    setActivePerks(prev => [...prev, perkId]);
    if (perkId === 'tank') {
        setPlayerMaxHp(h => h + 100);
        setPlayerHp(h => h + 100);
    }
    const nextFloorNum = floor + 1;
    setFloor(nextFloorNum);
    const enemy = ENEMIES[(nextFloorNum - 1) % ENEMIES.length];
    const scaledHp = Math.round(enemy.hp * (1 + (nextFloorNum - 1) * 0.4));
    setEnemyHp(scaledHp);
    setMaxEnemyHp(scaledHp);
    setMoves(ATTACK_INTERVAL);
    setGrid(createInitialGrid());
    setMana({ '🍎': 0, '🍋': 0, '🍇': 0 }); 
    setView('playing');
  };

  useEffect(() => {
    if (enemyHp <= 0 && view === 'playing') setView('reward');
    if (playerHp <= 0 && view === 'playing') setView('gameOver');
  }, [enemyHp, playerHp, view]);

  // Fix: Explicitly typing 'id' as string to resolve 'unknown' type assignment to string parameter in getPerkCount(id)
  const activePerkDetails = Array.from(new Set(activePerks)).map((id: string) => {
      const perk = PERKS.find(p => p.id === id);
      const count = getPerkCount(id);
      return { ...perk, count };
  });

  if (view === 'start') return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <h1 className="text-7xl font-black mb-4 tracking-tighter bg-gradient-to-br from-indigo-400 to-purple-600 bg-clip-text text-transparent">EMOJI ROGUE</h1>
      <p className="text-slate-400 mb-12 text-lg italic uppercase tracking-widest">Уничтожай. Собирай. Выживай.</p>
      <button onClick={() => setView('playing')} className="px-16 py-5 bg-indigo-600 rounded-3xl font-black text-2xl shadow-2xl hover:bg-indigo-500 transition-all active:scale-95">ИГРАТЬ</button>
    </div>
  );

  if (view === 'reward') return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="text-6xl mb-6">🎁</div>
      <h2 className="text-4xl font-black mb-2 uppercase">ПОБЕДА!</h2>
      <p className="text-slate-400 mb-10">Выберите благословение:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
        {PERKS.map(perk => (
          <button key={perk.id} onClick={() => addPerk(perk.id)} className="bg-slate-900 border border-white/10 p-6 rounded-3xl hover:bg-indigo-900/40 transition-all text-left group">
            <div className="text-3xl mb-3 group-hover:scale-125 transition-transform">{perk.icon}</div>
            <div className="font-bold text-lg">{perk.name}</div>
            <div className="text-sm text-slate-500 leading-tight">{perk.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 select-none">
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-6 shadow-2xl relative overflow-hidden">
        {effects.map(effect => (
          <ParticleEffect key={effect.id} particles={effect.particles} emoji={effect.emoji} 
            onComplete={() => setEffects(prev => prev.filter(e => e.id !== effect.id))} />
        ))}
        <FloatingCombatText texts={floatingTexts} onComplete={(id) => setFloatingTexts(prev => prev.filter(t => t.id !== id))} />
        <div className="flex justify-between items-end mb-4 relative z-10">
          <div>
            <div className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">Этаж {floor}</div>
            <div className="text-2xl font-black">{currentEnemy.name}</div>
          </div>
          <div className="text-5xl animate-bounce drop-shadow-2xl">{currentEnemy.emoji}</div>
        </div>
        <div className="w-full h-5 bg-slate-800 rounded-full mb-8 overflow-hidden border border-white/5 relative z-10 flex items-center shadow-inner">
          <div className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-500" style={{width: `${(enemyHp/maxEnemyHp)*100}%`}} />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[11px] font-black text-white">
            {Math.ceil(enemyHp)} / {Math.ceil(maxEnemyHp)}
          </div>
        </div>
        <Board grid={grid} onTileClick={handleTileClick} selectedTile={selected} isAnimating={isAnimating} />
        <div className="mb-6 grid grid-cols-3 gap-2 relative z-10">
            {(['🍎', '🍋', '🍇'] as const).map(type => {
                const info = SKILL_DATA[type];
                const isReady = mana[type] >= MANA_MAX;
                return (
                  <button key={type} disabled={!isReady || isAnimating} onClick={() => useSkill(type)}
                    className={`h-24 rounded-2xl border border-white/10 flex flex-col items-center justify-center transition-all relative overflow-hidden group
                      ${isReady ? 'bg-indigo-600 scale-105 shadow-xl brightness-125 ring-2 ring-white/20' : 'bg-slate-800/80 opacity-60 grayscale'}`}
                  >
                      <div className="absolute bottom-0 left-0 h-1 bg-white/40 transition-all duration-300" style={{width: `${(mana[type]/MANA_MAX)*100}%`}} />
                      <div className="flex flex-col items-center text-center px-1 relative z-10">
                        <span className="text-2xl group-active:scale-125 transition-transform leading-none mb-0.5">{type}</span>
                        <span className={`text-[10px] font-black uppercase ${info.color} leading-none mb-0.5`}>{info.title}</span>
                        <span className="text-[8px] font-bold text-slate-400 opacity-80 uppercase leading-none">{info.desc}</span>
                      </div>
                  </button>
                );
            })}
        </div>
        {activePerkDetails.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2 px-1 relative z-10">
            {activePerkDetails.map((perk, idx) => (
              <div key={idx} className="group relative">
                <div className="w-10 h-10 bg-slate-800 border border-white/10 rounded-xl flex items-center justify-center text-lg shadow-lg hover:bg-slate-700 transition-colors relative">
                  {perk?.icon}
                  {perk.count > 1 && (
                    <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-[8px] font-black px-1 rounded-md border border-white/20">x{perk.count}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <Stats playerHp={playerHp} playerMaxHp={playerMaxHp} moves={moves} attackInterval={ATTACK_INTERVAL} />
        {view === 'gameOver' && (
          <div className="absolute inset-0 bg-red-950/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-10 text-center rounded-[3rem]">
            <div className="text-7xl mb-6">💀</div>
            <h2 className="text-4xl font-black mb-4 uppercase">КОНЕЦ ИГРЫ</h2>
            <button onClick={() => window.location.reload()} className="w-full py-5 bg-white text-red-950 rounded-3xl font-black text-xl hover:scale-105 transition-all">В МЕНЮ</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
