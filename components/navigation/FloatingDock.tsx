'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowUp,
  Calculator,
  Bot,
  SlidersHorizontal,
  Command,
  Sparkles,
  Map,
  List,
  RefreshCw,
} from 'lucide-react';
import { cn, triggerHaptic } from '@/lib/utils';
import { playUiSound } from '@/lib/motion/soundEngine';
import { SPRING_PRESETS } from '@/lib/motion/springs';

export interface FloatingDockProps {
  onOpenEstimator?: () => void;
  onOpenAiInterview?: () => void;
  onOpenCommandPalette?: () => void;
  onToggleSplitView?: () => void;
  onRefresh?: () => void;
  isSplitView?: boolean;
  activeTab?: string;
}

export function FloatingDock({
  onOpenEstimator,
  onOpenAiInterview,
  onOpenCommandPalette,
  onToggleSplitView,
  onRefresh,
  isSplitView = false,
  activeTab,
}: FloatingDockProps) {
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (activeTab === 'map') {
      setVisible(false);
      return;
    }
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  const scrollToTop = () => {
    triggerHaptic(10);
    playUiSound('whoosh');
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 25, scale: 0.9 }}
          transition={SPRING_PRESETS.snappy}
          className="fixed bottom-[84px] md:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 p-1.5 rounded-full bg-card/90 backdrop-blur-2xl border border-primary/25 shadow-2xl text-card-foreground select-none"
        >
          {/* Scroll to Top */}
          <button
            type="button"
            onClick={scrollToTop}
            className="p-2 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            title="Przewiń na samą górę"
            aria-label="Wróć na górę strony"
          >
            <ArrowUp className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-border/60" />

          {/* Szybka Wycena Robocizny */}
          {onOpenEstimator && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                playUiSound('pop');
                onOpenEstimator();
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-500/20 transition-all cursor-pointer shadow-xs"
              title="Kalkulator wyceny zlecenia"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Wycena</span>
            </button>
          )}

          {/* Trening AI */}
          {onOpenAiInterview && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                playUiSound('pop');
                onOpenAiInterview();
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs border border-primary/20 transition-all cursor-pointer shadow-xs"
              title="Trenuj rozmowę rekrutacyjną z AI"
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Trening</span>
            </button>
          )}

          {/* Split View Toggle (Desktop) */}
          {onToggleSplitView && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                playUiSound('toggle');
                onToggleSplitView();
              }}
              className={cn(
                'hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-full font-bold text-xs transition-all cursor-pointer shadow-xs border',
                isSplitView
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60'
              )}
              title="Przełącz widok podzielony (Lista + Mapa)"
            >
              <Map className="w-3.5 h-3.5" />
              <span>Split-View</span>
            </button>
          )}

          {/* Command Palette Trigger */}
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                playUiSound('pop');
                onOpenCommandPalette();
              }}
              className="p-2 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              title="Paleta Komend (⌘K)"
              aria-label="Otwórz paletę komend"
            >
              <Command className="w-4 h-4" />
            </button>
          )}

          {/* Refresh Offers Trigger */}
          {onRefresh && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(12);
                playUiSound('sparkle');
                onRefresh();
              }}
              className="p-2 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              title="Odśwież najnowsze ogłoszenia"
              aria-label="Odśwież oferty"
            >
              <RefreshCw className="w-4 h-4 hover:rotate-180 transition-transform duration-300" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
