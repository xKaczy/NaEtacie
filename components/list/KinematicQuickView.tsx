'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, MapPin, ExternalLink, Heart, Navigation,
  Phone, Sparkles, FileText, Calculator
} from 'lucide-react';
import { ensureAbsoluteUrl, getAnnouncementExternalUrl } from '@/lib/utils';
import type { DisplayAnnouncement } from '@/lib/types/display';
import { normalizeCategory, CATEGORIES } from '@/lib/data/categories';
import { calculateNetSalary } from '@/lib/salary/calculator';
import { extractRequirements } from '@/lib/ai/extractor';
import { estimateSalary } from '@/lib/ai/salaryEstimator';
import { CoverLetterModal } from '@/components/ai/CoverLetterModal';
import { Button } from '@/components/ui/button';
import { detectJobUrgency } from '@/lib/urgent/urgentJobDetector';
import { evaluateEmployerTrust } from '@/lib/safety/employerTrustEvaluator';
import { UrgentBadge } from '@/components/announcements/UrgentBadge';
import { EmployerTrustBadge } from '@/components/safety/EmployerTrustBadge';
import { VoiceSummaryButton } from '@/components/voice/VoiceSummaryButton';
import { TradeBidEstimatorModal } from '@/components/announcements/TradeBidEstimatorModal';

export interface KinematicQuickViewProps {
  ad: DisplayAnnouncement | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShowOnMap: () => void;
}

export function KinematicQuickView({
  ad,
  isOpen,
  onClose,
  isFavorite,
  onToggleFavorite,
  onShowOnMap,
}: KinematicQuickViewProps) {
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [estimatorOpen, setEstimatorOpen] = useState(false);

  if (!isOpen || !ad) return null;

  const cat = CATEGORIES[normalizeCategory(ad.category)];
  const netBreakdown = typeof ad.price === 'number' ? calculateNetSalary(ad.price) : null;
  const aiEstimate = typeof ad.price !== 'number' ? estimateSalary(ad.category, ad.title, ad.description) : null;
  const reqs = extractRequirements(ad.title, ad.description);
  const safeUrl = getAnnouncementExternalUrl(ad);
  const urgency = detectJobUrgency(ad.title, ad.description);
  const trustReport = evaluateEmployerTrust({
    company: ad.company,
    phone: ad.phone,
    sourcePortal: ad.source_portal,
    descriptionLength: ad.description.length,
  });

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-md">
          {/* Dimmed Backdrop Clicker */}
          <div className="absolute inset-0" onClick={onClose} />

          {/* Drawer Content */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="relative w-full max-w-xl h-full bg-card border-l border-border/80 shadow-2xl overflow-y-auto flex flex-col z-10 text-card-foreground"
          >
            {/* Header Bar */}
            <div className="sticky top-0 z-20 glass border-b border-border/50 px-6 py-4 flex items-center justify-between bg-card/90 backdrop-blur-xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                  <span>{cat?.icon}</span> {cat?.label}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-0.5 rounded-md border border-border">
                  {ad.source_portal}
                </span>
                <UrgentBadge urgency={urgency} />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onToggleFavorite}
                  className="p-2 rounded-full hover:bg-accent text-red-500 transition-transform active:scale-90 border border-border/60"
                  title={isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground border border-border/60"
                  aria-label="Zamknij"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Body */}
            <div className="p-6 space-y-5 flex-1">
              {/* Trust & Audio Assistant Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/60">
                <EmployerTrustBadge report={trustReport} />
                <VoiceSummaryButton
                  data={{
                    title: ad.title,
                    location: ad.location_text,
                    price: ad.price,
                    phone: ad.phone,
                  }}
                />
              </div>

              {/* Title & Salary */}
              <div className="space-y-3">
                <h2 className="text-xl md:text-2xl font-black text-foreground leading-snug">
                  {ad.title}
                </h2>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-semibold text-foreground">{ad.location_text}</span>
                  </div>

                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-xl border border-emerald-500/30 shadow-sm">
                    {typeof ad.price === 'number' ? `${ad.price.toLocaleString('pl-PL')} zł/mies. brutto` : 'Cena do uzgodnienia'}
                  </div>
                </div>
              </div>

              {/* 1-Tap Trade Bid Estimator */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/25 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-primary" /> Kalkulator Wyceny Robocizny (Szczecin 2026)
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Wylicz stawkę rynkową i wygeneruj gotową ofertę SMS/WhatsApp
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setEstimatorOpen(true)}
                    className="text-xs font-bold bg-primary text-primary-foreground shadow-xs cursor-pointer"
                  >
                    Otwórz kalkulator
                  </Button>
                </div>
              </div>

              {/* Extracted AI Requirement Chips */}
              {reqs.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" /> Wykryte Wymagania i Atuty (AI)
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {reqs.map((req) => (
                      <span
                        key={req.id}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-primary/20 bg-primary/5 text-foreground shadow-sm"
                      >
                        <span>{req.icon}</span>
                        <span>{req.label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Salary Breakdown Box */}
              {netBreakdown && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-500" /> Szacunkowe Wynagrodzenie Netto
                    </span>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      ~{netBreakdown.uopNet.toLocaleString('pl-PL')} zł na rękę (UoP)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1 border-t border-emerald-500/20">
                    <div>Umowa Zlecenie: <strong>~{netBreakdown.uzNet.toLocaleString('pl-PL')} zł</strong></div>
                    <div>UZ Student (&lt;26): <strong>{netBreakdown.uzStudentNet.toLocaleString('pl-PL')} zł</strong></div>
                  </div>
                </div>
              )}

              {/* AI Cover Letter Button */}
              <button
                type="button"
                onClick={() => setCoverLetterOpen(true)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/20 active:scale-98 transition-all"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Wygeneruj List Motywacyjny / Aplikację (AI)
                </span>
                <span className="text-[10px] uppercase font-extrabold bg-primary/20 px-2 py-0.5 rounded-md">Generuj</span>
              </button>

              {/* Phone */}
              {ad.phone && (
                <a
                  href={`tel:${ad.phone}`}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Zadzwoń do pracodawcy: <strong>{ad.phone}</strong>
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold bg-emerald-500/20 px-2 py-0.5 rounded-md">Połącz</span>
                </a>
              )}

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Szczegóły oferty
                </h3>
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 text-xs md:text-sm leading-relaxed text-foreground whitespace-pre-line">
                  {ad.description || 'Brak dodatkowego opisu ogłoszenia.'}
                </div>
              </div>
            </div>

            {/* Fixed Footer Buttons */}
            <div className="sticky bottom-0 z-20 glass border-t border-border/50 p-4 bg-card/90 backdrop-blur-xl flex items-center gap-3">
              <Button
                onClick={onShowOnMap}
                variant="outline"
                className="flex-1 text-xs font-bold gap-2 h-10 border-border/80"
              >
                <Navigation className="w-4 h-4 text-primary" /> Pokaż na mapie
              </Button>
              <Button
                asChild
                className="flex-1 text-xs font-extrabold gap-2 h-10 bg-primary text-primary-foreground shadow-md cursor-pointer"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <a
                  href={safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" /> Aplikuj na {ad.source_portal || 'OLX'}
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      <CoverLetterModal
        ad={ad}
        isOpen={coverLetterOpen}
        onClose={() => setCoverLetterOpen(false)}
      />

      <TradeBidEstimatorModal
        isOpen={estimatorOpen}
        onClose={() => setEstimatorOpen(false)}
        title={ad.title}
        description={ad.description}
        phone={ad.phone}
        locationText={ad.location_text}
        companyName={ad.company}
      />
    </>
  );
}

