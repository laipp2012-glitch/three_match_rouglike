import React from 'react';
import { Tile, Position } from '../types';

interface BoardProps {
  grid: Tile[][];
  onTileClick: (row: number, col: number) => void;
  selectedTile: Position | null;
  isAnimating: boolean;
}

const Board: React.FC<BoardProps> = ({ grid, onTileClick, selectedTile, isAnimating }) => {
  return (
    <div className="grid grid-cols-8 gap-1.5 p-2 bg-black/60 rounded-[2.5rem] border border-white/10 shadow-2xl mb-8 relative">
      {grid.map((row, r) => row.map((tile, c) => {
        const isSelected = selectedTile?.row === r && selectedTile?.col === c;
        const modifier = tile.modifier;
        
        let modifierStyles = "";
        let badgeIcon = null;
        let bgEffect = "bg-white/5";

        if (modifier === 'fire') {
          modifierStyles = "special-fire border-red-500/50 border";
          bgEffect = "bg-gradient-to-br from-red-900/20 to-orange-900/20";
          badgeIcon = "🔥";
        } else if (modifier === 'lightning') {
          modifierStyles = "special-lightning border-blue-400/50 border";
          bgEffect = "bg-gradient-to-br from-blue-900/20 to-cyan-900/20";
          badgeIcon = "⚡";
        } else if (modifier === 'star') {
          modifierStyles = "special-star border-yellow-400/50 border";
          bgEffect = "bg-gradient-to-br from-yellow-700/20 to-purple-900/20";
          badgeIcon = "⭐";
        }

        return (
          <div 
            key={tile.id} 
            onClick={() => onTileClick(r, c)}
            className={`aspect-square flex items-center justify-center text-xl sm:text-2xl cursor-pointer rounded-2xl transition-all duration-200 relative
              ${isSelected ? 'bg-white/30 ring-4 ring-white scale-110 z-20 shadow-2xl' : `hover:brightness-125 ${bgEffect}`}
              ${modifierStyles}
              ${tile.emoji === '' ? 'opacity-0 scale-50' : 'opacity-100'}`}
          >
            {/* Основной эмодзи */}
            <span className={`tile-pop select-none z-10 ${modifier !== 'none' ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : ''}`}>
              {tile.emoji}
            </span>
            
            {/* Черный круг с иконкой модификатора в углу */}
            {modifier !== 'none' && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-black border border-white/20 rounded-full flex items-center justify-center shadow-lg z-20 scale-90">
                <span className="text-[10px] drop-shadow-sm leading-none flex items-center justify-center">
                  {badgeIcon}
                </span>
              </div>
            )}

            {/* Дополнительный визуальный слой для свечения всей плитки */}
            {modifier !== 'none' && (
                <div className="absolute inset-0 rounded-2xl opacity-10 pointer-events-none mix-blend-screen bg-white"></div>
            )}
          </div>
        );
      }))}
    </div>
  );
};

export default Board;