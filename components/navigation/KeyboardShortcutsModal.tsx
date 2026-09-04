'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X, Command } from 'lucide-react';
import { playUiSound } from '@/lib/motion/soundEngine';
import { SPRING_PRESETS } from '@/lib/motion/springs';

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    title: 'Nawigacja i Przeglądanie',
    shortcuts: [
      { key: 'J / ↓', desc: 'Przejdź do następnej oferty na liście' },
      { key: 'K / ↑', desc: 'Przejdź do poprzedniej oferty' },
      { key: 'M', desc: 'Przełącz tryb Split-View (Lista + Mapa 3D)' },
      { key: '/', desc: 'Wyszukaj ofertę (focus na wyszukiwarkę)' },
      { key: '⌘K / Ctrl+K', desc: 'Otwórz Paletę Komend i Narzędzi' },
    ],
  },
  {
    title: 'Akcje na Aktywnej Ofercie',
    shortcuts: [
      { key: 'F', desc: 'Dodaj / Usuń ofertę z Ulubionych ❤️' },
      { key: 'S', desc: 'Wygeneruj zgłoszenie SMS / WhatsApp 💬' },
      { key: 'C', desc: 'Dodaj ofertę do Porównywarki ⚖️' },
      { key: 'W', desc: 'Wycena robocizny i kalkulator zlecenia 🧮' },
      { key: 'Esc', desc: 'Zamknij aktywne okno / szufladę / podgląd' },
    ],
  },
];

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => {
              playUiSound('whoosh');
              onClose();
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={SPRING_PRESETS.snappy}
            className="relative z-10 w-full max-w-lg bg-card/98 backdrop-blur-2xl border border-primary/25 rounded-3xl p-6 shadow-2xl text-card-foreground select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-foreground tracking-tight">
                    Skróty Klawiszowe Desktop Pro
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Szybka nawigacja i obsługa zleceń bez odrywania rąk od klawiatury
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playUiSound('pop');
                  onClose();
                }}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Zamknij"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Groups */}
            <div className="space-y-4">
              {SHORTCUT_GROUPS.map((group) => (
                <div key={group.title} className="space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    {group.title}
                  </span>
                  <div className="space-y-1.5">
                    {group.shortcuts.map((sc) => (
                      <div
                        key={sc.key}
                        className="flex items-center justify-between p-2 rounded-xl bg-background/60 border border-border/40 text-xs"
                      >
                        <span className="text-muted-foreground font-medium">{sc.desc}</span>
                        <kbd className="px-2 py-1 text-[11px] font-mono font-black bg-primary/10 text-primary rounded-lg border border-primary/20 shadow-2xs">
                          {sc.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Naciśnij <kbd className="px-1.5 py-0.5 font-mono font-bold bg-muted rounded border">?</kbd> w dowolnym momencie, aby otworzyć tę pomoc</span>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Rozumiem
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
