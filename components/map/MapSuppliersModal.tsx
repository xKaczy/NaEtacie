'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Navigation, Phone, Clock, MapPin, X, ChevronRight, Wrench, Zap, ShoppingBag } from 'lucide-react';
import { SZCZECIN_CONSTRUCTION_SUPPLIERS, type ConstructionSupplier } from '@/lib/geo/szczecinSuppliers';
import { triggerHaptic } from '@/lib/utils';

export interface MapSuppliersModalProps {
  isVisible: boolean;
  onClose: () => void;
  onFlyToSupplier?: (supplier: ConstructionSupplier) => void;
}

export function MapSuppliersModal({ isVisible, onClose, onFlyToSupplier }: MapSuppliersModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredSuppliers = selectedCategory === 'all'
    ? SZCZECIN_CONSTRUCTION_SUPPLIERS
    : SZCZECIN_CONSTRUCTION_SUPPLIERS.filter((s) => s.category === selectedCategory);

  const getCategoryBadge = (cat: ConstructionSupplier['category']) => {
    switch (cat) {
      case 'market_diy':
        return { label: 'Market Budowlany', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: ShoppingBag };
      case 'hurtownia_instalacyjna':
        return { label: 'Instalacje / Wod-Kan', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Wrench };
      case 'hurtownia_elektryczna':
        return { label: 'Elektryka / SEP', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Zap };
      case 'sklad_ogolnobudowlany':
        return { label: 'Skład Budowlany', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Store };
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:w-[420px] max-h-[75vh] bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800/80 rounded-3xl shadow-2xl z-30 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">Zaopatrzenie Budowlane Szczecin</h3>
                <p className="text-[11px] text-zinc-400">Markety budowlane i hurtownie branżowe</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                onClose();
              }}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="px-4 py-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-zinc-800/40 bg-zinc-900/30">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(8);
                setSelectedCategory('all');
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Wszystkie ({SZCZECIN_CONSTRUCTION_SUPPLIERS.length})
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(8);
                setSelectedCategory('market_diy');
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                selectedCategory === 'market_diy'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                  : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Markety DIY
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(8);
                setSelectedCategory('hurtownia_instalacyjna');
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                selectedCategory === 'hurtownia_instalacyjna'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Instalacje
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(8);
                setSelectedCategory('hurtownia_elektryczna');
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                selectedCategory === 'hurtownia_elektryczna'
                  ? 'bg-amber-400 text-zinc-950 shadow-sm'
                  : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Elektryka
            </button>
          </div>

          {/* Supplier List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 no-scrollbar">
            {filteredSuppliers.map((s) => {
              const badge = getCategoryBadge(s.category);
              const BadgeIcon = badge.icon;

              return (
                <div
                  key={s.id}
                  className="p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800/60 hover:border-amber-500/40 transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.color}`}>
                          <BadgeIcon className="w-3 h-3" />
                          {badge.label}
                        </span>
                        <span className="text-[10px] font-semibold text-zinc-400">{s.district}</span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">{s.name}</h4>
                      <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                        {s.address}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(12);
                        onFlyToSupplier?.(s);
                      }}
                      className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-zinc-950 border border-amber-500/30 transition-all cursor-pointer shrink-0"
                      title="Pokaż na mapie"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/40">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      {s.openHours}
                    </span>
                  </div>

                  {/* Quick Action buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors border border-zinc-700/60"
                    >
                      <Navigation className="w-3.5 h-3.5 text-blue-400" />
                      Nawiguj
                    </a>
                    {s.phone && (
                      <a
                        href={`tel:${s.phone.replace(/\s+/g, '')}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 text-xs font-bold transition-colors border border-emerald-500/30"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        Zadzwoń
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
