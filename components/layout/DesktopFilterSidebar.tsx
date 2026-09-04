'use client';

import React from 'react';
import {
  SlidersHorizontal,
  MapPin,
  Building2,
  DollarSign,
  Briefcase,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { cn, triggerHaptic } from '@/lib/utils';
import { playUiSound } from '@/lib/motion/soundEngine';

export interface DesktopFilterSidebarProps {
  selectedDistrict: string | null;
  onSelectDistrict: (district: string | null) => void;
  selectedPortal: string;
  onSelectPortal: (portal: string) => void;
  selectedTrade?: string | null;
  onSelectTrade?: (trade: string | null) => void;
  minSalary: number;
  onMinSalaryChange: (val: number) => void;
  commuteKm: number;
  onCommuteKmChange: (val: number) => void;
  onResetFilters: () => void;
}

const SZCZECIN_DISTRICTS = [
  'Wszystkie dzielnice',
  'Śródmieście & Centrum',
  'Pogodno & Krzekowo',
  'Prawobrzeże & Dąbie',
  'Niebuszewo & Warszewo',
  'Gumieńce & Pomorzany',
  'Police & Okolice',
];

const POPULAR_TRADES = [
  'Wszystkie branże',
  'Płytki i glazura',
  'Instalacje wod-kan i CO',
  'Gładzie i malowanie',
  'Tynki maszynowe',
  'Cieśla i dekarz',
  'Zbrojarz i betoniarz',
  'Sucha zabudowa (G-K)',
  'Pompy ciepła i HVAC',
  'Brukarstwo i roboty ziemne',
];

export function DesktopFilterSidebar({
  selectedDistrict,
  onSelectDistrict,
  selectedPortal,
  onSelectPortal,
  selectedTrade,
  onSelectTrade,
  minSalary,
  onMinSalaryChange,
  commuteKm,
  onCommuteKmChange,
  onResetFilters,
}: DesktopFilterSidebarProps) {
  return (
    <aside className="w-64 shrink-0 space-y-4 p-4 rounded-3xl bg-card/75 backdrop-blur-2xl border border-border/70 shadow-sm text-card-foreground select-none sticky top-16 max-h-[calc(100vh-80px)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <span className="font-extrabold text-xs uppercase tracking-wider text-foreground">
            Filtry Desktop Pro
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            playUiSound('pop');
            onResetFilters();
          }}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Zresetuj wszystkie filtry"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 1. Dzielnice Szczecina */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <MapPin className="w-3 h-3 text-primary" />
          Dzielnica Szczecina
        </span>
        <div className="space-y-1">
          {SZCZECIN_DISTRICTS.map((dist) => {
            const isAll = dist === 'Wszystkie dzielnice';
            const isActive = isAll ? !selectedDistrict : selectedDistrict === dist;

            return (
              <button
                key={dist}
                type="button"
                onClick={() => {
                  triggerHaptic(5);
                  playUiSound('pop');
                  onSelectDistrict(isAll ? null : dist);
                }}
                className={cn(
                  'w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer truncate',
                  isActive
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                {dist}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Minimalna stawka (PLN) */}
      <div className="space-y-1.5 pt-2 border-t border-border/40">
        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase">
          <span className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-emerald-500" />
            Min. stawka
          </span>
          <span className="text-foreground font-mono font-black">
            {minSalary > 0 ? `${minSalary.toLocaleString('pl-PL')} zł` : 'Każda'}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={15000}
          step={500}
          value={minSalary}
          onChange={(e) => onMinSalaryChange(Number(e.target.value))}
          className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
      </div>

      {/* 3. Promień dojazdu */}
      <div className="space-y-1.5 pt-2 border-t border-border/40">
        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase">
          <span>Maks. promień dojazdu</span>
          <span className="text-foreground font-mono font-black">
            {commuteKm > 0 ? `${commuteKm} km` : 'Bez limitu'}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={50}
          step={5}
          value={commuteKm}
          onChange={(e) => onCommuteKmChange(Number(e.target.value))}
          className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
      </div>

      {/* 4. Portal źródłowy */}
      <div className="space-y-1.5 pt-2 border-t border-border/40">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
          Portal / Źródło
        </span>
        <select
          value={selectedPortal}
          onChange={(e) => {
            triggerHaptic(5);
            onSelectPortal(e.target.value);
          }}
          className="w-full h-8 px-2 text-xs font-bold rounded-xl border border-input bg-background cursor-pointer"
        >
          <option value="all">Wszystkie portale</option>
          <option value="bip">🏛️ BIP Szczecin (Przetargi)</option>
          <option value="olx">OLX Praca</option>
          <option value="pracuj">Pracuj.pl</option>
          <option value="indeed">Indeed</option>
          <option value="oferteo">Oferteo Zlecenia</option>
          <option value="fixly">Fixly</option>
        </select>
      </div>

      {/* 5. Branże budowlane (Trade Tags) */}
      {onSelectTrade && (
        <div className="space-y-1.5 pt-2 border-t border-border/40">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Briefcase className="w-3 h-3 text-primary" />
            Branża budowlana
          </span>
          <div className="space-y-0.5 max-h-44 overflow-y-auto pr-1">
            {POPULAR_TRADES.map((trade) => {
              const isAll = trade === 'Wszystkie branże';
              const isActive = isAll ? !selectedTrade : selectedTrade === trade;

              return (
                <button
                  key={trade}
                  type="button"
                  onClick={() => {
                    triggerHaptic(5);
                    playUiSound('pop');
                    onSelectTrade(isAll ? null : trade);
                  }}
                  className={cn(
                    'w-full text-left px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer truncate',
                    isActive
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )}
                >
                  {trade}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
