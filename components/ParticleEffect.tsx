
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
    const duration = 1000; // Total effect time

    // Physics constants based on emoji type
    const drag = emoji === '🍇' ? 0.92 : 0.96; // Grapes have more "air resistance"
    const gravity = emoji === '🍋' ? 0.08 : 0.15; // Lemon particles are "lighter"
    const pushForce = emoji === '🍎' ? 1.05 : 1.02; // Apple has a sharper initial push

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress >= 1) {
        onComplete();
        return;
      }

      setActiveParticles(prev => 
        prev.map(p => {
          // Outward push effect is strongest at the start
          const currentPush = progress < 0.2 ? pushForce : 1.0;
          
          return {
            ...p,
            x: p.x + (p.vx * currentPush),
            y: p.y + (p.vy * currentPush),
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
  }, [onComplete, emoji]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible z-30">
      {activeParticles.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            opacity: p.life,
            transform: `translate(-50%, -50%) rotate(${p.rotation}deg) scale(${p.life + 0.5})`,
            boxShadow: progressToShadow(p.life, p.color),
            // Pixel look: sharp edges
            borderRadius: '0px'
          }}
        />
      ))}
    </div>
  );
};

function progressToShadow(life: number, color: string): string {
  if (life > 0.8) return `0 0 8px ${color}`;
  if (life > 0.5) return `0 0 4px ${color}`;
  return 'none';
}

export default ParticleEffect;
