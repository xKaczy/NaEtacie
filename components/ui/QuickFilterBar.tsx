'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, MapPin, Briefcase, Sparkles, SlidersHorizontal, Sun, Flame, Building2, Globe } from 'lucide-react';
import { cn, triggerHaptic } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';

export interface QuickFilter {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

const QUICK_FILTERS: QuickFilter[] = [
  { id: 'urgent', label: '🚨 Na Cito / Pilne', icon: Flame, color: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30' },
  { id: 'german_border', label: '🇩🇪 Przygranicze DE (€)', icon: Globe, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { id: 'mega_projects', label: '🏗️ Wielkie Budowy', icon: Building2, color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { id: 'high_pay', label: '💰 Wysokie stawki (>45 zł/h)', icon: Zap, color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { id: 'today', label: '✨ Dodane dzisiaj', icon: Sparkles, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { id: 'near_me', label: '📍 Szczecin & Okolice', icon: MapPin, color: 'text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/30' },
  { id: 'finishing', label: '🎨 Wykończenia', icon: Briefcase, color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30' },
  { id: 'installations', label: '⚡ Instalacje Wod-Kan / SEP', icon: Sparkles, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
];

interface QuickFilterBarProps {
  onFilterToggle?: (filterId: string) => void;
  activeFilters?: string[];
  totalOffersCount?: number;
  onRefresh?: () => void;
  activeFilterId?: string | null;
}

export function QuickFilterBar({
  onFilterToggle,
  activeFilterId,
  totalOffersCount = 750,
}: QuickFilterBarProps) {
  const { outdoorMode, setOutdoorMode } = useTheme();

  return (
    <div className="w-full bg-card/60 backdrop-blur-xl border-b border-border/40 px-3 sm:px-4 py-2.5 space-y-2 transition-all duration-300">
      {/* Header ribbon: Verified Offers Count + Outdoor Sun Mode */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-foreground">
            {totalOffersCount} aktywnych ofert w Szczecinie
          </span>
        </div>

        {/* Outdoor Sun Mode Toggle */}
        <motion.button
          onClick={() => {
            triggerHaptic(12);
            setOutdoorMode(!outdoorMode);
          }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all shadow-xs touch-manipulation cursor-pointer border',
            outdoorMode
              ? 'bg-amber-400 text-neutral-950 border-amber-500 shadow-amber-500/30 font-black'
              : 'bg-accent/70 hover:bg-accent text-muted-foreground hover:text-foreground border-border/60'
          )}
          title="Tryb Na Budowę (Maksymalny kontrast w pełnym słońcu)"
        >
          <Sun className={cn('w-3.5 h-3.5', outdoorMode ? 'text-neutral-950' : 'text-amber-500')} />
          <span className="hidden sm:inline">Tryb Budowa</span>
        </motion.button>
      </div>

      {/* 1-Tap Quick Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-0.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1 shrink-0 mr-1">
          <SlidersHorizontal className="w-3 h-3 text-primary" /> Szybki filtr:
        </span>

        {QUICK_FILTERS.map((f) => {
          const isActive = activeFilterId === f.id;
          const Icon = f.icon;

          return (
            <motion.button
              key={f.id}
              onClick={() => {
                triggerHaptic(10);
                onFilterToggle?.(f.id);
              }}
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all shrink-0 touch-manipulation cursor-pointer shadow-2xs',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20'
                  : `bg-card/90 text-foreground hover:bg-accent border-border/70 ${f.color}`
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-primary-foreground' : '')} />
              <span>{f.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
