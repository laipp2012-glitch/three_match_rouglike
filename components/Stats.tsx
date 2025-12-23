
import React from 'react';
import { ATTACK_INTERVAL } from '../types.ts';

interface StatsProps {
  score: number;
  moves: number;
  combo: number;
  maxHp: number;
}

const Stats: React.FC<StatsProps> = ({ score, moves, combo, maxHp }) => {
  const hpPercent = (score / maxHp) * 100;
  
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <div className="bg-slate-900 rounded-2xl p-3 border border-white/5 flex flex-col overflow-hidden relative">
        <div className="flex justify-between items-center mb-1 relative z-10">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-widest">Player HP</span>
            <span className="text-xs font-bold text-white">{score}/{maxHp}</span>
        </div>
        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden relative z-10">
            <div 
                className={`h-full transition-all duration-300 ${hpPercent < 30 ? 'bg-red-500' : 'bg-green-500'}`} 
                style={{ width: `${hpPercent}%` }}
            />
        </div>
        {combo > 1 && (
            <div className="absolute top-0 right-0 bg-pink-600 text-[10px] px-2 py-0.5 rounded-bl-lg font-black animate-bounce z-20">
                COMBO X{combo}
            </div>
        )}
      </div>

      <div className="bg-slate-900 rounded-2xl p-3 border border-white/5 flex flex-col items-center justify-center">
        <span className="text-[9px] uppercase font-black text-slate-500 tracking-widest mb-1">Next Enemy Attack</span>
        <div className="flex items-center gap-1">
            {[...Array(ATTACK_INTERVAL)].map((_, i) => (
                <div 
                    key={i} 
                    className={`h-1.5 w-2 rounded-full transition-all ${i < moves ? 'bg-indigo-500' : 'bg-slate-700'}`}
                />
            ))}
        </div>
        <span className="text-xs font-black mt-1 text-indigo-400">{moves} moves left</span>
      </div>
    </div>
  );
};

export default Stats;
