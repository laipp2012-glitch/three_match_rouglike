import React, { useEffect, useState } from 'react';
import { FloatingText } from '../types';

interface Props {
  texts: FloatingText[];
  onComplete: (id: string) => void;
}

const FloatingCombatText: React.FC<Props> = ({ texts, onComplete }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-[100] overflow-hidden">
      {texts.map(t => (
        <FloatingItem key={t.id} text={t} onComplete={onComplete} />
      ))}
    </div>
  );
};

const FloatingItem: React.FC<{ text: FloatingText; onComplete: (id: string) => void }> = ({ text, onComplete }) => {
  const [life, setLife] = useState(1);
  const [yOffset, setYOffset] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const start = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = elapsed / duration;
      
      if (progress >= 1) {
        onComplete(text.id);
        return;
      }
      
      setLife(1 - progress);
      setYOffset(progress * 100);
      requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
  }, []);

  return (
    <div 
      className="absolute font-black text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-none whitespace-nowrap"
      style={{
        left: `${text.x}%`,
        top: `${text.y}%`,
        color: text.color,
        opacity: life,
        transform: `translate(-50%, -${yOffset}px) scale(${1 + (1 - life) * 0.5})`,
      }}
    >
      {text.text}
    </div>
  );
};

export default FloatingCombatText;