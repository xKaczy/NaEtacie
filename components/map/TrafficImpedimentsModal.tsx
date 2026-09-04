'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  X,
  Truck,
  Clock,
  Navigation,
  MapPin,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import {
  SZCZECIN_TRAFFIC_IMPEDIMENTS,
  SEVERITY_CONFIG,
  TrafficImpediment,
} from '@/lib/geo/szczecinTrafficImpediments';

interface TrafficImpedimentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightedImpedimentId?: string;
}

export const TrafficImpedimentsModal: React.FC<TrafficImpedimentsModalProps> = ({
  isOpen,
  onClose,
  highlightedImpedimentId,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'critical' | 'van_warning'>('all');

  const filtered = SZCZECIN_TRAFFIC_IMPEDIMENTS.filter((item) => {
    if (selectedFilter === 'critical') return item.severity === 'critical_closure';
    if (selectedFilter === 'van_warning') return !item.vanAccessible || item.maxWeightTons !== undefined;
    return true;
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-amber-500/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm sm:text-base flex items-center gap-1.5">
                  Utrudnienia Drogowe & Dojazd Busem
                  <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
                    Szczecin 2026
                  </span>
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Zatory, remonty torowisk i ograniczenia tonażowe dla ekip budowlanych
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Filters */}
          <div className="p-3 border-b border-border bg-muted/20 flex gap-1.5 text-xs">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                selectedFilter === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-background border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              Wszystkie ({SZCZECIN_TRAFFIC_IMPEDIMENTS.length})
            </button>
            <button
              onClick={() => setSelectedFilter('critical')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                selectedFilter === 'critical'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-background border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              ⛔ Zamknięcia & Objazdy
            </button>
            <button
              onClick={() => setSelectedFilter('van_warning')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                selectedFilter === 'van_warning'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-background border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              🚐 Ograniczenia dla Busa
            </button>
          </div>

          {/* List of Roadworks */}
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            {filtered.map((item) => {
              const config = SEVERITY_CONFIG[item.severity];
              const isTargeted = highlightedImpedimentId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                    isTargeted
                      ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30'
                      : 'border-border bg-card shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                          style={{
                            backgroundColor: `${config.color}15`,
                            color: config.color,
                            border: `1px solid ${config.color}30`,
                          }}
                        >
                          {config.icon} {config.label}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                          📍 {item.district}
                        </span>
                      </div>
                      <h4 className="font-bold text-foreground text-xs sm:text-sm mt-1">
                        {item.streetName}
                      </h4>
                    </div>

                    <span className="text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> +{item.delayMinutes} min
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>

                  {/* Recommended Alternative route */}
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/70 text-[11px] space-y-1">
                    <span className="font-bold text-foreground flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-primary" /> Zalecana trasa alternatywna:
                    </span>
                    <p className="text-muted-foreground">
                      {item.recommendedAlternative}
                    </p>
                  </div>

                  {/* Van & Weight constraints */}
                  <div className="flex items-center justify-between text-[10.5px] pt-1 border-t border-border/50">
                    <div className="flex items-center gap-1.5">
                      <Truck className={`w-3.5 h-3.5 ${item.vanAccessible ? 'text-emerald-500' : 'text-red-500'}`} />
                      <span className={item.vanAccessible ? 'text-muted-foreground font-medium' : 'text-red-600 font-bold'}>
                        {item.vanAccessible ? 'Dojazd busem dozwolony' : 'Zakaz wjazdu aut pow. 3.5t / busów'}
                      </span>
                    </div>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.streetName + ', Szczecin')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-bold hover:underline inline-flex items-center gap-1"
                    >
                      Pokaż na mapie Google <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              Aktualizowane pod kątem logistyki ekip budowlanych
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 cursor-pointer shadow-xs"
            >
              Rozumiem
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
