'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  X,
  Copy,
  Check,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Clock,
  Hammer,
  FileSpreadsheet,
} from 'lucide-react';
import {
  SZCZECIN_TRADE_BENCHMARKS,
  inferTradeAndScope,
  calculateTradeBid,
  BidEstimationResult,
} from '@/lib/calculator/tradeBidEstimator';

interface TradeBidEstimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  phone?: string | null;
}

export const TradeBidEstimatorModal: React.FC<TradeBidEstimatorModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  phone,
}) => {
  const initialInference = useMemo(() => inferTradeAndScope(title, description), [title, description]);

  const [selectedTrade, setSelectedTrade] = useState<string>(initialInference.tradeKey);
  const [scopeQty, setScopeQty] = useState<number>(initialInference.scope.quantity);
  const [includeMaterials, setIncludeMaterials] = useState<boolean>(false);
  const [copiedType, setCopiedType] = useState<'sms' | 'wa' | null>(null);

  const estimation: BidEstimationResult = useMemo(() => {
    return calculateTradeBid(selectedTrade, scopeQty, includeMaterials);
  }, [selectedTrade, scopeQty, includeMaterials]);

  const handleCopy = (type: 'sms' | 'wa') => {
    const text = type === 'sms' ? estimation.quotationDraftSms : estimation.quotationDraftWhatsApp;
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = phone ? phone.replace(/[^\d+]/g, '') : '';
    const encoded = encodeURIComponent(estimation.quotationDraftWhatsApp);
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  const handleSendSms = () => {
    const cleanPhone = phone ? phone.replace(/[^\d+]/g, '') : '';
    const encoded = encodeURIComponent(estimation.quotationDraftSms);
    const smsUrl = cleanPhone ? `sms:${cleanPhone}?body=${encoded}` : `sms:?body=${encoded}`;
    window.open(smsUrl, '_self');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-primary/5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                  Kalkulator Robocizny & Wycena
                  <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">
                    Szczecin 2026
                  </span>
                </h3>
                <p className="text-[11px] text-muted-foreground truncate max-w-[280px]">
                  {title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 overflow-y-auto space-y-4 text-xs">
            {/* Trade selector */}
            <div>
              <label className="block text-[11px] font-semibold text-foreground mb-1.5">
                Wybierz branżę / rodzaj prac:
              </label>
              <select
                value={selectedTrade}
                onChange={(e) => setSelectedTrade(e.target.value)}
                className="w-full p-2 bg-background border border-border rounded-lg text-foreground font-medium text-xs focus:ring-2 focus:ring-primary focus:outline-hidden"
              >
                {Object.entries(SZCZECIN_TRADE_BENCHMARKS).map(([key, bm]) => (
                  <option key={key} value={key}>
                    {bm.trade} ({bm.avgRatePLN} zł/{bm.unit})
                  </option>
                ))}
              </select>
            </div>

            {/* Scope Slider & Input */}
            <div className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Hammer className="w-3.5 h-3.5 text-primary" /> Obmiar prac ({estimation.scopeUnit}):
                </span>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={scopeQty}
                  onChange={(e) => setScopeQty(Math.max(1, Number(e.target.value)))}
                  className="w-20 p-1 text-center bg-background border border-border rounded font-bold text-foreground text-sm"
                />
              </div>

              <input
                type="range"
                min="1"
                max={estimation.scopeUnit === 'kpl' ? 10 : 300}
                value={scopeQty}
                onChange={(e) => setScopeQty(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeMaterials}
                    onChange={(e) => setIncludeMaterials(e.target.checked)}
                    className="rounded accent-primary cursor-pointer"
                  />
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Uwzględnij orientacyjny koszt materiałów (+60%)
                  </span>
                </label>
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Sugerowana robocizna:
                </span>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {estimation.laborAvgPLN.toLocaleString('pl-PL')} zł
                </p>
                <span className="text-[10px] text-muted-foreground">
                  Zakres: {estimation.laborMinPLN.toLocaleString()} - {estimation.laborMaxPLN.toLocaleString()} zł
                </span>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Szacowany czas roboczy:
                </span>
                <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
                  ~{estimation.estimatedHours} godz.
                </p>
                <span className="text-[10px] text-muted-foreground">
                  ~{Math.ceil(estimation.estimatedHours / 8)} dni roboczych
                </span>
              </div>
            </div>

            {/* Preview SMS & WhatsApp Quotation */}
            <div className="p-3 bg-muted/50 rounded-xl border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Gotowa oferta do klienta:
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopy('sms')}
                    className="p-1 px-2 rounded-md bg-background border border-border hover:bg-muted text-[10px] font-semibold text-foreground flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedType === 'sms' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    Kopiuj SMS
                  </button>
                  <button
                    onClick={() => handleCopy('wa')}
                    className="p-1 px-2 rounded-md bg-background border border-border hover:bg-muted text-[10px] font-semibold text-foreground flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedType === 'wa' ? <Check className="w-3 h-3 text-emerald-500" /> : <FileSpreadsheet className="w-3 h-3" />}
                    WhatsApp
                  </button>
                </div>
              </div>

              <p className="p-2.5 bg-background border border-border/80 rounded-lg text-muted-foreground font-mono text-[10.5px] leading-relaxed whitespace-pre-wrap select-all">
                {estimation.quotationDraftWhatsApp}
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border bg-muted/20 grid grid-cols-2 gap-2">
            <button
              onClick={handleSendSms}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              Wyślij SMS z wyceną
            </button>
            <button
              onClick={handleSendWhatsApp}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Wyślij na WhatsApp
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
