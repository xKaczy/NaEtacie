'use client';

import React, { useRef, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRING_PRESETS } from '@/lib/motion/springs';

export interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  borderGlowColor?: string;
  enableTilt?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * SpotlightCard - Apple & Linear-inspired Glass Bento Card
 * 
 * Features:
 * - Dynamic mouse-tracking radial gradient spotlight
 * - Interactive 3D micro-tilt with perspective depth
 * - Holographic border sheen
 * - Full reduced-motion & mobile touch safety
 */
export function SpotlightCard({
  children,
  className,
  spotlightColor = 'rgba(16, 185, 129, 0.12)',
  borderGlowColor = 'rgba(16, 185, 129, 0.35)',
  enableTilt = true,
  onClick,
  ...props
}: SpotlightCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: -1000, y: -1000 });
  const [tilt, setTilt] = useState<{ rotateX: number; rotateY: number }>({ rotateX: 0, rotateY: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || prefersReducedMotion) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCoords({ x, y });

    if (enableTilt) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -3.5; // Max 3.5 deg
      const rotateY = ((x - centerX) / centerX) * 3.5;
      setTilt({ rotateX, rotateY });
    }
  }, [enableTilt, prefersReducedMotion]);

  const handleMouseLeave = () => {
    setCoords({ x: -1000, y: -1000 });
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      animate={
        prefersReducedMotion || !enableTilt
          ? {}
          : {
              rotateX: tilt.rotateX,
              rotateY: tilt.rotateY,
              transformPerspective: 1000,
            }
      }
      transition={SPRING_PRESETS.snappy}
      className={cn(
        'relative rounded-2xl border border-border/60 bg-card text-card-foreground',
        'overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300',
        'will-change-transform group',
        className
      )}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {/* 🌟 Dynamic Mouse-Tracking Spotlight Glow */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${coords.x}px ${coords.y}px, ${spotlightColor}, transparent 80%)`,
        }}
      />

      {/* 💎 Holographic Border Refraction */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(280px circle at ${coords.x}px ${coords.y}px, ${borderGlowColor}, transparent 70%)`,
          maskImage: 'linear-gradient(black, black) content-box, linear-gradient(black, black)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          padding: '1px',
        }}
      />

      {/* Card Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
