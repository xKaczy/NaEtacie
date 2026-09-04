'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  RefreshCw,
  Scale,
  X,
  WifiOff,
} from 'lucide-react';
import { cn, triggerHaptic } from '@/lib/utils';
import { playUiSound } from '@/lib/motion/soundEngine';
import { SPRING_PRESETS } from '@/lib/motion/springs';

export interface DynamicIslandProps {
  isListening?: boolean;
  isScraping?: boolean;
  comparedCount?: number;
  totalOffersCount?: number;
  avgSalaryPln?: number;
  onOpenCompare?: () => void;
  onStopListening?: () => void;
  onRefresh?: () => void;
}

/**
 * DynamicIsland - Mobile-First Adaptive Morphing Status Capsule
 * Floats anchored at the top of the mobile viewport with spring physics.
 */
export function DynamicIsland({
  isListening = false,
  isScraping = false,
  comparedCount = 0,
  totalOffersCount = 0,
  avgSalaryPln = 7850,
  onOpenCompare,
  onStopListening,
  onRefresh: _onRefresh,
}: DynamicIslandProps) {
  const [isOffline, setIsOffline] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Determine primary active state
  const state = isOffline
    ? 'offline'
    : isListening
    ? 'listening'
    : isScraping
    ? 'scraping'
    : comparedCount > 0
    ? 'comparing'
    : 'ambient';

  return (
    <div className="fixed top-2.5 left-1/2 -translate-x-1/2 z-40 select-none pointer-events-auto max-w-[92vw]">
      <motion.div
        layout
        transition={SPRING_PRESETS.snappy}
        className={cn(
          'flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-2xl border shadow-2xl transition-colors duration-300 text-xs font-black',
          state === 'offline' && 'bg-amber-950/90 text-amber-200 border-amber-500/50 shadow-amber-500/20 ring-2 ring-amber-500/30',
          state === 'listening' && 'bg-red-950/90 text-red-200 border-red-500/40 shadow-red-500/20 ring-2 ring-red-500/30',
          state === 'scraping' && 'bg-primary/90 text-primary-foreground border-primary shadow-primary/20',
          state === 'comparing' && 'bg-blue-950/90 text-blue-200 border-blue-500/40 shadow-blue-500/20 ring-2 ring-blue-500/20',
          state === 'ambient' && 'bg-card/90 text-card-foreground border-primary/25 shadow-xl'
        )}
      >
        <AnimatePresence mode="wait">
          {/* State 0: Offline Mode Notice */}
          {state === 'offline' && (
            <motion.div
              key="offline"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-[11px] font-bold">Tryb offline — zapisane oferty w pamięci</span>
            </motion.div>
          )}
          {/* State 1: Voice Listening Waveform */}
          {state === 'listening' && (
            <motion.div
              key="listening"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 3, 2, 1].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [4, h * 4, 4] }}
                    transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.08 }}
                    className="w-0.5 rounded-full bg-red-400"
                  />
                ))}
              </div>
              <span className="text-[11px] tracking-tight">Słucham... mów po polsku</span>
              {onStopListening && (
                <button
                  type="button"
                  onClick={onStopListening}
                  className="p-1 rounded-full bg-red-900/60 text-white hover:bg-red-800 transition-colors"
                  aria-label="Zatrzymaj"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </motion.div>
          )}

          {/* State 2: Live Scraping / Syncing */}
          {state === 'scraping' && (
            <motion.div
              key="scraping"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary-foreground" />
              <span className="text-[11px]">Pobieranie najnowszych ofert...</span>
            </motion.div>
          )}

          {/* State 3: Active Comparison Dock Badge */}
          {state === 'comparing' && (
            <motion.div
              key="comparing"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => {
                triggerHaptic(15);
                playUiSound('sparkle');
                onOpenCompare?.();
              }}
            >
              <Scale className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px]">Porównywarka ({comparedCount}/3)</span>
              <span className="text-[9px] bg-blue-500/30 px-1.5 py-0.2 rounded-md font-bold">
                Otwórz ➔
              </span>
            </motion.div>
          )}

          {/* State 4: Ambient Market Ticker */}
          {state === 'ambient' && (
            <motion.div
              key="ambient"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2 text-[11px] font-bold"
            >
              <div className="flex items-center gap-1 text-primary">
                <Sparkles className="w-3 h-3 animate-pulse" />
                <span>Szczecin</span>
              </div>
              <span className="text-border">|</span>
              <span className="text-foreground" suppressHydrationWarning>
                {totalOffersCount} ofert
              </span>
              <span className="text-border">|</span>
              <span
                className="text-emerald-600 dark:text-emerald-400 font-extrabold"
                suppressHydrationWarning
              >
                śr. {avgSalaryPln.toLocaleString('pl-PL')} zł
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
