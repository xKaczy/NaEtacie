'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Radar, MapPin, X, LocateFixed, Sliders, Check } from 'lucide-react';
import { triggerHaptic } from '@/lib/utils';

export interface MapHomeRadarModalProps {
  isVisible: boolean;
  onClose: () => void;
  homeBaseCoords: [number, number] | null; // [lng, lat]
  radarRadiusKm: number;
  isRadarActive: boolean;
  onSetRadarActive: (active: boolean) => void;
  onUpdateRadiusKm: (km: number) => void;
  onPickHomeOnMap: () => void;
  onUseCurrentGps: () => void;
  matchingOffersCount?: number;
}

const PRESET_RADII = [5, 10, 15, 20, 25];

export function MapHomeRadarModal({
  isVisible,
  onClose,
  homeBaseCoords,
  radarRadiusKm,
  isRadarActive,
  onSetRadarActive,
  onUpdateRadiusKm,
  onPickHomeOnMap,
  onUseCurrentGps,
  matchingOffersCount = 0,
}: MapHomeRadarModalProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:w-[380px] bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800/80 rounded-3xl shadow-2xl z-30 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">Baza Sprzętowa & Radar Dojazdu</h3>
                <p className="text-[11px] text-zinc-400">Filtruj zlecenia w promieniu od Twojego domu</p>
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

          <div className="p-4 space-y-4">
            {/* Toggle Switch */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl border ${isRadarActive ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                  <Radar className={`w-4 h-4 ${isRadarActive ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Filtr Radaru Zleceń</div>
                  <div className="text-[11px] text-zinc-400">
                    {isRadarActive ? `Aktywny: max ${radarRadiusKm} km od bazy` : 'Wyłączony (pokazuje całe miasto)'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  onSetRadarActive(!isRadarActive);
                }}
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                  isRadarActive ? 'bg-teal-500' : 'bg-zinc-800 border border-zinc-700'
                }`}
              >
                <motion.div
                  className="w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5"
                  animate={{ left: isRadarActive ? '26px' : '2px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            {/* Home Location Setup */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                Lokalizacja Twojego Domu / Warsztatu:
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(12);
                    onUseCurrentGps();
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-bold border border-zinc-700 transition-colors"
                >
                  <LocateFixed className="w-3.5 h-3.5 text-blue-400" />
                  Użyj GPS
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(12);
                    onPickHomeOnMap();
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-bold border border-zinc-700 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  Wskaż na mapie
                </button>
              </div>

              {homeBaseCoords && (
                <div className="text-[11px] font-mono text-teal-400/90 bg-teal-950/40 border border-teal-500/20 px-3 py-1.5 rounded-xl flex items-center justify-between">
                  <span>Współrzędne bazy:</span>
                  <span>{homeBaseCoords[1].toFixed(4)}° N, {homeBaseCoords[0].toFixed(4)}° E</span>
                </div>
              )}
            </div>

            {/* Radius Slider & Presets */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-teal-400" />
                  Promień dojazdu (km):
                </label>
                <span className="text-sm font-black text-teal-400 font-mono bg-teal-950/80 px-2.5 py-0.5 rounded-lg border border-teal-500/40">
                  {radarRadiusKm} km
                </span>
              </div>

              <input
                type="range"
                min="3"
                max="30"
                step="1"
                value={radarRadiusKm}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onUpdateRadiusKm(val);
                }}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />

              {/* Preset Chips */}
              <div className="flex items-center justify-between gap-1.5 pt-1">
                {PRESET_RADII.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      triggerHaptic(10);
                      onUpdateRadiusKm(r);
                    }}
                    className={`flex-1 py-1 rounded-xl text-xs font-bold transition-all ${
                      radarRadiusKm === r
                        ? 'bg-teal-500 text-zinc-950 shadow-md font-black'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </div>

            {/* Results Pill */}
            {isRadarActive && (
              <div className="p-2.5 rounded-2xl bg-teal-950/50 border border-teal-500/30 flex items-center justify-between text-xs">
                <span className="text-zinc-300">W zasięgu radaru:</span>
                <span className="font-extrabold text-teal-300 font-mono flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {matchingOffersCount} zleceń
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
