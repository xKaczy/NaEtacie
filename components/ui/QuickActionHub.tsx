'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Map, List, Command, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TabId } from '@/components/navigation/AppShell';

interface QuickActionHubProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onRefresh?: () => void;
  onOpenCommandPalette?: () => void;
}

export function QuickActionHub({
  activeTab,
  onTabChange,
  onRefresh,
  onOpenCommandPalette,
}: QuickActionHubProps) {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="hidden md:flex fixed md:bottom-6 left-1/2 -translate-x-1/2 z-40 flex-col items-center gap-2.5 pointer-events-none">
      <AnimatePresence>
        {/* Back to Top Floating QOL Button */}
        {showBackToTop && (
          <motion.button
            key="quick-back-to-top"
            initial={{ scale: 0, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 10 }}
            onClick={scrollToTop}
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            className="pointer-events-auto p-3 rounded-full bg-zinc-950/90 backdrop-blur-2xl text-zinc-100 border border-white/10 shadow-2xl hover:border-emerald-500/50 hover:text-emerald-400 transition-all duration-200"
            title="Wróć na górę"
            aria-label="Wróć na górę"
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        )}

        {/* View Toggle (Mapa ↔ Lista) Floating Hub - Design 3.0 */}
        <motion.div
          key="quick-view-toggle"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-950/90 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/80 ring-1 ring-white/5"
        >
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => onTabChange(activeTab === 'map' ? 'list' : 'map')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md',
              activeTab === 'map'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/25 border border-blue-400/30'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/25 border border-emerald-400/30'
            )}
          >
            {activeTab === 'map' ? (
              <>
                <List className="w-3.5 h-3.5" /> <span>Widok Listy</span>
              </>
            ) : (
              <>
                <Map className="w-3.5 h-3.5" /> <span>Widok Mapy 3D</span>
              </>
            )}
          </motion.button>

          {/* Quick Command Palette Button */}
          {onOpenCommandPalette && (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={onOpenCommandPalette}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-100 border border-white/5 hover:border-white/15 transition-all"
              title="Paleta Komend (Ctrl+K)"
            >
              <Command className="w-3.5 h-3.5" />
            </motion.button>
          )}

          {/* Refresh Button */}
          {onRefresh && (
            <motion.button
              whileHover={{ scale: 1.08, rotate: 180 }}
              transition={{ duration: 0.3 }}
              whileTap={{ scale: 0.92 }}
              onClick={onRefresh}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-100 border border-white/5 hover:border-white/15 transition-all"
              title="Odśwież oferty na żywo"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
