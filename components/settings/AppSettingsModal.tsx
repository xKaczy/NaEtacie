'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  X,
  Moon,
  Sun,
  Monitor,
  Volume2,
  VolumeX,
  Bell,
  MapPin,
  Flame,
  HardDrive,
  Download,
  Trash2,
  CheckCircle2,
  Sparkles,
  Car,
  Bike,
  Bus,
  Footprints,
  ShieldAlert,
} from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import { cn, triggerHaptic, exportApplicationsToCSV } from '@/lib/utils';
import { useToast } from '@/components/feedback/ToastProvider';

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppSettingsModal({ isOpen, onClose }: AppSettingsModalProps) {
  const { mode, setMode, ruggedMode, setRuggedMode, batterySaverMode, setBatterySaverMode } = useTheme();
  const { show } = useToast();

  // Settings State
  const [searchRadius, setSearchRadius] = useState<number>(25);
  const [minSalary, setMinSalary] = useState<number>(40);
  const [commuteMode, setCommuteMode] = useState<'car' | 'transit' | 'bike' | 'walk'>('car');
  const [pushNotifications, setPushNotifications] = useState<boolean>(true);
  const [soundEffects, setSoundEffects] = useState<boolean>(true);
  const [animations3D, setAnimations3D] = useState<boolean>(true);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const radius = localStorage.getItem('naetacie_pref_radius');
      if (radius) setSearchRadius(Number(radius));

      const salary = localStorage.getItem('naetacie_pref_salary');
      if (salary) setMinSalary(Number(salary));

      const commute = localStorage.getItem('naetacie_pref_commute');
      if (commute) setCommuteMode(commute as any);

      const push = localStorage.getItem('naetacie_pref_push');
      if (push !== null) setPushNotifications(push === 'true');

      const sound = localStorage.getItem('naetacie_pref_sound');
      if (sound !== null) setSoundEffects(sound === 'true');

      const anim = localStorage.getItem('naetacie_pref_anim3d');
      if (anim !== null) setAnimations3D(anim === 'true');
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
  }, []);

  const saveSetting = (key: string, value: any) => {
    try {
      localStorage.setItem(key, String(value));
      triggerHaptic();
    } catch (e) {
      console.warn('Failed to save setting:', e);
    }
  };

  const handleClearCache = () => {
    setIsClearing(true);
    setTimeout(() => {
      try {
        localStorage.removeItem('naetacie_geo_cache');
        localStorage.removeItem('naetacie_recent_searches');
        show('success', 'Pamięć podręczna aplikacji została wyczyszczona!');
      } catch (e) {
        show('error', 'Wystąpił błąd podczas czyszczenia pamięci.');
      } finally {
        setIsClearing(false);
      }
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="bg-card border border-border/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-card/60 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground leading-none">Ustawienia Aplikacji</h2>
                <p className="text-xs text-muted-foreground mt-1">Dostosuj działanie serwisu NaEtacie</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Settings Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 no-scrollbar">
            {/* Section 1: Visual Theme & FX */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Motyw i Efekty Wizualne
              </h3>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'light', label: 'Jasny', icon: Sun },
                  { id: 'dark', label: 'Ciemny', icon: Moon },
                  { id: 'oled', label: 'OLED Black', icon: Moon },
                  { id: 'system', label: 'Auto (System)', icon: Monitor },
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = mode === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setMode(t.id as any)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
                        isActive
                          ? 'bg-primary/10 border-primary text-primary shadow-sm font-bold'
                          : 'bg-accent/40 border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sound Effects Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-accent/20">
                <div className="flex items-center gap-2.5">
                  {soundEffects ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
                  <div>
                    <span className="text-xs font-semibold text-foreground">Efekty dźwiękowe (Audio Chimes)</span>
                    <p className="text-[11px] text-muted-foreground">Sygnał przy dodawaniu do ulubionych</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={soundEffects}
                  onChange={(e) => {
                    setSoundEffects(e.target.checked);
                    saveSetting('naetacie_pref_sound', e.target.checked);
                  }}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>

              {/* Rugged Construction Mode Toggle (Glove-Friendly Touch Targets) */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-accent/20">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🧤</span>
                  <div>
                    <span className="text-xs font-semibold text-foreground">Tryb Budowlany (Powiększone Przyciski)</span>
                    <p className="text-[11px] text-muted-foreground">Wygodna obsługa ekranu w rękawicach roboczych (min 48px)</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={ruggedMode}
                  onChange={(e) => setRuggedMode(e.target.checked)}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>

              {/* Battery-Saver Mode Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-accent/20">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🔋</span>
                  <div>
                    <span className="text-xs font-semibold text-foreground">Oszczędzanie Baterii na Budowie</span>
                    <p className="text-[11px] text-muted-foreground">Wyłącza rozmycia i animacje, przedłuża czas pracy telefonu</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={batterySaverMode}
                  onChange={(e) => setBatterySaverMode(e.target.checked)}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>
            </div>

            {/* Section 2: Job Search Defaults & Commute */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Wyszukiwanie & Lokalne Preferencje
              </h3>

              {/* Search Radius Slider */}
              <div className="p-3 rounded-xl border border-border/60 bg-accent/20 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-foreground">Promień szukania ofert</span>
                  <span className="font-bold text-primary">{searchRadius} km wokół Szczecina</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={searchRadius}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSearchRadius(val);
                    saveSetting('naetacie_pref_radius', val);
                  }}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              {/* Min Salary Alert Slider */}
              <div className="p-3 rounded-xl border border-border/60 bg-accent/20 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500" /> Stawka minimalna w filtrze
                  </span>
                  <span className="font-bold text-amber-500">{minSalary} zł/h</span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="100"
                  step="5"
                  value={minSalary}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setMinSalary(val);
                    saveSetting('naetacie_pref_salary', val);
                  }}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Commute Mode Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Domyślny środek transportu na budowę</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'car', label: 'Auto', icon: Car },
                    { id: 'transit', label: 'ZTM', icon: Bus },
                    { id: 'bike', label: 'Rower', icon: Bike },
                    { id: 'walk', label: 'Pieszo', icon: Footprints },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isActive = commuteMode === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          setCommuteMode(m.id as any);
                          saveSetting('naetacie_pref_commute', m.id);
                        }}
                        className={cn(
                          'flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all',
                          isActive
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-accent/40 border-border/60 text-muted-foreground hover:bg-accent'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section 3: Data & Cache Management */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5" /> Pamięć Podręczna & Dane
              </h3>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCache}
                  disabled={isClearing}
                  className="flex-1 gap-1.5 text-xs border-red-500/30 text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isClearing ? 'Czyszczenie...' : 'Wyczyszcz cache geodanych'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportApplicationsToCSV([], () => 'Złożona')}
                  className="flex-1 gap-1.5 text-xs"
                >
                  <Download className="w-3.5 h-3.5 text-primary" /> Eksportuj dane (CSV)
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border/60 bg-accent/20 flex justify-end">
            <Button onClick={onClose} size="sm" className="px-6 font-semibold">
              Gotowe
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
