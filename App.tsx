import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  GRID_SIZE, ENEMIES, PERKS, ATTACK_INTERVAL, MANA_MAX,
  Tile, Position, GameView, TileModifier, Enemy, Particle, FloatingText, ManaPool 
} from './types.ts';
import { createInitialGrid, findMatches, areAdjacent, createTile, getRandomEmoji } from './utils/gameLogic.ts';
import Board from './components/Board.tsx';
import Stats from './components/Stats.tsx';
import ParticleEffect from './components/ParticleEffect.tsx';
import FloatingCombatText from './components/FloatingCombatText.tsx';

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
  '🍇': { title: 'Хаос', desc: 'БОНУСЫ', color: 'text-purple-400' }
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
  const lastValidGrid = useRef<Tile[][]>(grid);

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
    const centerX = (c * 12.5) + 6.25;
    const centerY = (r * 12.5) + 6.25;
    for (let i = 0; i < 10; i++) {
      particles.push({
        id: Math.random().toString(36).substr(2, 9),
        x: centerX, y: centerY,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.7) * 8,
        vr: (Math.random() - 0.5) * 40,
        rotation: Math.random() * 360,
        life: 1, size: Math.random() * 4 + 2, color
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
    if (isFirstPass) {
      comboRef.current = 0;
      setIsAnimating(true);
    }

    const matches = findMatches(currentGrid);
    if (matches.length === 0) {
      return false; // Нет совпадений в ДАННОМ вызове
    }

    comboRef.current += 1;
    
    let clearedSet = new Set<string>();
    let triggeredSet = new Set<string>();
    let explosionsSet = new Set<string>();
    let queue: Position[] = [];

    matches.forEach(m => m.tiles.forEach(p => {
        const key = `${p.row},${p.col}`;
        if (!clearedSet.has(key)) {
            clearedSet.add(key);
            queue.push(p);
        }
    }));

    while (queue.length > 0) {
      const p = queue.shift()!;
      const key = `${p.row},${p.col}`;
      const tile = currentGrid[p.row][p.col];

      if (tile.modifier !== 'none' && !triggeredSet.has(key)) {
        triggeredSet.add(key);
        const extra = getAffectedPositions(p.row, p.col, tile.modifier, tile.emoji, currentGrid);
        extra.forEach(ep => {
          const eKey = `${ep.row},${ep.col}`;
          if (tile.modifier === 'fire') explosionsSet.add(eKey);
          if (!clearedSet.has(eKey)) {
            clearedSet.add(eKey);
            queue.push(ep);
          } else if (!triggeredSet.has(eKey)) {
            queue.push(ep);
          }
        });
      }
    }

    const finalClear: Position[] = Array.from(clearedSet).map(s => {
      const [r, c] = s.split(',').map(Number);
      return { row: r, col: c };
    });

    // Урон
    const pyroCount = getPerkCount('pyro');
    const luckyCount = getPerkCount('lucky');
    const critChance = 0.1 + (luckyCount * 0.15);
    const critMultiplier = 1.5 + (luckyCount * 0.5);
    const comboMultiplier = 1 + (comboRef.current - 1) * 0.3;
    
    let totalTurnDamage = 0;
    let hadCrit = false;

    finalClear.forEach(p => {
      const key = `${p.row},${p.col}`;
      let base = 10;
      if (explosionsSet.has(key)) base *= Math.pow(2, pyroCount);
      if (Math.random() < critChance) { base *= critMultiplier; hadCrit = true; }
      totalTurnDamage += base;
    });

    const finalDamage = Math.round(totalTurnDamage * comboMultiplier);

    setMana(prev => {
      const next = { ...prev };
      finalClear.forEach(p => {
        const emoji = currentGrid[p.row][p.col].emoji;
        if (['🍎', '🍋', '🍇'].includes(emoji)) {
          next[emoji as keyof ManaPool] = Math.min(MANA_MAX, next[emoji as keyof ManaPool] + 4);
        }
      });
      return next;
    });

    if (hadCrit) addFloatingText("CRIT!", 50, 30, '#facc15');
    if (comboRef.current > 1) addFloatingText(`COMBO x${comboRef.current}!`, 50, 40, '#a855f7');
    addFloatingText(`-${finalDamage}`, 50, 20, hadCrit ? '#fbbf24' : '#ef4444');

    const newEffects = finalClear.map(p => ({
      id: Math.random().toString(),
      emoji: currentGrid[p.row][p.col].emoji,
      particles: createParticlesForTile(p.row, p.col, currentGrid[p.row][p.col].emoji)
    })).filter(e => e.emoji !== '');
    
    setEffects(prev => [...prev, ...newEffects]);
    setEnemyHp(h => Math.max(0, h - finalDamage));

    const vCount = getPerkCount('vampire');
    if (vCount > 0) {
      const apples = finalClear.filter(p => currentGrid[p.row][p.col].emoji === '🍎').length;
      if (apples > 0) setPlayerHp(h => Math.min(playerMaxHp, h + apples * (5 * vCount)));
    }

    let nextGrid = currentGrid.map(row => [...row]);
    finalClear.forEach(p => { nextGrid[p.row][p.col] = { id: Math.random().toString(), emoji: '', modifier: 'none' }; });

    matches.forEach(m => {
      const emoji = currentGrid[m.tiles[0].row][m.tiles[0].col].emoji;
      if (m.tiles.length === 4) nextGrid[m.tiles[0].row][m.tiles[0].col] = createTile(emoji, 'fire');
      else if (m.tiles.length >= 5) nextGrid[m.tiles[0].row][m.tiles[0].col] = createTile(emoji, 'star');
    });

    setGrid([...nextGrid]);
    await new Promise(res => setTimeout(res, 300));

    // Гравитация
    for (let c = 0; c < GRID_SIZE; c++) {
      let empty = 0;
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        if (nextGrid[r][c].emoji === '') empty++;
        else if (empty > 0) {
          nextGrid[r + empty][c] = nextGrid[r][c];
          nextGrid[r][c] = { id: Math.random().toString(), emoji: '', modifier: 'none' };
        }
      }
      for (let r = 0; r < empty; r++) nextGrid[r][c] = createTile();
    }

    setGrid([...nextGrid]);
    await new Promise(res => setTimeout(res, 200));

    await processTurn(nextGrid);
    return true; // В этой ветке были совпадения
  };

  const useSkill = async (type: '🍎' | '🍋' | '🍇') => {
    if (isAnimating || mana[type] < MANA_MAX) return;
    setIsAnimating(true);
    setMana(prev => ({ ...prev, [type]: 0 }));

    let nextGridState = grid.map(row => [...row]);

    if (type === '🍎') {
      addFloatingText("ЯРОСТЬ!!!", 50, 20, "#ef4444");
      setEnemyHp(h => Math.max(0, h - 500));
    } else if (type === '🍋') {
      addFloatingText("+100 HP", 50, 80, "#4ade80");
      setPlayerHp(h => Math.min(playerMaxHp, h + 100));
    } else if (type === '🍇') {
      addFloatingText("ХАОС!", 50, 50, "#a855f7");
      for (let i = 0; i < 6; i++) {
        const r = Math.floor(Math.random() * GRID_SIZE), c = Math.floor(Math.random() * GRID_SIZE);
        nextGridState[r][c].modifier = (['fire', 'lightning', 'star'] as TileModifier[])[Math.floor(Math.random() * 3)];
      }
      setGrid([...nextGridState]);
    }
    
    await new Promise(r => setTimeout(r, 600));
    await processTurn(nextGridState, true);
    setIsAnimating(false);
  };

  const handleTileClick = useCallback(async (r: number, c: number) => {
    if (isAnimating || view !== 'playing') return;
    if (!selected) {
      setSelected({ row: r, col: c });
    } else {
      const p2 = { row: r, col: c };
      if (areAdjacent(selected, p2)) {
        setIsAnimating(true);
        const p1 = selected;
        setSelected(null); // Очищаем выбор сразу для визуальной чистоты

        let nextGrid = grid.map(row => [...row]);
        const temp = nextGrid[p1.row][p1.col];
        nextGrid[p1.row][p1.col] = nextGrid[p2.row][p2.col];
        nextGrid[p2.row][p2.col] = temp;
        
        setGrid([...nextGrid]);
        const matched = await processTurn(nextGrid, true);
        
        if (!matched) {
          // Если совпадений нет — возвращаем назад через небольшой таймаут
          await new Promise(res => setTimeout(res, 250));
          setGrid([...grid]); // Используем оригинальный grid из замыкания
        } else {
          setMoves(m => {
            if (m <= 1) {
              setPlayerHp(hp => Math.max(0, hp - currentEnemy.damage));
              addFloatingText(`-${currentEnemy.damage}`, 50, 80, "#ef4444");
              return ATTACK_INTERVAL;
            }
            return m - 1;
          });
        }
        setIsAnimating(false);
      } else {
        setSelected(p2);
      }
    }
  }, [grid, selected, isAnimating, view, currentEnemy]);

  const addPerk = (perkId: string) => {
    setActivePerks(prev => [...prev, perkId]);
    if (perkId === 'tank') { setPlayerMaxHp(h => h + 100); setPlayerHp(h => h + 100); }
    const nextFloor = floor + 1;
    setFloor(nextFloor);
    const enemy = ENEMIES[(nextFloor - 1) % ENEMIES.length];
    const scaledHp = Math.round(enemy.hp * (1 + (nextFloor - 1) * 0.45));
    setEnemyHp(scaledHp);
    setMaxEnemyHp(scaledHp);
    setMoves(ATTACK_INTERVAL);
    const newGrid = createInitialGrid();
    setGrid(newGrid);
    lastValidGrid.current = newGrid;
    setMana({ '🍎': 0, '🍋': 0, '🍇': 0 }); 
    setView('playing');
  };

  useEffect(() => {
    if (enemyHp <= 0 && view === 'playing') setView('reward');
    if (playerHp <= 0 && view === 'playing') setView('gameOver');
  }, [enemyHp, playerHp, view]);

  if (view === 'start') return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <h1 className="text-7xl font-black mb-4 tracking-tighter bg-gradient-to-br from-indigo-400 to-purple-600 bg-clip-text text-transparent uppercase">Emoji Rogue</h1>
      <p className="text-slate-400 mb-12 text-lg italic uppercase tracking-widest">Уничтожай. Собирай. Выживай.</p>
      <button onClick={() => setView('playing')} className="px-16 py-5 bg-indigo-600 rounded-3xl font-black text-2xl shadow-2xl hover:bg-indigo-500 transition-all active:scale-95">ИГРАТЬ</button>
    </div>
  );

  if (view === 'reward') return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="text-6xl mb-6">🎁</div>
      <h2 className="text-4xl font-black mb-2 uppercase tracking-tight">ПОБЕДА!</h2>
      <p className="text-slate-400 mb-10 text-center uppercase text-sm tracking-widest">Выберите благословение:</p>
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
      <div className="w-full max-w-md bg-slate-950/90 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-6 shadow-2xl relative overflow-hidden">
        {effects.map(e => <ParticleEffect key={e.id} particles={e.particles} emoji={e.emoji} onComplete={() => setEffects(prev => prev.filter(eff => eff.id !== e.id))} />)}
        <FloatingCombatText texts={floatingTexts} onComplete={id => setFloatingTexts(prev => prev.filter(t => t.id !== id))} />
        
        <div className="flex justify-between items-end mb-4 relative z-10">
          <div className="animate-in slide-in-from-left duration-500">
              <div className="text-[10px] uppercase font-black text-slate-500 mb-1 tracking-widest">Этаж {floor}</div>
              <div className="text-2xl font-black uppercase tracking-tight">{currentEnemy.name}</div>
          </div>
          <div className="text-5xl animate-bounce drop-shadow-2xl">{currentEnemy.emoji}</div>
        </div>

        <div className="w-full h-5 bg-slate-900 rounded-full mb-8 overflow-hidden border border-white/5 relative z-10 shadow-inner">
          <div className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 transition-all duration-700 ease-out" style={{width: `${(enemyHp/maxEnemyHp)*100}%`}} />
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white/80 uppercase tracking-tighter">
              {Math.ceil(enemyHp)} / {Math.ceil(maxEnemyHp)} HP
          </div>
        </div>

        <Board grid={grid} onTileClick={handleTileClick} selectedTile={selected} isAnimating={isAnimating} />

        <div className="mb-6 grid grid-cols-3 gap-2 relative z-10">
          {(['🍎', '🍋', '🍇'] as const).map(type => (
            <button key={type} disabled={mana[type] < MANA_MAX || isAnimating} onClick={() => useSkill(type)}
              className={`h-24 rounded-2xl border border-white/10 flex flex-col items-center justify-center transition-all relative overflow-hidden active:scale-95
                ${mana[type] >= MANA_MAX ? 'bg-indigo-600 shadow-xl brightness-110 ring-2 ring-white/20' : 'bg-slate-900/80 opacity-40 grayscale'}`}>
              <div className="absolute bottom-0 left-0 h-1 bg-white/40" style={{width: `${(mana[type]/MANA_MAX)*100}%`}} />
              <span className="text-2xl mb-1">{type}</span>
              <span className={`text-[10px] font-black uppercase ${SKILL_DATA[type].color}`}>{SKILL_DATA[type].title}</span>
            </button>
          ))}
        </div>

        <Stats playerHp={playerHp} playerMaxHp={playerMaxHp} moves={moves} attackInterval={ATTACK_INTERVAL} />

        {view === 'gameOver' && (
          <div className="absolute inset-0 bg-red-950/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-10 rounded-[3rem] text-center">
            <div className="text-7xl mb-6">💀</div>
            <h2 className="text-3xl font-black mb-8 uppercase tracking-tighter">ВЫ ПОГИБЛИ</h2>
            <button onClick={() => window.location.reload()} className="w-full py-5 bg-white text-red-950 rounded-3xl font-black text-xl hover:scale-105 transition-all">В МЕНЮ</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;