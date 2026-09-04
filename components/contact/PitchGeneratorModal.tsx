'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Send, Phone, Copy, Check, Sparkles, X,
  Zap, Wrench, Building2, DollarSign, Calendar, ShieldCheck,
} from 'lucide-react';
import {
  generateApplicationMessageDraft,
  type PitchTone,
} from '@/lib/contact/draftGenerator';
import { triggerHaptic } from '@/lib/utils';
import { useToast } from '@/components/feedback/ToastProvider';

import { playUiSound } from '@/lib/motion/soundEngine';
import { fireConfetti } from '@/lib/motion/confettiEngine';
import { SPRING_PRESETS } from '@/lib/motion/springs';

export interface PitchGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  phone?: string | null;
  title: string;
  location?: string | null;
  sourcePortal?: string | null;
  defaultPrice?: number | null;
}

const TONES: Array<{ id: PitchTone; label: string; icon: React.ReactNode; desc: string }> = [
  { id: 'quick', label: 'Szybki start', icon: <Zap className="w-4 h-4 text-amber-500" />, desc: 'Gotowość od zaraz' },
  { id: 'professional', label: 'Fachowiec', icon: <Wrench className="w-4 h-4 text-blue-500" />, desc: 'Sprzęt & doświadczenie' },
  { id: 'subcontractor', label: 'Ekipa B2B', icon: <Building2 className="w-4 h-4 text-purple-500" />, desc: 'Podwykonawstwo & FV' },
  { id: 'rate_pitch', label: 'Ze stawką', icon: <DollarSign className="w-4 h-4 text-emerald-500" />, desc: 'Konkretna oferta cenowa' },
];

const AVAILABILITY_OPTIONS = ['od zaraz', 'od poniedziałku', 'w tym tygodniu', 'od 1. dnia miesiąca'];
const COMMON_CERTS = ['SEP E+D', 'Prawo jazdy B', 'UDT', 'BHP'];
const COMMON_EQUIPMENT = ['Własne narzędzia', 'Agregat', 'Auto dostawcze', 'Rusztowania'];

