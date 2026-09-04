'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Printer, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface CvGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTrade?: string;
}

export function CvGeneratorModal({ isOpen, onClose, defaultTrade = 'Murarz / Budowlaniec' }: CvGeneratorModalProps) {
  const [fullName, setFullName] = useState('Jan Kowalski');
  const [phone, setPhone] = useState('501 234 567');
  const [email, setEmail] = useState('jan.kowalski@email.pl');
  const [trade, setTrade] = useState(defaultTrade);
  const [experienceYears, setExperienceYears] = useState('5 lat');
  const [certificates, setCertificates] = useState('Uprawnienia SEP G1 do 1kV, Prawo jazdy kat. B, Szkolenie BHP');
  const [summary, setSummary] = useState('Doświadczony fachowiec budowlany. Samodzielny, punktualny, z własnym kompletem narzędzi ręcznych.');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-2xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden text-card-foreground p-5 space-y-4 my-8 relative max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black">Generator CV Budowlanego (AI / Print PDF)</h3>
                <p className="text-[11px] text-muted-foreground">
                  Wygeneruj gotowe CV ze specyfikacją fachową w 30 sekund
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-1">
            {/* Form Column */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dane kandydata</h4>
              
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">Imię i Nazwisko</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">Telefon</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">Staż pracy</label>
                  <Input
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">Fach / Specjalizacja</label>
                <Input
                  value={trade}
                  onChange={(e) => setTrade(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">Uprawnienia i Certyfikaty</label>
                <Input
                  value={certificates}
                  onChange={(e) => setCertificates(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">Krótkie podsumowanie zawodowe</label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-input bg-transparent resize-none h-16 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Live Preview Column */}
            <div className="p-4 rounded-xl border border-primary/20 bg-muted/30 space-y-3 flex flex-col justify-between" id="cv-print-area">
              <div className="space-y-3">
                <div className="border-b border-border/60 pb-2">
                  <h2 className="text-base font-black text-foreground uppercase tracking-tight">{fullName}</h2>
                  <p className="text-xs font-bold text-primary">{trade}</p>
                  <p className="text-[10px] text-muted-foreground pt-0.5">tel: {phone} • staż: {experienceYears}</p>
                </div>

                <div className="space-y-1">
                  <h5 className="text-[10px] font-extrabold uppercase text-muted-foreground">O mnie</h5>
                  <p className="text-[11px] text-foreground leading-relaxed">{summary}</p>
                </div>

                <div className="space-y-1">
                  <h5 className="text-[10px] font-extrabold uppercase text-muted-foreground">Certyfikaty & Uprawnienia</h5>
                  <p className="text-[11px] text-foreground leading-relaxed font-mono bg-background/60 p-2 rounded border border-border/40">
                    {certificates}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 text-[9px] text-muted-foreground text-center">
                Wygenerowano automatycznie w serwisie NaEtacie Szczecin
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center gap-2 pt-3 border-t border-border/40 shrink-0">
            <Button
              onClick={handlePrint}
              className="flex-1 text-xs font-bold gap-1.5 h-10 bg-primary text-primary-foreground shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Drukuj / Zapisz jako PDF
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="text-xs font-bold h-10 cursor-pointer"
            >
              Zamknij
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
