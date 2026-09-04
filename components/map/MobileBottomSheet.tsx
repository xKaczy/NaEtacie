'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import {
  MapPin,
  ChevronUp,
  Heart,
  Navigation,
  Sparkles,
  Building2,
  ChevronDown,
  CheckCircle2,
  GripHorizontal,
  MessageSquare,
  Phone,
  ExternalLink,
  ShieldCheck,
  Home,
  Award,
  Wrench,
  Bus,
} from 'lucide-react';
import type { DisplayAnnouncement } from '@/lib/types/display';
import { normalizeCategory, CATEGORIES } from '@/lib/data/categories';
import { triggerHaptic, getAnnouncementExternalUrl } from '@/lib/utils';
import { generateApplicationMessageDraft } from '@/lib/contact/draftGenerator';
import { EmployerTrustBadge } from '@/components/safety/EmployerTrustBadge';
import { evaluateEmployerTrust } from '@/lib/safety/employerTrustEvaluator';
import { getQuickSmsHref, getZditmTransitUrl } from '@/lib/geo/transitRouting';
import { findNearestSupplier } from '@/lib/geo/szczecinSuppliers';
import { parseJobSalary } from './utils';

export interface MobileBottomSheetProps {
  ads: DisplayAnnouncement[];
  selectedAd: DisplayAnnouncement | null;
  selectedId: string | null;
  onSelectAd: (id: string) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onShowOnMap: (id: string) => void;
  onSnapStateChange?: (state: SheetSnapState) => void;
  ui: {
    surface: string;
    border: string;
    text: string;
    shadow: string;
  };
  isDark: boolean;
}

export type SheetSnapState = 'collapsed' | 'medium' | 'expanded';

const SNAP_HEIGHTS: Record<SheetSnapState, string> = {
  collapsed: '62px',
  medium: '44vh',
  expanded: '78vh',
};

