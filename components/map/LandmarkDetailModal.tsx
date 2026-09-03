'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Compass,
  Building2,
  HardHat,
  Calendar,
  Sparkles,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import type { SzczecinLandmark3D } from '@/lib/geo/szczecinLandmarks3D';
import { triggerHaptic } from '@/lib/utils';

interface LandmarkDetailModalProps {
  landmark: SzczecinLandmark3D | null;
  onClose: () => void;
  onStartDroneOrbit: (landmark: SzczecinLandmark3D) => void;
  isDroneOrbiting: boolean;
  onFilterNearbyJobs?: (landmark: SzczecinLandmark3D) => void;
}

export const LandmarkDetailModal: React.FC<LandmarkDetailModalProps> = ({
  landmark,
  onClose,
  onStartDroneOrbit,
  isDroneOrbiting,
  onFilterNearbyJobs,
}) => {
  if (!landmark) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Banner with Custom Accent Glow */}
          <div
            className="p-5 border-b border-slate-800 relative"
            style={{
              background: `linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.85) 100%)`,
            }}
          >
            {/* Top Accent Line */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ background: landmark.lightColor }}
            />

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg border border-white/10"
                  style={{
                    background: landmark.glowColor,
                    boxShadow: `0 0 20px ${landmark.glowColor}`,
                  }}
                >
                  {landmark.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {landmark.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1 leading-snug">
                    {landmark.name}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  onClose();
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                aria-label="Zamknij"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Metrics Row */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center gap-3">
                <Building2 className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                    Wysokość
                  </span>
                  <span className="text-sm font-bold text-slate-100">
                    {landmark.heightMeters} metrów
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center gap-3">
                <Calendar className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                    Rok powstania
                  </span>
                  <span className="text-sm font-bold text-slate-100">
                    {landmark.yearBuilt}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="text-sm text-slate-300 leading-relaxed">
              {landmark.description}
            </div>

            {/* Architectural Highlight */}
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Sparkles className="w-4 h-4" />
                <span>Wyróżnik architektoniczny:</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {landmark.architecturalHighlight}
              </p>
            </div>

            {/* Construction & Investment Context */}
            <div className="p-3.5 bg-emerald-950/30 rounded-xl border border-emerald-800/40 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <HardHat className="w-4 h-4" />
                <span>Kontekst budowlany & rynek pracy:</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {landmark.constructionContext}
              </p>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-wrap gap-2.5 items-center justify-between">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(12);
                onStartDroneOrbit(landmark);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                isDroneOrbiting
                  ? 'bg-rose-600 text-white shadow-lg ring-2 ring-rose-400/50'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
              }`}
            >
              <Compass className={`w-4 h-4 ${isDroneOrbiting ? 'animate-spin' : ''}`} />
              <span>{isDroneOrbiting ? 'Zatrzymaj przelot drona' : '🛸 Kinowy przelot drona 360°'}</span>
            </button>

            {onFilterNearbyJobs && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  onFilterNearbyJobs(landmark);
                  onClose();
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors border border-slate-700"
              >
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Oferty w okolicy</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
