'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { GripHorizontal, X, MapPin, Compass, Globe, Heart, Phone, ListFilter, QrCode, Share2, Search, Check, MessageSquare, Flag } from 'lucide-react';
import type { DisplayAnnouncement } from '@/lib/types/display';
import { CATEGORIES, normalizeCategory } from '@/lib/data/categories';
import { getAnnouncementExternalUrl, triggerHaptic } from '@/lib/utils';
import { haversineKm } from '@/lib/matching/engine';
import { OlxLinkActions } from '@/components/olx/OlxLinkActions';
import { OlxQrModal } from '@/components/olx/OlxQrModal';
import { PitchGeneratorModal } from '@/components/contact/PitchGeneratorModal';
import { ReportAdModal } from '@/components/feedback/ReportAdModal';

export interface DraggableJobModalProps {
  ad: DisplayAnnouncement | null;
  onClose: () => void;
  onShowInList: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  ui: {
    surface: string;
    border: string;
    text: string;
    shadow: string;
  };
  isDark: boolean;
  homeLat?: number | null;
  homeLng?: number | null;
}

export function DraggableJobModal({
  ad,
  onClose,
  onShowInList,
  isFavorite,
  onToggleFavorite,
  ui,
  isDark,
  homeLat,
  homeLng,
}: DraggableJobModalProps) {
  const dragControls = useDragControls();
  const [qrOpen, setQrOpen] = useState(false);
  const [pitchOpen, setPitchOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const distKm = useMemo(() => {
    if (ad && homeLat != null && homeLng != null && ad.latitude != null && ad.longitude != null) {
      const d = haversineKm(homeLat, homeLng, ad.latitude, ad.longitude);
      return Math.round(d * 10) / 10;
    }
    return null;
  }, [ad, homeLat, homeLng]);

  const estDriveMin = distKm != null ? Math.max(2, Math.round((distKm / 35) * 60)) : null;

  if (!ad) return null;

  const catKey = normalizeCategory(ad.category);
  const cat = CATEGORIES[catKey] || { label: ad.category, icon: '💼', color: '#3b82f6' };

  const priceDisplay = ad.price
    ? typeof ad.price === 'number'
      ? `${ad.price.toLocaleString('pl-PL')} zł`
      : ad.price
    : null;

  const externalUrl = getAnnouncementExternalUrl(ad);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: ad.title || 'Ogłoszenie NaEtacie',
          url: externalUrl,
        });
        triggerHaptic(15);
      } catch {
        /* share cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(externalUrl);
        setCopied(true);
        triggerHaptic([10, 30, 10]);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          key={ad.id}
          drag
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0.12}
          initial={{ opacity: 0, scale: 0.85, y: '-45%', x: '-50%' }}
          animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
          exit={{ opacity: 0, scale: 0.85, y: '-45%' }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          className="fixed top-1/2 left-1/2 z-50 w-[270px] sm:w-[290px] max-w-[calc(100vw-20px)] rounded-2xl shadow-2xl border border-white/30 dark:border-slate-700/80 backdrop-blur-2xl overflow-hidden select-none"
          style={{
            background: isDark ? 'rgba(15, 23, 42, 0.97)' : 'rgba(255, 255, 255, 0.98)',
            color: ui.text,
            boxShadow: `0 20px 50px ${cat.color}25, 0 8px 30px rgba(0, 0, 0, 0.35)`,
          }}
        >
          {/* Shimmer Top Accent Line */}
          <div
            className="h-1 w-full"
            style={{
              background: `linear-gradient(90deg, ${cat.color}, ${cat.color}88, #10b981)`,
            }}
          />

          {/* Dedicated Drag Handle Top Header */}
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="w-full flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border/40 cursor-grab active:cursor-grabbing select-none touch-none"
            style={{
              background: `linear-gradient(135deg, ${cat.color}18 0%, ${cat.color}05 100%)`,
            }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <GripHorizontal className="w-3.5 h-3.5 text-muted-foreground opacity-70 shrink-0 animate-pulse" />
              <span
                className="text-[10px] font-extrabold uppercase tracking-wider truncate flex items-center gap-1"
                style={{ color: cat.color }}
              >
                <span className="text-[11px]">{cat.icon}</span>
                <span className="truncate">{cat.label}</span>
              </span>
            </div>

            <div className="flex items-center gap-0.5 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(12);
                  onToggleFavorite();
                }}
                className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-red-500 transition-colors cursor-pointer"
                aria-label={isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground/70 hover:text-red-500'
                  }`}
                />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(10);
                  onClose();
                }}
                className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground transition-colors cursor-pointer"
                aria-label="Zamknij"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>

          {/* Content Body - Fully Unblocked Clicks */}
          <div className="p-3 space-y-2 select-text" onPointerDown={(e) => e.stopPropagation()}>
            {/* Title & Company */}
            <div>
              <h4 className="font-bold text-[12px] leading-snug text-foreground truncate">{ad.title}</h4>
              {ad.company && (
                <p className="text-[10px] font-medium text-muted-foreground truncate mt-0.5">{ad.company}</p>
              )}
            </div>

            {/* Location & Price Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[9px] font-semibold bg-muted/80 text-foreground px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <MapPin className="w-3 h-3 text-primary shrink-0" />
                <span className="truncate max-w-[120px]">{ad.location_text}</span>
              </span>

              {distKm != null && (
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <span>🚗</span> {distKm}km (~{estDriveMin}m)
                </span>
              )}

              {priceDisplay && (
                <span className="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/15 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <span>💰</span> {priceDisplay}
                </span>
              )}
            </div>

            {/* Phone & SMS Pitch Buttons if available */}
            {ad.phone && (
              <div className="grid grid-cols-2 gap-1.5">
                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  href={`tel:${ad.phone}`}
                  className="flex items-center justify-center gap-1.5 py-1 px-2.5 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10.5px] font-bold rounded-lg transition-all"
                >
                  <Phone className="w-3 h-3" /> {ad.phone}
                </motion.a>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic(12);
                    setPitchOpen(true);
                  }}
                  className="flex items-center justify-center gap-1 py-1 px-2 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer"
                  title="Otwórz generator zgłoszenia SMS / WhatsApp"
                >
                  <MessageSquare className="w-3 h-3" /> SMS / WhatsApp
                </motion.button>
              </div>
            )}

            {/* Prominent Quick Features Bar: Kod QR | Udostępnij | Szukaj */}
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/50">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(12);
                  setQrOpen(true);
                }}
                className="flex-1 flex items-center justify-center gap-1 h-7 text-[9.5px] font-bold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
                title="Kod QR do skanowania smartfonem"
              >
                <QrCode className="w-3 h-3" />
                <span>Kod QR</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-1 h-7 text-[9.5px] font-bold rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 transition-all cursor-pointer"
                title="Udostępnij ofertę"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Share2 className="w-3 h-3" />}
                <span>{copied ? 'Skopiowano!' : 'Udostępnij'}</span>
              </motion.button>

              <motion.a
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                href={`https://www.olx.pl/praca/szczecin/?search%5Bq%5D=${encodeURIComponent(ad.title || 'praca')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 h-7 text-[9.5px] font-bold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-all text-center cursor-pointer"
                title="Szukaj podobnych ogłoszeń"
              >
                <Search className="w-3 h-3" />
                <span>Szukaj</span>
              </motion.a>
            </div>

            {/* Responsive 2x2 Action Grid */}
            <div className="pt-1 border-t border-border/40 space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    triggerHaptic(10);
                    onShowInList();
                  }}
                  className="flex items-center justify-center gap-1 h-7 px-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer shadow-xs"
                >
                  <ListFilter className="w-3 h-3 text-emerald-400" />
                  <span>Na liście</span>
                </motion.button>

                <OlxLinkActions
                  ad={ad}
                  variant="default"
                  size="sm"
                  className="h-7 text-[10px] py-0 font-bold"
                />
              </div>

              {ad.latitude != null && ad.longitude != null && (
                <div className="grid grid-cols-2 gap-1.5">
                  <motion.a
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    href={`https://www.google.com/maps/dir/?api=1&destination=${ad.latitude},${ad.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 h-7 px-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-bold rounded-lg transition-all text-center cursor-pointer"
                  >
                    <Compass className="w-3 h-3" />
                    <span>Nawigacja</span>
                  </motion.a>

                  <motion.a
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${ad.latitude},${ad.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 h-7 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-lg transition-all text-center cursor-pointer"
                  >
                    <Globe className="w-3 h-3" />
                    <span>Widok ulicy</span>
                  </motion.a>
                </div>
              )}
            </div>

            {/* Source & RODO / Report Trigger */}
            <div className="pt-1.5 flex items-center justify-between text-[9.5px] text-muted-foreground px-0.5">
              <span>Źródło: {ad.source_portal.toUpperCase()}</span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  setReportOpen(true);
                }}
                className="hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                title="Zgłoś nieaktualne ogłoszenie lub poproś o usunięcie danych (RODO)"
              >
                <Flag className="w-2.5 h-2.5 text-rose-500/80" />
                <span>Zgłoś / RODO</span>
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <OlxQrModal
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        url={externalUrl}
        title={ad.title}
      />

      <PitchGeneratorModal
        isOpen={pitchOpen}
        onClose={() => setPitchOpen(false)}
        phone={ad.phone}
        title={ad.title}
        location={ad.location_text}
        sourcePortal={ad.source_portal}
        defaultPrice={typeof ad.price === 'number' ? ad.price : null}
      />

      <ReportAdModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        adId={ad.id}
        adTitle={ad.title}
        phone={ad.phone}
      />
    </>
  );
}