export function MobileBottomSheet({
  ads,
  selectedAd,
  selectedId,
  onSelectAd,
  isFavorite,
  onToggleFavorite,
  onShowOnMap,
  onSnapStateChange,
}: MobileBottomSheetProps) {
  const [snapState, setSnapState] = useState<SheetSnapState>('medium');
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (selectedId) {
      triggerHaptic(12);
      setSnapState((prev) => (prev === 'collapsed' ? 'medium' : prev));
      if (snapState === 'expanded') {
        const cardEl = cardRefs.current.get(selectedId);
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  }, [selectedId]);

  const updateSnapState = (newState: SheetSnapState) => {
    setSnapState(newState);
    onSnapStateChange?.(newState);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;

    if (velocity.y < -160 || offset.y < -30) {
      triggerHaptic(12);
      if (snapState === 'collapsed') updateSnapState('medium');
      else if (snapState === 'medium') updateSnapState('expanded');
    } else if (velocity.y > 160 || offset.y > 30) {
      triggerHaptic(12);
      if (snapState === 'expanded') updateSnapState('medium');
      else if (snapState === 'medium') updateSnapState('collapsed');
    }
  };

  const currentDisplayAd = selectedAd || (ads.length > 0 ? ads[0] : null);

  const toggleSnap = () => {
    triggerHaptic(15);
    if (snapState === 'collapsed') updateSnapState('medium');
    else if (snapState === 'medium') updateSnapState('expanded');
    else updateSnapState('collapsed');
  };

  const getQuickContactLink = (ad: DisplayAnnouncement) => {
    const draft = generateApplicationMessageDraft({
      phone: ad.phone,
      title: ad.title,
      location: ad.location_text,
      sourcePortal: ad.source_portal,
      tone: 'quick',
    });

    if (draft) {
      return draft.whatsAppUrl || draft.smsUrl;
    }

    const fallbackText = encodeURIComponent(
      `Dzień dobry! Piszę w sprawie ogłoszenia "${ad.title}" ze Szczecina na portalu NaEtacie. Czy oferta jest nadal aktualna?`
    );
    if (ad.phone) {
      const cleanPhone = ad.phone.replace(/\D/g, '');
      return `https://wa.me/48${cleanPhone}?text=${fallbackText}`;
    }
    return `sms:?body=${fallbackText}`;
  };

  const getDirectionsUrl = (ad: DisplayAnnouncement) => {
    if (ad.latitude && ad.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${ad.latitude},${ad.longitude}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ad.location_text || 'Szczecin')}`;
  };

  const phoneDigits = currentDisplayAd?.phone ? currentDisplayAd.phone.replace(/\D/g, '') : null;
  const externalUrl = currentDisplayAd ? getAnnouncementExternalUrl(currentDisplayAd) : '#';

  return (
    <motion.div
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.15}
      onDragEnd={handleDragEnd}
      className="fixed bottom-[72px] pb-[env(safe-area-inset-bottom,0px)] left-0 right-0 md:hidden z-30 flex flex-col rounded-t-3xl shadow-2xl border-t border-x border-emerald-500/25 backdrop-blur-2xl transition-all duration-300 bg-slate-950/95 text-slate-100 ring-1 ring-white/10"
      style={{
        height: SNAP_HEIGHTS[snapState],
      }}
      animate={{ height: SNAP_HEIGHTS[snapState] }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
    >
      {/* ── Tactile Grip Header (Drag Handle) ── */}
      <div
        className="w-full flex flex-col items-center pt-2 pb-2 min-h-[48px] cursor-grab active:cursor-grabbing touch-none select-none shrink-0 group border-b border-white/10 bg-slate-900/60"
        onClick={toggleSnap}
      >
        <div className="flex items-center justify-center w-14 h-1.5 rounded-full bg-slate-600 group-hover:bg-emerald-400 group-active:scale-110 transition-all mb-1.5">
          <GripHorizontal className="w-3.5 h-3.5 text-slate-400 opacity-75" />
        </div>
        <div className="flex items-center justify-between w-full px-4 text-xs font-bold text-slate-300">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Szczecin & Okolice:</span>
            <span className="text-emerald-400 font-mono font-black bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
              {ads.length} ofert
            </span>
          </span>
          <div className="flex items-center gap-1 text-emerald-400 font-extrabold text-xs">
            <span>{snapState === 'collapsed' ? 'Rozwiń' : snapState === 'expanded' ? 'Zwiń' : 'Pełna lista'}</span>
            {snapState === 'expanded' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </div>
        </div>
      </div>

      {/* ── Scrollable Content Area ── */}
      <div className="flex-1 overflow-y-auto px-3 pb-10 pt-2 space-y-2 overscroll-contain touch-pan-y custom-scrollbar">
        {/* MEDIUM & COLLAPSED: High-Contrast Active Offer Card */}
        {snapState !== 'expanded' && currentDisplayAd && (
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3.5 space-y-3 shadow-xl backdrop-blur-md">
            {/* Badges & Favorite */}
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  {CATEGORIES[normalizeCategory(currentDisplayAd.category)]?.icon}{' '}
                  {CATEGORIES[normalizeCategory(currentDisplayAd.category)]?.label || currentDisplayAd.category}
                </span>

                <EmployerTrustBadge trust={evaluateEmployerTrust(currentDisplayAd)} />
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(15);
                  onToggleFavorite(currentDisplayAd.id);
                }}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-red-400 transition-transform active:scale-90 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                aria-label="Dodaj do ulubionych"
              >
                <Heart
                  className={`w-5 h-5 ${
                    isFavorite(currentDisplayAd.id)
                      ? 'fill-red-500 text-red-500'
                      : 'text-slate-400 hover:text-red-400'
                  }`}
                />
              </button>
            </div>

            {/* Title & Stawka */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-heading font-extrabold text-sm sm:text-base text-slate-100 line-clamp-2 leading-snug">
                  {currentDisplayAd.title}
                </h4>
                {currentDisplayAd.company && (
                  <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mt-1">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {currentDisplayAd.company}
                  </p>
                )}
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  {currentDisplayAd.location_text || 'Szczecin'}
                </p>
              </div>

              <div className="text-right shrink-0">
                {(() => {
                  const rate = parseJobSalary(currentDisplayAd.price, currentDisplayAd.title, currentDisplayAd.description);
                  return (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="inline-block text-sm sm:text-base font-black font-mono text-emerald-300 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-500/40 shadow-sm">
                        {rate.displayPill}
                      </span>
                      {rate.isAboveSzczecinMedian && (
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tight">
                          🔥 Top Stawka
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Traits Badges (SEP, Benefits, Housing, Transport) */}
            {currentDisplayAd.traits && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {currentDisplayAd.traits.accommodation_provided && (
                  <span className="text-[10px] font-bold text-sky-300 bg-sky-950/80 border border-sky-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Home className="w-3 h-3" /> Darmowe zakwaterowanie
                  </span>
                )}
                {currentDisplayAd.traits.transport_provided && (
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Wrench className="w-3 h-3" /> Zapewniony dojazd
                  </span>
                )}
                {currentDisplayAd.traits.certifications && currentDisplayAd.traits.certifications.length > 0 && (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Award className="w-3 h-3" /> {currentDisplayAd.traits.certifications.slice(0, 2).join(', ')}
                  </span>
                )}
              </div>
            )}

            {/* Nearest Supplier Badge */}
            {(() => {
              const nearest = findNearestSupplier(currentDisplayAd.latitude, currentDisplayAd.longitude);
              if (!nearest) return null;
              return (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${nearest.supplier.lat},${nearest.supplier.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold hover:bg-amber-500/20 transition-colors touch-manipulation"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="text-base">🏪</span>
                    <span className="truncate">Zaopatrzenie: <strong>{nearest.supplier.name}</strong></span>
                  </span>
                  <span className="text-amber-400 shrink-0 font-mono text-[10px] bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-500/20">
                    {nearest.distanceKm} km (~{nearest.driveTimeMinutes}m)
                  </span>
                </a>
              );
            })()}

            {/* ── 1-Tap Thumb Zone Action Buttons (Min 44px Height for Work Gloves) ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {phoneDigits ? (
                <>
                  <a
                    href={`tel:+48${phoneDigits}`}
                    onClick={() => triggerHaptic(20)}
                    className="min-h-[44px] py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-950/40 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer border border-emerald-400/40 touch-manipulation"
                    title="Zadzwoń do pracodawcy"
                  >
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>Zadzwoń</span>
                  </a>
                  <a
                    href={getQuickSmsHref({ phone: currentDisplayAd.phone, title: currentDisplayAd.title, district: currentDisplayAd.location_text }) || `sms:+48${phoneDigits}`}
                    onClick={() => triggerHaptic(15)}
                    className="min-h-[44px] py-2.5 px-3 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-sky-950/40 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer border border-sky-400/40 touch-manipulation"
                    title="Wyślij gotowy SMS zgłoszeniowy bez pisania"
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span>Szybki SMS</span>
                  </a>
                </>
              ) : (
                <a
                  href={getQuickContactLink(currentDisplayAd)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => triggerHaptic(15)}
                  className="col-span-2 sm:col-span-1 min-h-[44px] py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-950/40 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer border border-emerald-400/40 touch-manipulation"
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span>Napisz SMS</span>
                </a>
              )}

              {currentDisplayAd.latitude && currentDisplayAd.longitude ? (
                <a
                  href={getZditmTransitUrl(currentDisplayAd.latitude, currentDisplayAd.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => triggerHaptic(15)}
                  className="min-h-[44px] py-2.5 px-3 bg-pink-700 hover:bg-pink-600 active:bg-pink-800 text-white font-extrabold text-xs rounded-xl shadow-md shadow-pink-950/40 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer border border-pink-400/40 touch-manipulation"
                  title="Dojazd tramwajem / autobusem ZDiTM Szczecin na 6:30 rano"
                >
                  <Bus className="w-4 h-4 shrink-0" />
                  <span>ZDiTM 6:30</span>
                </a>
              ) : (
                <a
                  href={getDirectionsUrl(currentDisplayAd)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => triggerHaptic(15)}
                  className="min-h-[44px] py-2.5 px-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-950/40 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer border border-blue-400/40 touch-manipulation"
                >
                  <Navigation className="w-4 h-4 shrink-0" />
                  <span>Trasa GPS</span>
                </a>
              )}

              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => triggerHaptic(15)}
                className="col-span-2 sm:col-span-1 min-h-[44px] py-2.5 px-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-950/40 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer border border-amber-300 touch-manipulation"
              >
                <span>Otwórz</span>
                <ExternalLink className="w-4 h-4 shrink-0" />
              </a>
            </div>
          </div>
        )}

        {/* EXPANDED: Full Scrollable Offer List */}
        {snapState === 'expanded' && (
          <div className="space-y-2 pt-1">
            {ads.map((ad) => {
              const isSelected = ad.id === selectedId;
              const cat = CATEGORIES[normalizeCategory(ad.category)];

              return (
                <div
                  key={ad.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(ad.id, el);
                    else cardRefs.current.delete(ad.id);
                  }}
                  onClick={() => {
                    triggerHaptic(12);
                    onSelectAd(ad.id);
                    onShowOnMap(ad.id);
                    updateSnapState('medium');
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-1.5 min-h-[64px] ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/15 shadow-xl ring-1 ring-emerald-500/60'
                      : 'border-slate-800 bg-slate-900/80 hover:bg-slate-800/90 active:scale-[0.99]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <span>{cat?.icon}</span>
                        <span>{cat?.label || ad.category}</span>
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Wybrana
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-black font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                      {parseJobSalary(ad.price, ad.title, ad.description).displayPill}
                    </span>
                  </div>

                  <h5 className="text-xs sm:text-sm font-bold text-slate-100 truncate">{ad.title}</h5>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate max-w-[160px]">{ad.location_text || 'Szczecin'}</span>
                    </div>
                    {ad.company && (
                      <span className="truncate max-w-[130px] font-semibold text-slate-300">
                        {ad.company}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {ads.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs font-medium">
                Brak ofert w wybranym obszarze mapy Szczecina.
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
