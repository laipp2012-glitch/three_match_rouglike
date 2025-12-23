
import React from 'react';
import { Tile, Position } from '../types.ts';

interface BoardProps {
  grid: Tile[][];
  onTileClick: (row: number, col: number) => void;
  selectedTile: Position | null;
  hintTiles: Position[] | null;
  isAnimating: boolean;
}

const Board: React.FC<BoardProps> = ({ grid, onTileClick, selectedTile, hintTiles, isAnimating }) => {
  const getModifierIcon = (modifier: string) => {
    switch (modifier) {
      case 'fire': return '🔥';
      case 'star': return '🌟';
      case 'lightning': return '⚡';
      default: return null;
    }
  };

  const getModifierStyles = (modifier: string) => {
    switch (modifier) {
      case 'fire': return 'ring-2 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] bg-red-500/10';
      case 'star': return 'ring-2 ring-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.7)] bg-yellow-400/10';
      case 'lightning': return 'ring-2 ring-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.6)] bg-blue-400/10';
      default: return '';
    }
  };

  return (
    <div className="grid grid-cols-8 gap-1 p-1 bg-slate-700/50 rounded-xl shadow-inner border border-slate-600 overflow-visible select-none relative z-10">
      {grid.map((rowArr, r) => 
        rowArr.map((tile, c) => {
          const isSelected = selectedTile?.row === r && selectedTile?.col === c;
          const isHint = hintTiles?.some(h => h.row === r && h.col === c);
          const modifierIcon = getModifierIcon(tile.modifier);
          
          return (
            <div
              key={`${r}-${c}`}
              onClick={() => onTileClick(r, c)}
              className={`
                w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 
                flex items-center justify-center 
                text-xl sm:text-2xl cursor-pointer 
                rounded-md transition-all duration-150 
                relative
                ${isSelected ? 'bg-white/20 ring-4 ring-white scale-110 z-20 shadow-xl' : 'hover:bg-white/10'}
                ${isHint ? 'animate-pulse ring-2 ring-green-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : ''}
                ${tile.modifier !== 'none' ? getModifierStyles(tile.modifier) : ''}
              `}
            >
              {tile.emoji ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <span className={`transform active:scale-90 transition-transform animate-pop inline-block ${tile.modifier !== 'none' ? 'filter drop-shadow-md' : ''}`}>
                    {tile.emoji}
                  </span>
                  {modifierIcon && (
                    <span className="absolute -top-1 -right-1 text-[10px] sm:text-[12px] bg-slate-900 rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center shadow-md animate-bounce">
                      {modifierIcon}
                    </span>
                  )}
                </div>
              ) : (
                <div className="w-full h-full" />
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default Board;
