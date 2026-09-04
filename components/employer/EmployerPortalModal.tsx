'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Plus, Sparkles, X, CheckCircle2, ChevronRight, ChevronLeft, MapPin, BadgePercent, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AtsKanbanBoard } from './AtsKanbanBoard';
import { triggerHaptic } from '@/lib/utils';

export interface EmployerPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdCreated?: (title: string) => void;
}

export function EmployerPortalModal({ isOpen, onClose, onAdCreated }: EmployerPortalModalProps) {
  const [tab, setTab] = useState<'create' | 'kanban'>('create');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('Szczecin, Centrum');
  const [desc, setDesc] = useState('');
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleCert = (cert: string) => {
    triggerHaptic(8);
    setSelectedCerts((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    triggerHaptic(15);
    setSuccess(true);
    if (onAdCreated) onAdCreated(title);
    setTimeout(() => {
      setSuccess(false);
      setTitle('');
      setCompany('');
      setPrice('');
      setDesc('');
      setStep(1);
      setTab('kanban');
    }, 1200);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-3xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden text-card-foreground p-5 space-y-4 my-8 relative max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-sm font-black">Panel Pracodawcy i Wykonawcy (B2B)</h3>
                <p className="text-[11px] text-muted-foreground">
                  Publikacja ofert bezpośrednich i obsługa zgłoszeń fachowców w Szczecinie
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

          {/* Navigation Tabs */}
          <div className="flex gap-2 border-b border-border/40 pb-2 shrink-0">
            <Button
              onClick={() => {
                triggerHaptic(8);
                setTab('create');
              }}
              variant={tab === 'create' ? 'default' : 'outline'}
              size="sm"
              className="text-xs font-bold gap-1.5 h-8 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Dodaj Nowe Ogłoszenie
            </Button>
            <Button
              onClick={() => {
                triggerHaptic(8);
                setTab('kanban');
              }}
              variant={tab === 'kanban' ? 'default' : 'outline'}
              size="sm"
              className="text-xs font-bold gap-1.5 h-8 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Tablica Kandydatów (ATS)
            </Button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto pr-1">
            {tab === 'create' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 3-Step Progress Wizard Indicator */}
                <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-muted/40 border border-border/50 text-[11px] font-bold">
                  <div className={`flex items-center gap-1.5 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                    <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">1</span>
                    <span>Podstawy & Stawka</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <div className={`flex items-center gap-1.5 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                    <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">2</span>
                    <span>Uprawnienia & Opis</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <div className={`flex items-center gap-1.5 ${step === 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                    <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">3</span>
                    <span>Podgląd Live</span>
                  </div>
                </div>

                {success && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Ogłoszenie opublikowane pomyślnie! Przechodzenie do tablicy kandydatów...
                  </div>
                )}

                {/* STEP 1: Basic Information */}
                {step === 1 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-foreground">Tytuł stanowiska</label>
                        <Input
                          placeholder="np. Murarz-Tynkarz od zaraz"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          required
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-foreground">Nazwa firmy / Pracodawca</label>
                        <Input
                          placeholder="np. BudMax Szczecin Sp. z o.o."
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-semibold text-foreground">Wynagrodzenie (brutto / mc)</label>
                          <span className="text-[9px] text-emerald-600 font-bold">Szczecin avg: 7k - 10k zł</span>
                        </div>
                        <Input
                          placeholder="np. 8500 zł"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-foreground">Lokalizacja w Szczecinie</label>
                        <Input
                          placeholder="np. Szczecin, Gumieńce"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="button"
                        onClick={() => {
                          if (title) setStep(2);
                        }}
                        disabled={!title}
                        size="sm"
                        className="text-xs font-bold gap-1 h-9 cursor-pointer"
                      >
                        Krok 2: Uprawnienia <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Certifications & Description */}
                {step === 2 && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-foreground">Wymagane uprawnienia i badge</label>
                      <div className="flex flex-wrap gap-1.5">
                        {['SEP G1/G2/G3', 'UDT Kat. III', 'F-gaz', 'Prawo jazdy B/C', 'Praca na wysokości', 'Własny sprzęt'].map((cert) => {
                          const isSel = selectedCerts.includes(cert);
                          return (
                            <button
                              type="button"
                              key={cert}
                              onClick={() => toggleCert(cert)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                isSel
                                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                  : 'bg-muted text-muted-foreground border-border/60 hover:bg-muted/80'
                              }`}
                            >
                              {isSel && <Check className="w-2.5 h-2.5" />}
                              {cert}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground">Opis stanowiska i wymagania</label>
                      <textarea
                        placeholder="Wpisz zakres obowiązków, godziny pracy, oferowane narzędzia..."
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-md border border-input bg-transparent resize-none h-24 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="pt-2 flex justify-between">
                      <Button
                        type="button"
                        onClick={() => setStep(1)}
                        variant="outline"
                        size="sm"
                        className="text-xs font-bold gap-1 h-9 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Wstecz
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setStep(3)}
                        size="sm"
                        className="text-xs font-bold gap-1 h-9 cursor-pointer"
                      >
                        Krok 3: Podgląd Live <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Live Preview Card & Submit */}
                {step === 3 && (
                  <div className="space-y-3">
                    <div className="text-[11px] font-semibold text-muted-foreground">Podgląd ogłoszenia na żywo w serwisie:</div>
                    <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          Ogłoszenie B2B
                        </span>
                        <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {price || '8 500 zł/mc'}
                        </span>
                      </div>
                      <h4 className="font-heading font-black text-sm text-foreground">{title || 'Tytuł ogłoszenia'}</h4>
                      <p className="text-xs text-muted-foreground">{company || 'Pracodawca B2B Szczecin'} • {location}</p>
                      {selectedCerts.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {selectedCerts.map((c) => (
                            <span key={c} className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-muted border border-border/60">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex justify-between">
                      <Button
                        type="button"
                        onClick={() => setStep(2)}
                        variant="outline"
                        size="sm"
                        className="text-xs font-bold gap-1 h-10 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Edytuj
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        className="text-xs font-bold gap-2 h-10 bg-primary text-primary-foreground shadow-md cursor-pointer px-6"
                      >
                        <Building2 className="w-4 h-4" /> Opublikuj Teraz Bezpośrednio
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            ) : (
              <AtsKanbanBoard />
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
