
import React from 'react';

interface ControlsProps {
  onNewGame: () => void;
  onHint: () => void;
  disabled: boolean;
}

const Controls: React.FC<ControlsProps> = ({ onNewGame, onHint, disabled }) => {
  return (
    <div className="flex gap-3">
      <button
        onClick={onNewGame}
        className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl font-bold transition-all border-b-4 border-slate-900 active:border-b-0 active:translate-y-1"
      >
        🔄 New Game
      </button>
      <button
        onClick={onHint}
        disabled={disabled}
        className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all border-b-4 border-indigo-900 active:border-b-0 active:translate-y-1"
      >
        💡 Hint
      </button>
    </div>
  );
};

export default Controls;
