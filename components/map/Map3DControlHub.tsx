'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Hammer,
  Clock,
  BarChart3,
  Compass,
  X,
  Layers,
  Sparkles,
  Sun,
  Flame,
  Moon,
  Sunset,
  ChevronRight,
  HardHat,
} from 'lucide-react';
import { SZCZECIN_COMMUTE_BASES } from '@/lib/geo/isochroneCalculator';
import { SZCZECIN_MEGA_PROJECTS, MegaConstructionProject } from '@/lib/geo/szczecinMegaProjects';
import { SZCZECIN_LANDMARKS_3D, SzczecinLandmark3D } from '@/lib/geo/szczecinLandmarks3D';
import type { SunlightMode } from '@/lib/geo/sunlightEngine';
import { triggerHaptic } from '@/lib/utils';

export interface Map3DState {
  show3DBuildings: boolean;
  showConstructionSites: boolean;
  showIsochrone: boolean;
  showSalaryPillars: boolean;
  showDemandHeatmap: boolean;
  showLandmarks3D?: boolean;
  selectedLandmark?: SzczecinLandmark3D | null;
  isDroneOrbiting: boolean;
  isochroneMinutes: number;
  selectedBaseKey: string;
  selectedProject: MegaConstructionProject | null;
  sunlightMode: SunlightMode;
}

interface Map3DControlHubProps {
  state: Map3DState;
  onChange: (updater: (prev: Map3DState) => Map3DState) => void;
  onFlyToCoordinates?: (lng: number, lat: number, zoom?: number) => void;
  onOpenProjectModal?: (project: MegaConstructionProject) => void;
  onOpenLandmarkModal?: (landmark: SzczecinLandmark3D) => void;
}

