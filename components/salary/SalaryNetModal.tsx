'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, X, DollarSign, CheckCircle2 } from 'lucide-react';
import { calculateNetSalary } from '@/lib/salary/calculator';
import { GSAPNumberCounter } from '@/components/ui/GSAPNumberCounter';

export interface SalaryNetModalProps {
  initialGross?: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SalaryNetModal({ initialGross, isOpen, onClose }: SalaryNetModalProps) {
  const [grossInput, setGrossInput] = useState<number>(initialGross || 6000);

  const breakdown = calculateNetSalary(grossInput);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden text-card-foreground p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Kalkulator Wynagrodzenia</h3>
                <p className="text-[11px] text-muted-foreground">Przelicznik Brutto ➔ Netto (Na rękę)</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Stawka Brutto (PLN/mies.):</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="number"
                step="100"
                value={grossInput}
                onChange={(e) => setGrossInput(Math.max(0, Number(e.target.value)))}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Umowa o Pracę (UoP)
                </div>
                <div className="text-[10px] text-muted-foreground">Po opłaceniu ZUS i PIT</div>
              </div>
              <GSAPNumberCounter
                value={breakdown.uopNet}
                suffix=" zł"
                className="text-base font-black text-emerald-600 dark:text-emerald-400"
              />
            </div>

            <div className="p-3 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-foreground">Umowa Zlecenie (UZ)</div>
                <div className="text-[10px] text-muted-foreground">Standardowa umowa zlecenie</div>
              </div>
              <GSAPNumberCounter
                value={breakdown.uzNet}
                suffix=" zł"
                className="text-sm font-extrabold text-foreground"
              />
            </div>

            <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-foreground">UZ Student (do 26 lat)</div>
                <div className="text-[10px] text-muted-foreground">Brak ZUS i PIT (100% kwoty)</div>
              </div>
              <GSAPNumberCounter
                value={breakdown.uzStudentNet}
                suffix=" zł"
                className="text-sm font-extrabold text-blue-600 dark:text-blue-400"
              />
            </div>

            <div className="p-3 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-foreground">B2B Ryczałt 8.5%</div>
                <div className="text-[10px] text-muted-foreground">Standard B2B + ubezpieczenia</div>
              </div>
              <GSAPNumberCounter
                value={breakdown.b2bNet}
                prefix="~"
                suffix=" zł"
                className="text-sm font-extrabold text-foreground"
              />
            </div>

            <div className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-foreground">B2B Ryczałt 12% (IT)</div>
                <div className="text-[10px] text-muted-foreground">Programowanie / Usługi IT</div>
              </div>
              <GSAPNumberCounter
                value={breakdown.b2bRyczalt12Net}
                prefix="~"
                suffix=" zł"
                className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
