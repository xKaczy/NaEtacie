'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Sparkles, X } from 'lucide-react';
import type { DisplayAnnouncement } from '@/lib/types/display';
import { Button } from '@/components/ui/button';

export interface SalaryBenchmarkingModalProps {
  ad: DisplayAnnouncement | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SalaryBenchmarkingModal({ ad, isOpen, onClose }: SalaryBenchmarkingModalProps) {
  if (!isOpen || !ad) return null;

  const currentPrice = typeof ad.price === 'number' ? ad.price : 6800;

  // Category benchmark averages
  const benchmarks: Record<string, { szczecinAvg: number; regionAvg: number; label: string }> = {
    budowa: { szczecinAvg: 7200, regionAvg: 6500, label: 'Prace Ogólnobudowlane i Stan Surowy' },
    instalacje: { szczecinAvg: 8100, regionAvg: 7400, label: 'Instalacje Elektryczne, CO i Wod-Kan' },
    wykończenia: { szczecinAvg: 6900, regionAvg: 6200, label: 'Prace Wykończeniowe i Remonty' },
  };

  const catData = benchmarks[ad.category] || benchmarks['budowa'];
  const maxVal = Math.max(currentPrice, catData.szczecinAvg, catData.regionAvg) * 1.15;

  const getPercent = (val: number) => Math.min(100, Math.round((val / maxVal) * 100));

  const diffVsSzczecin = Math.round(((currentPrice - catData.szczecinAvg) / catData.szczecinAvg) * 100);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden text-card-foreground p-5 space-y-4 my-8 relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black">Porównywarka Stawek Rynkowych (Salary Benchmark)</h3>
                <p className="text-[11px] text-muted-foreground">
                  Branża: {catData.label}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current offer summary */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Stawka w tej ofercie</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                {currentPrice.toLocaleString('pl-PL')} zł/mies.
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Różnica do średniej rynkowej Szczecina:{' '}
              <strong className={diffVsSzczecin >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-amber-500 font-bold'}>
                {diffVsSzczecin >= 0 ? `+${diffVsSzczecin}% wyżej` : `${diffVsSzczecin}% poniżej`}
              </strong>
            </p>
          </div>

          {/* Bar Charts */}
          <div className="space-y-3.5 pt-2">
            {/* Offer bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-foreground">Ta oferta</span>
                <span className="text-primary">{currentPrice.toLocaleString('pl-PL')} zł</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${getPercent(currentPrice)}%` }}
                  transition={{ duration: 0.6 }}
                  className="h-full bg-primary rounded-full"
                />
              </div>
            </div>

            {/* Szczecin Average Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-muted-foreground">Średnia Szczecin</span>
                <span className="text-muted-foreground">{catData.szczecinAvg.toLocaleString('pl-PL')} zł</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${getPercent(catData.szczecinAvg)}%` }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="h-full bg-blue-500/70 rounded-full"
                />
              </div>
            </div>

            {/* Region Average Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-muted-foreground">Średnia Zachodniopomorskie</span>
                <span className="text-muted-foreground">{catData.regionAvg.toLocaleString('pl-PL')} zł</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${getPercent(catData.regionAvg)}%` }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="h-full bg-slate-400/60 rounded-full"
                />
              </div>
            </div>
          </div>

          {/* AI Market Insight */}
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Sparkles className="w-4 h-4 text-primary" /> Analiza rynkowa AI dla Szczecina:
            </div>
            <p className="text-[11px] leading-relaxed">
              Zapotrzebowanie na fachowców w kategorii <strong>{catData.label}</strong> w Szczecinie jest bardzo wysokie. Oferta jest konkurencyjna finansowo.
            </p>
          </div>

          <Button
            onClick={onClose}
            className="w-full text-xs font-bold h-10 bg-primary text-primary-foreground shadow-md cursor-pointer"
          >
            Zamknij analizę
          </Button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