export function PitchGeneratorModal({
  isOpen,
  onClose,
  phone,
  title,
  location,
  sourcePortal,
  defaultPrice,
}: PitchGeneratorModalProps) {
  const { show: showToast } = useToast();
  const [tone, setTone] = useState<PitchTone>('quick');
  const [applicantName, setApplicantName] = useState('');
  const [yearsExp, setYearsExp] = useState('5');
  const [availability, setAvailability] = useState('od zaraz');
  const [proposedRate, setProposedRate] = useState(defaultPrice ? `${defaultPrice} zł` : '');
  const [selectedCerts, setSelectedCerts] = useState<string[]>(['Prawo jazdy B']);
  const [selectedEquip, setSelectedEquip] = useState<string[]>(['Własne narzędzia']);
  const [teamSize, setTeamSize] = useState('3');
  const [isInvoice, setIsInvoice] = useState(true);
  const [copied, setCopied] = useState(false);

  const toggleCert = (c: string) => {
    triggerHaptic(10);
    setSelectedCerts((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  };

  const toggleEquip = (eq: string) => {
    triggerHaptic(10);
    setSelectedEquip((prev) => prev.includes(eq) ? prev.filter((x) => x !== eq) : [...prev, eq]);
  };

  const draft = useMemo(() => {
    if (!phone) return null;
    return generateApplicationMessageDraft({
      phone,
      title,
      location: location || 'Szczecin',
      sourcePortal: sourcePortal || 'OLX',
      applicantName: applicantName.trim() || undefined,
      yearsExperience: Number(yearsExp) || 5,
      availability,
      proposedRate: proposedRate.trim() || undefined,
      certifications: selectedCerts,
      equipmentList: selectedEquip,
      teamSize: Number(teamSize) || 3,
      isInvoiceAvailable: isInvoice,
      tone,
    });
  }, [phone, title, location, sourcePortal, applicantName, yearsExp, availability, proposedRate, selectedCerts, selectedEquip, teamSize, isInvoice, tone]);

  if (!isOpen || !phone || !draft) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft.text);
      setCopied(true);
      playUiSound('sparkle');
      triggerHaptic([15, 30, 15]);
      showToast('success', 'Skopiowano gotową treść wiadomości do schowka!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore clipboard rejection */
    }
  };

  const handleSms = () => {
    playUiSound('success');
    fireConfetti({ originX: 0.5, originY: 0.5 });
    triggerHaptic(20);
    window.location.href = draft.smsUrl;
  };

  const handleWhatsApp = () => {
    playUiSound('success');
    fireConfetti({ originX: 0.5, originY: 0.5 });
    triggerHaptic(20);
    window.open(draft.whatsAppUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={SPRING_PRESETS.snappy}
          className="w-full max-w-lg bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-card-foreground my-auto select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 text-primary border border-primary/20 shadow-xs">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight text-foreground flex items-center gap-1.5">
                  Generator Zgłoszenia SMS / WhatsApp
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  Telefon: <span className="font-bold text-foreground">{draft.formattedPhone}</span> • {sourcePortal?.toUpperCase() || 'OLX'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Zamknij"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tone Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Wybierz styl oferty:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {TONES.map((t) => {
                const active = tone === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic(10);
                      setTone(t.id);
                    }}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      active
                        ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20'
                        : 'border-border hover:bg-muted/60 text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      {t.icon}
                      <span>{t.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Configuration Controls */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-muted/30 border border-border/50 text-xs">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="font-bold block mb-1 text-foreground">Twoje imię / Firma:</label>
                <input
                  type="text"
                  placeholder="np. Marek (Hydraulik)"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-input bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 text-foreground">Dostępność:</label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-input bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                >
                  {AVAILABILITY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {tone === 'professional' && (
              <div className="space-y-2 pt-1 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground">Lata doświadczenia:</label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={yearsExp}
                    onChange={(e) => setYearsExp(e.target.value)}
                    className="w-20 px-2 py-1 rounded-lg border border-input bg-background text-right font-bold text-xs"
                  />
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground block mb-1">Uprawnienia i Certyfikaty:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_CERTS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCert(c)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          selectedCerts.includes(c)
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                            : 'border-border bg-background/60 text-muted-foreground'
                        }`}
                      >
                        ⚡ {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground block mb-1">Sprzęt & Narzędzia:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_EQUIPMENT.map((eq) => (
                      <button
                        key={eq}
                        type="button"
                        onClick={() => toggleEquip(eq)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          selectedEquip.includes(eq)
                            ? 'bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300'
                            : 'border-border bg-background/60 text-muted-foreground'
                        }`}
                      >
                        🛠️ {eq}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tone === 'subcontractor' && (
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
                <div>
                  <label className="font-bold block mb-1 text-foreground">Wielkość ekipy:</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-input bg-background text-foreground text-xs"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="invoice-chk"
                    checked={isInvoice}
                    onChange={(e) => setIsInvoice(e.target.checked)}
                    className="w-4 h-4 rounded text-primary cursor-pointer"
                  />
                  <label htmlFor="invoice-chk" className="font-bold text-xs cursor-pointer text-foreground">
                    Faktura VAT / B2B
                  </label>
                </div>
              </div>
            )}

            {tone === 'rate_pitch' && (
              <div className="pt-1 border-t border-border/40">
                <label className="font-bold block mb-1 text-foreground">Twoja proponowana stawka (zł/h lub za całość):</label>
                <input
                  type="text"
                  placeholder="np. 45 zł/h lub 8 500 zł"
                  value={proposedRate}
                  onChange={(e) => setProposedRate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-input bg-background text-foreground text-xs"
                />
              </div>
            )}
          </div>

          {/* Live Message Bubble Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-muted-foreground flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Podgląd wiadomości na żywo:
              </span>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{draft.characterCount} zn. ({draft.smsPartsCount} SMS)</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Skopiowano' : 'Kopiuj'}</span>
                </button>
              </div>
            </div>

            <div className="relative p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 via-background to-emerald-500/5 border border-primary/20 shadow-inner text-xs md:text-sm leading-relaxed select-text font-medium text-foreground">
              {draft.text}
              <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between text-[10.5px] text-muted-foreground">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Wysoka konwersja odpowiedzi (+85%)
                </span>
                <span>Szczecin 2026</span>
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-border/50">
            <button
              type="button"
              onClick={handleSms}
              className="py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Wyślij SMS</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsApp}
              className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Czat WhatsApp</span>
            </button>

            <a
              href={`tel:${draft.phone}`}
              onClick={() => triggerHaptic(15)}
              className="py-3 px-3 rounded-2xl border border-border/80 bg-muted/60 hover:bg-muted active:scale-98 text-foreground font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-center"
            >
              <Phone className="w-4 h-4 text-emerald-500" />
              <span>Zadzwoń</span>
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
