'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Map, List, Calculator, Scale,
  Moon, Sun, X, ArrowRight, Sparkles
} from 'lucide-react';
import type { DisplayAnnouncement } from '@/lib/types/display';
import type { TabId } from '@/components/navigation/AppShell';
import { useTheme } from '@/components/theme';

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  ads: DisplayAnnouncement[];
  onSelectAd: (id: string) => void;
  onSelectTab: (tab: TabId) => void;
  onOpenCalculator: () => void;
  onOpenCompare: () => void;
  onFilterSalaryOnly?: () => void;
  onFilterRemoteOnly?: () => void;
}

export function CommandPaletteModal({
  isOpen,
  onClose,
  ads,
  onSelectAd,
  onSelectTab,
  onOpenCalculator,
  onOpenCompare,
  onFilterSalaryOnly,
  onFilterRemoteOnly,
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState('');
  const { mode, setMode } = useTheme();

  // Listen for Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredAds = query.trim()
    ? ads.filter(
        (a) =>
          a.title.toLowerCase().includes(query.toLowerCase()) ||
          a.location_text.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-md">
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="relative w-full max-w-xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden text-card-foreground flex flex-col z-10"
        >
          {/* Search Bar Input */}
          <div className="flex items-center px-4 py-3 border-b border-border/50 gap-3">
            <Search className="w-5 h-5 text-primary shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Wpisz szukaną frazę lub komendę... (np. spawacz, mapa, netto)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold outline-none text-foreground placeholder:text-muted-foreground"
            />
            {query && (
              <button onClick={() => setQuery('')} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold text-muted-foreground bg-muted border border-border rounded">
              ESC
            </kbd>
          </div>

          {/* Search Results & Commands List */}
          <div className="max-h-[380px] overflow-y-auto p-2 space-y-3 text-xs">
            {/* Matching Ads Section */}
            {filteredAds.length > 0 && (
              <div className="space-y-1">
                <div className="px-3 py-1 font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                  Ogłoszenia ({filteredAds.length})
                </div>
                {filteredAds.map((ad) => (
                  <div
                    key={ad.id}
                    onClick={() => {
                      onSelectAd(ad.id);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-accent/80 cursor-pointer transition-colors"
                  >
                    <div className="space-y-0.5 truncate pr-2">
                      <div className="font-bold text-foreground truncate">{ad.title}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <span>📍 {ad.location_text}</span>
                      </div>
                    </div>
                    {typeof ad.price === 'number' && (
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                        {ad.price.toLocaleString('pl-PL')} zł
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Quick System Commands */}
            <div className="space-y-1">
              <div className="px-3 py-1 font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                Szybkie akcje i nawigacja
              </div>

              <div
                onClick={() => {
                  onSelectTab('map');
                  onClose();
                }}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-accent/80 cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <Map className="w-4 h-4 text-primary" /> Przejdź do Widoku Mapy
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </div>

              <div
                onClick={() => {
                  onSelectTab('list');
                  onClose();
                }}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-accent/80 cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <List className="w-4 h-4 text-primary" /> Przejdź do Listy Ogłoszeń
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </div>

              <div
                onClick={() => {
                  onOpenCalculator();
                  onClose();
                }}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-accent/80 cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <Calculator className="w-4 h-4 text-emerald-500" /> Kalkulator Wynagrodzeń Netto
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </div>

              {onFilterSalaryOnly && (
                <div
                  onClick={() => {
                    onFilterSalaryOnly();
                    onClose();
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-accent/80 cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Filtruj: Tylko z podanym wynagrodzeniem
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}

              {onFilterRemoteOnly && (
                <div
                  onClick={() => {
                    onFilterRemoteOnly();
                    onClose();
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-accent/80 cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <Sparkles className="w-4 h-4 text-indigo-500" /> Filtruj: Praca Zdalna
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}

              <div
                onClick={() => {
                  onOpenCompare();
                  onClose();
                }}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-accent/80 cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <Scale className="w-4 h-4 text-blue-500" /> Porównywarka Ofert Pracy
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </div>

              <div
                onClick={() => {
                  setMode(mode === 'dark' ? 'light' : 'dark');
                  onClose();
                }}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-accent/80 cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-2 font-semibold">
                  {mode === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                  Przełącz Motyw ({mode === 'dark' ? 'Jasny' : 'Ciemny'})
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
