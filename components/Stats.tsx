import React from 'react';

interface StatsProps {
  playerHp: number;
  playerMaxHp: number;
  moves: number;
  attackInterval: number;
}

const Stats: React.FC<StatsProps> = ({ playerHp, playerMaxHp, moves, attackInterval }) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-slate-800/40 p-4 rounded-3xl border border-white/5">
        <div className="text-[10px] uppercase font-black text-slate-500 mb-1">Здоровье</div>
        <div className="text-xl font-black text-emerald-400">{Math.ceil(playerHp)} HP</div>
        <div className="w-full h-1.5 bg-slate-900 rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-300" style={{width: `${(playerHp/playerMaxHp)*100}%`}} />
        </div>
      </div>
      <div className="bg-slate-800/40 p-4 rounded-3xl border border-white/5">
        <div className="text-[10px] uppercase font-black text-slate-500 mb-1">До атаки</div>
        <div className="text-xl font-black text-indigo-400">{moves} ходов</div>
        <div className="flex gap-1 mt-2">
          {[...Array(attackInterval)].map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < moves ? 'bg-indigo-500' : 'bg-slate-700'}`} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Stats;