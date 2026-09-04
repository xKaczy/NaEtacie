'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Mic,
  MapPin,
  SlidersHorizontal,
  Sparkles,
  Crown,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  X,
  Layers,
  Zap,
  Route,
} from 'lucide-react';
import { cn, triggerHaptic } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';
import { playUiSound, isUiSoundEnabled, toggleUiSound } from '@/lib/motion/soundEngine';
import { SZCZECIN_BRIDGES } from '@/components/map/EnterpriseMapHUD';

interface AdaptiveMobileTopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isListening?: boolean;
  onVoiceSearch?: () => void;
  onOpenFilters?: () => void;
  onOpenProTier?: () => void;
  onOpenQuickMenu?: () => void;
  activeDistrict?: string | null;
  totalOffersCount?: number;
  activeTab?: 'list' | 'map' | 'favorites' | 'settings';
  onTabChange?: (tab: 'list' | 'map' | 'favorites' | 'settings') => void;
}

export const AdaptiveMobileTopBar: React.FC<AdaptiveMobileTopBarProps> = ({
  searchQuery,
  onSearchChange,
  isListening = false,
  onVoiceSearch,
  onOpenFilters,
  onOpenProTier,
  onOpenQuickMenu,
  activeDistrict,
  totalOffersCount = 140,
  activeTab = 'list',
  onTabChange,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [bridgesOpen, setBridgesOpen] = useState(false);
  const [soundActive, setSoundActive] = useState(true);
  const {
    mode,
    setMode,
    outdoorMode,
    setOutdoorMode,
    ruggedMode,
    setRuggedMode,
  } = useTheme();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSoundActive(isUiSoundEnabled());

    let lastY = 0;
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > 60 && !isScrolled) {
        setIsScrolled(true);
      } else if (currentY <= 30 && isScrolled) {
        setIsScrolled(false);
      }
      lastY = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isScrolled]);

  const handleToggleSound = () => {
    const next = toggleUiSound();
    setSoundActive(next);
    triggerHaptic(10);
    playUiSound('toggle');
  };

  const handleToggleTheme = () => {
    const nextMode = mode === 'dark' ? 'light' : 'dark';
    setMode(nextMode);
    triggerHaptic(10);
    playUiSound('toggle');
  };

  return (
    <div className="sticky top-0 z-40 w-full px-2.5 sm:px-4 pt-1.5 pb-2 transition-all duration-300 pointer-events-none">
      {/* Outer Floating Glass Capsule */}
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={cn(
          'pointer-events-auto mx-auto max-w-2xl rounded-2xl sm:rounded-3xl border border-white/10 dark:border-white/10 shadow-xl backdrop-blur-2xl transition-all duration-300 overflow-hidden',
          isScrolled
            ? 'bg-zinc-950/85 dark:bg-zinc-950/90 py-1.5 px-3 border-amber-500/20 shadow-amber-500/5'
            : 'bg-zinc-900/80 dark:bg-zinc-950/80 py-2.5 px-3.5'
        )}
      >
        {/* COMPACT MINIMAL STATE (When Scrolled Down) */}
        {isScrolled && !isSearchExpanded ? (
          <div className="flex items-center justify-between gap-2">
            {/* Quick Search Trigger Pill */}
            <button
              type="button"
              onClick={() => {
                setIsSearchExpanded(true);
                triggerHaptic(10);
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }}
              className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-800/70 border border-zinc-700/60 text-xs text-zinc-400 hover:text-zinc-200 transition text-left"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span className="truncate">
                {searchQuery || `Szukaj w Szczecinie (${totalOffersCount} ofert)...`}
              </span>
            </button>

            {/* Quick Map / List Switcher */}
            {onTabChange && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(12);
                  playUiSound('pop');
                  onTabChange(activeTab === 'map' ? 'list' : 'map');
                }}
                className="shrink-0 p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition flex items-center gap-1 text-xs font-bold"
                title={activeTab === 'map' ? 'Przełącz na listę' : 'Przełącz na mapę 3D'}
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">{activeTab === 'map' ? 'Lista' : 'Mapa 3D'}</span>
              </button>
            )}

            {/* PRO Badge */}
            {onOpenProTier && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  onOpenProTier();
                }}
                className="shrink-0 p-1.5 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/40 text-xs font-extrabold flex items-center gap-1 transition"
              >
                <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>PRO</span>
              </button>
            )}
          </div>
        ) : (
          /* EXPANDED HARMONIOUS MOBILE BAR */
          <div className="space-y-2">
            {/* ROW 1: Ticker & Bridge Status + Sensory Controls & PRO */}
            <div className="flex items-center justify-between text-xs gap-1.5">
              {/* Location & District */}
              <div className="flex items-center gap-1 text-zinc-300 font-medium truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="font-bold text-white">Szczecin</span>
                <span className="text-zinc-500">•</span>
                <span className="text-zinc-400 truncate text-[11px]">
                  {activeDistrict || `${totalOffersCount} ofert`}
                </span>
              </div>

              {/* Utility Cluster: Mosty + Sound + Theme + PRO */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Mosty Szczecina Pill */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setBridgesOpen(!bridgesOpen);
                      triggerHaptic(8);
                    }}
                    className="p-1 px-1.5 rounded-lg bg-zinc-800/80 text-[10px] font-bold text-zinc-300 border border-zinc-700 flex items-center gap-1 transition"
                  >
                    <Route className="w-3 h-3 text-amber-400" />
                    <span className="font-mono text-emerald-400">+3m</span>
                  </button>

                  {/* Bridge Mini Popover */}
                  {bridgesOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-48 p-2 rounded-xl bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800 shadow-2xl z-50 space-y-1">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pb-1 border-b border-zinc-800">
                        Mosty Szczecina
                      </div>
                      {SZCZECIN_BRIDGES.map((b) => (
                        <div key={b.name} className="flex justify-between text-[11px]">
                          <span className="text-zinc-300">{b.name}</span>
                          <span className="text-emerald-400 font-mono font-bold">+{b.delayMin}m</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(12);
                    playUiSound('toggle');
                    setRuggedMode(!ruggedMode);
                  }}
                  className={cn(
                    'p-1.5 rounded-lg text-xs transition flex items-center justify-center',
                    ruggedMode
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/20 ring-1 ring-amber-400/40'
                      : 'bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-white'
                  )}
                  title={ruggedMode ? 'Tryb rękawic (budowlany) włączony' : 'Włącz tryb rękawic (duże przyciski 48px)'}
                  aria-pressed={ruggedMode}
                >
                  <span className="text-[12px] leading-none" role="img" aria-label="Rękawice">🧤</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(12);
                    playUiSound('toggle');
                    setOutdoorMode(!outdoorMode);
                  }}
                  className={cn(
                    'p-1.5 rounded-lg text-xs transition flex items-center justify-center',
                    outdoorMode
                      ? 'bg-yellow-500/25 text-yellow-300 border border-yellow-500/50 shadow-sm shadow-yellow-500/20 ring-1 ring-yellow-400/40'
                      : 'bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-white'
                  )}
                  title={outdoorMode ? 'Tryb pełnego słońca włączony' : 'Włącz tryb pełnego słońca (kontrast na budowie)'}
                  aria-pressed={outdoorMode}
                >
                  <span className="text-[12px] leading-none" role="img" aria-label="Słońce">☀️</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleSound}
                  className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                  title={soundActive ? 'Wycisz dźwięki' : 'Włącz dźwięki'}
                >
                  {soundActive ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={handleToggleTheme}
                  className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                  title="Przełącz motyw"
                >
                  {mode === 'dark' ? <Sun className="w-3.5 h-3.5 text-yellow-400" /> : <Moon className="w-3.5 h-3.5" />}
                </button>

                {onOpenProTier && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(15);
                      onOpenProTier();
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold uppercase transition"
                  >
                    <Crown className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>PRO</span>
                  </button>
                )}
              </div>
            </div>

            {/* ROW 2: Search Input & Quick Action Cluster */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={isListening ? '🎙️ Słucham... mów np. "dekarz 8k"' : 'Szukaj: murarz, glazurnik...'}
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className={cn(
                    'w-full pl-9 pr-14 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-700/70 text-xs font-medium text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition',
                    isListening && 'border-red-500 ring-2 ring-red-500/30 animate-pulse'
                  )}
                />

                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {onVoiceSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(15);
                        onVoiceSearch();
                      }}
                      className={cn(
                        'p-1.5 rounded-lg transition active:scale-90',
                        isListening
                          ? 'bg-red-500 text-white animate-bounce'
                          : 'text-zinc-400 hover:text-amber-400'
                      )}
                      title="Wyszukiwanie głosowe"
                    >
                      <Mic className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        onSearchChange('');
                        triggerHaptic(8);
                      }}
                      className="p-1 text-zinc-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filters Button */}
              {onOpenFilters && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(12);
                    playUiSound('pop');
                    onOpenFilters();
                  }}
                  className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-amber-400 border border-zinc-700 transition"
                  title="Filtry"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Map/List Switcher */}
              {onTabChange && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(12);
                    playUiSound('pop');
                    onTabChange(activeTab === 'map' ? 'list' : 'map');
                  }}
                  className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-amber-400 border border-zinc-700 transition"
                  title="Przełącz widok"
                >
                  <Layers className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
