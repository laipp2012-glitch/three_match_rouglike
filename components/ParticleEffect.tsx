import React, { useEffect, useState } from 'react';
import { Particle } from '../types';

interface ParticleEffectProps {
  particles: Particle[];
  emoji: string;
  onComplete: () => void;
}

const ParticleEffect: React.FC<ParticleEffectProps> = ({ particles, emoji, onComplete }) => {
  const [activeParticles, setActiveParticles] = useState(particles);

  useEffect(() => {
    let animationFrame: number;
    const startTime = Date.now();
    const duration = 800; // Быстрее для более сочного эффекта

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress >= 1) {
        onComplete();
        return;
      }

      setActiveParticles(prev => 
        prev.map(p => {
          // Имитация физики: замедление + гравитация
          const drag = 0.95;
          const gravity = 0.2;
          
          return {
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vx: p.vx * drag,
            vy: (p.vy * drag) + gravity,
            rotation: p.rotation + p.vr,
            life: 1 - progress
          };
        })
      );

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [onComplete]);

  return (
    <div className="absolute inset-0 pointer-events-none z-40" style={{ padding: '1.5rem' }}>
      <div className="relative w-full h-full">
        {activeParticles.map(p => (
          <div
            key={p.id}
            className="absolute shadow-lg"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              opacity: p.life,
              transform: `translate(-50%, -50%) rotate(${p.rotation}deg) scale(${p.life + 0.3})`,
              boxShadow: `0 0 10px ${p.color}88`,
              borderRadius: '2px' // Делаем их квадратными "пикселями"
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ParticleEffect;