export const Map3DControlHub: React.FC<Map3DControlHubProps> = ({
  state,
  onChange,
  onFlyToCoordinates,
  onOpenProjectModal,
  onOpenLandmarkModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'layers' | 'sunlight' | 'commute' | 'projects' | 'landmarks' | 'salary'>('layers');

  const toggleLayer = (key: keyof Map3DState) => {
    triggerHaptic(10);
    onChange((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectProject = (project: MegaConstructionProject) => {
    triggerHaptic(12);
    onChange((prev) => ({
      ...prev,
      selectedProject: project,
      showConstructionSites: true,
    }));
    onFlyToCoordinates?.(project.coordinates[0], project.coordinates[1], 15);
    onOpenProjectModal?.(project);
  };

  const handleSelectLandmark = (landmark: SzczecinLandmark3D) => {
    triggerHaptic(12);
    onChange((prev) => ({
      ...prev,
      selectedLandmark: landmark,
      showLandmarks3D: true,
    }));
    onFlyToCoordinates?.(landmark.coordinates[0], landmark.coordinates[1], 16);
    onOpenLandmarkModal?.(landmark);
  };

  const setSunlight = (mode: SunlightMode) => {
    triggerHaptic(10);
    onChange((prev) => ({
      ...prev,
      sunlightMode: mode,
    }));
  };

  return (
    <>
      {/* Floating 3D HUD Trigger Button */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
        {state.isDroneOrbiting && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-xl shadow-xl text-xs font-bold animate-pulse">
            <Compass className="w-3.5 h-3.5 animate-spin" />
            <span>Tryb Drona 360°</span>
            <button
              onClick={() => onChange((p) => ({ ...p, isDroneOrbiting: false }))}
              className="p-0.5 hover:bg-rose-700 rounded cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            setIsOpen(!isOpen);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold shadow-2xl backdrop-blur-xl transition-all cursor-pointer ${
            isOpen
              ? 'bg-primary text-primary-foreground border-primary shadow-primary/30'
              : 'bg-card/90 hover:bg-card text-foreground border-border/80'
          }`}
        >
          <Layers className="w-4 h-4 text-primary" />
          <span>Centrum 3D</span>
          <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.2 rounded-full font-mono">
            Szczecin
          </span>
        </button>
      </div>

      {/* 3D Control Center Glass Modal / Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-35 bg-black/20 backdrop-blur-2xs sm:hidden"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="fixed sm:absolute top-16 sm:top-14 inset-x-3 sm:inset-x-auto sm:right-3 z-40 w-auto sm:w-[380px] max-h-[82vh] bg-card/95 backdrop-blur-2xl border border-border/80 rounded-2xl shadow-2xl text-card-foreground overflow-hidden flex flex-col"
            >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-border/60 bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs leading-none">Nawigator Przestrzenny 3D</h3>
                  <span className="text-[10px] text-muted-foreground">Silnik GPU WebGL • Szczecin 2026</span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                aria-label="Zamknij"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="grid grid-cols-6 text-[10px] font-bold border-b border-border/60 text-center bg-muted/20">
              <button
                onClick={() => setActiveTab('layers')}
                className={`py-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'layers'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Warstwy
              </button>
              <button
                onClick={() => setActiveTab('sunlight')}
                className={`py-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'sunlight'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Światło
              </button>
              <button
                onClick={() => setActiveTab('landmarks')}
                className={`py-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'landmarks'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Ikony 3D
              </button>
              <button
                onClick={() => setActiveTab('commute')}
                className={`py-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'commute'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Dojazd
              </button>
              <button
                onClick={() => setActiveTab('projects')}
                className={`py-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'projects'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Budowy
              </button>
              <button
                onClick={() => setActiveTab('salary')}
                className={`py-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'salary'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Stawki
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-3.5 space-y-3 max-h-[60vh] overflow-y-auto">
              {/* TAB 1: WARSTWY GŁÓWNE */}
              {activeTab === 'layers' && (
                <div className="space-y-2 text-xs">
                  <label className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/60 hover:bg-muted/70 cursor-pointer transition-colors">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <div>
                        <span className="font-semibold text-foreground block">Landmarki 3D Szczecina</span>
                        <span className="text-[10px] text-muted-foreground">Dźwigozaury, Hanza, Pazim, Zamek, Stadion</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={state.showLandmarks3D !== false}
                      onChange={() => toggleLayer('showLandmarks3D')}
                      className="rounded accent-primary cursor-pointer w-4 h-4"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/60 hover:bg-muted/70 cursor-pointer transition-colors">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-500" />
                      <div>
                        <span className="font-semibold text-foreground block">Bryły Budynków 3D</span>
                        <span className="text-[10px] text-muted-foreground">Wektory wysokościowe i cienie</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={state.show3DBuildings}
                      onChange={() => toggleLayer('show3DBuildings')}
                      className="rounded accent-primary cursor-pointer w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/60 hover:bg-muted/70 cursor-pointer transition-colors">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-rose-500" />
                      <div>
                        <span className="font-semibold text-foreground block">Heatmapa Zleceń & Popytu</span>
                        <span className="text-[10px] text-muted-foreground">Gęstość pilnych zleceń w dzielnicach</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={state.showDemandHeatmap}
                      onChange={() => toggleLayer('showDemandHeatmap')}
                      className="rounded accent-primary cursor-pointer w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/60 hover:bg-muted/70 cursor-pointer transition-colors">
                    <div className="flex items-center gap-2">
                      <Hammer className="w-4 h-4 text-amber-500" />
                      <div>
                        <span className="font-semibold text-foreground block">Żurawie & Wielkie Budowy</span>
                        <span className="text-[10px] text-muted-foreground">Inwestycje deweloperskie i port</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={state.showConstructionSites}
                      onChange={() => toggleLayer('showConstructionSites')}
                      className="rounded accent-primary cursor-pointer w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/60 hover:bg-muted/70 cursor-pointer transition-colors">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-emerald-500" />
                      <div>
                        <span className="font-semibold text-foreground block">Słupy Stawek (3D Hexbins)</span>
                        <span className="text-[10px] text-muted-foreground">Przestrzenna mapa zarobków</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={state.showSalaryPillars}
                      onChange={() => toggleLayer('showSalaryPillars')}
                      className="rounded accent-primary cursor-pointer w-4 h-4"
                    />
                  </label>

                  {/* Drone Orbit Trigger */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => toggleLayer('isDroneOrbiting')}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold transition-all cursor-pointer shadow-xs ${
                        state.isDroneOrbiting
                          ? 'bg-rose-600 hover:bg-rose-500 text-white'
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      }`}
                    >
                      <Compass className={`w-4 h-4 ${state.isDroneOrbiting ? 'animate-spin' : ''}`} />
                      <span>{state.isDroneOrbiting ? 'Zatrzymaj przelot 360°' : 'Uruchom Orbiter Drona 360°'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: SUNLIGHT & NIGHT SHADING */}
              {activeTab === 'sunlight' && (
                <div className="space-y-2 text-xs">
                  <span className="font-bold text-foreground block mb-1">Pora dnia & Oświetlenie 3D:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSunlight('morning')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        state.sunlightMode === 'morning'
                          ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                          : 'border-border hover:bg-muted/60 text-muted-foreground'
                      }`}
                    >
                      <Sun className="w-4 h-4 text-amber-400" />
                      <div>
                        <span className="block font-bold">Poranek (06:30)</span>
                        <span className="text-[10px] text-muted-foreground">Złote niskie cienie</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSunlight('day')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        state.sunlightMode === 'day'
                          ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                          : 'border-border hover:bg-muted/60 text-muted-foreground'
                      }`}
                    >
                      <Sun className="w-4 h-4 text-yellow-500" />
                      <div>
                        <span className="block font-bold">Dzień</span>
                        <span className="text-[10px] text-muted-foreground">Naturalne słońce</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSunlight('golden_hour')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        state.sunlightMode === 'golden_hour'
                          ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                          : 'border-border hover:bg-muted/60 text-muted-foreground'
                      }`}
                    >
                      <Sunset className="w-4 h-4 text-amber-500" />
                      <div>
                        <span className="block font-bold">Złota Godzina</span>
                        <span className="text-[10px] text-muted-foreground">Ciepłe cienie</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSunlight('sunset')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        state.sunlightMode === 'sunset'
                          ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                          : 'border-border hover:bg-muted/60 text-muted-foreground'
                      }`}
                    >
                      <Sunset className="w-4 h-4 text-rose-500" />
                      <div>
                        <span className="block font-bold">Zachód Słońca</span>
                        <span className="text-[10px] text-muted-foreground">Różowe niebo</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSunlight('night_cyberpunk')}
                      className={`col-span-2 p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        state.sunlightMode === 'night_cyberpunk'
                          ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                          : 'border-border hover:bg-muted/60 text-muted-foreground'
                      }`}
                    >
                      <Moon className="w-4 h-4 text-cyan-400" />
                      <div>
                        <span className="block font-bold">Nocny Port & Neon 3D</span>
                        <span className="text-[10px] text-muted-foreground">Iluminacja Floating Garden i wież</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: SZCZECIN LANDMARKS 3D */}
              {activeTab === 'landmarks' && (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">
                    Ikoniczne obiekty architektoniczne i przemysłowe Szczecina w 3D:
                  </p>
                  <div className="space-y-1.5 max-h-[46vh] overflow-y-auto pr-1">
                    {SZCZECIN_LANDMARKS_3D.map((lm) => (
                      <button
                        key={lm.id}
                        type="button"
                        onClick={() => handleSelectLandmark(lm)}
                        className="w-full p-2.5 rounded-xl bg-muted/40 hover:bg-muted border border-border/60 text-left transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm shrink-0">{lm.icon}</span>
                            <span className="font-bold text-xs text-foreground truncate block">
                              {lm.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block truncate">
                            📍 {lm.badge} • 📏 {lm.heightMeters} m
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: COMMUTE ISOCHRONE */}
              {activeTab === 'commute' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">
                      Wybierz bazę wypadową / dom:
                    </label>
                    <select
                      value={state.selectedBaseKey}
                      onChange={(e) =>
                        onChange((p) => ({
                          ...p,
                          selectedBaseKey: e.target.value,
                          showIsochrone: true,
                        }))
                      }
                      className="w-full p-2 bg-background border border-border rounded-lg text-foreground font-medium text-xs focus:ring-1 focus:ring-primary focus:outline-hidden cursor-pointer"
                    >
                      {Object.entries(SZCZECIN_COMMUTE_BASES).map(([key, base]) => (
                        <option key={key} value={key}>
                          {base.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary" /> Maksymalny czas dojazdu:
                      </span>
                      <span className="font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-md text-xs">
                        {state.isochroneMinutes} min
                      </span>
                    </div>

                    <input
                      type="range"
                      min="10"
                      max="45"
                      step="5"
                      value={state.isochroneMinutes}
                      onChange={(e) =>
                        onChange((p) => ({
                          ...p,
                          isochroneMinutes: Number(e.target.value),
                          showIsochrone: true,
                        }))
                      }
                      className="w-full accent-primary cursor-pointer"
                    />

                    <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                      <span>10 min (osiedle)</span>
                      <span>20 min (miasto)</span>
                      <span>45 min (region)</span>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={state.showIsochrone}
                      onChange={() => toggleLayer('showIsochrone')}
                      className="rounded accent-primary cursor-pointer w-4 h-4"
                    />
                    <span className="font-semibold text-foreground">Włącz nakładkę izochrony czasu</span>
                  </label>
                </div>
              )}

              {/* TAB 4: MEGA PROJECTS */}
              {activeTab === 'projects' && (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">
                    Inwestycje strategiczne i zapotrzebowanie na podwykonawców w Szczecinie:
                  </p>
                  <div className="space-y-1.5">
                    {SZCZECIN_MEGA_PROJECTS.map((proj) => (
                      <button
                        key={proj.id}
                        type="button"
                        onClick={() => handleSelectProject(proj)}
                        className="w-full p-2.5 rounded-xl bg-muted/40 hover:bg-muted border border-border/60 text-left transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <HardHat className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="font-bold text-xs text-foreground truncate block">
                              {proj.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block truncate">
                            📍 {proj.district} • 🏗️ {proj.towerCranesCount} żurawie • {proj.estimatedValuePLN}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: SALARY PILLARS */}
              {activeTab === 'salary' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-xl space-y-1.5">
                    <span className="font-bold text-foreground block">Przestrzenne Słupy Płacowe 3D</span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Wysokość kolumny reprezentuje średnią stawkę miesięczną netto w danej dzielnicy Szczecina na podstawie zebranych ogłoszeń.
                    </p>
                  </div>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/60 hover:bg-muted/70 cursor-pointer transition-colors">
                    <span className="font-semibold text-foreground">Pokaż kolumny stawek (Hexbins)</span>
                    <input
                      type="checkbox"
                      checked={state.showSalaryPillars}
                      onChange={() => toggleLayer('showSalaryPillars')}
                      className="rounded accent-primary cursor-pointer w-4 h-4"
                    />
                  </label>
                </div>
              )}
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
