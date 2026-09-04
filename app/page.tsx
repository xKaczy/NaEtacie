'use client';

/**
 * Main app page — map and list are integrated into a single feature:
 * - Same search/sort/portal/favorites/category filters drive both views.
 * - Clicking a marker highlights the matching list card (and can jump to it).
 * - Clicking "Pokaż na mapie" on a card switches to the map tab and flies
 *   to that marker, opening its popup.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  MapPin, Clock, Sparkles, X, ArrowRight, RefreshCw, Loader2,
  Search, Heart, ExternalLink, SlidersHorizontal, Map as MapIcon,
  Target, Briefcase, Share2, Check, Mic, WifiOff, Download,
  ChevronDown, ChevronUp, List, Phone, Copy, Wrench, ShieldCheck,
  FileEdit, Calculator, MessageSquare, Crown,
} from 'lucide-react';

import { useAuth } from '@/lib/auth/AuthContext';
import { useRealtimeAnnouncements } from '@/lib/hooks/useRealtimeAnnouncements';
import { useOfflineSync } from '@/lib/hooks/useOfflineSync';
import { usePushNotifications } from '@/lib/hooks/usePushNotifications';
import { useScraper } from '@/lib/hooks/useScraper';
import { useFavorites } from '@/lib/hooks/useFavorites';
import { useJobPreferences } from '@/lib/hooks/useJobPreferences';
import { useUserNotes } from '@/lib/hooks/useUserNotes';
import { calculateNetSalary } from '@/lib/salary/calculator';
import { useApplicationTracking, STATUS_META, type ApplicationStatus } from '@/lib/hooks/useApplicationTracking';
import { scoreMatch, hasNoPreferences } from '@/lib/matching/engine';
import { useShare } from '@/lib/hooks/useShare';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppShell, type TabId } from '@/components/navigation/AppShell';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { JobPreferencesPanel } from '@/components/list/JobPreferencesPanel';
import { QuickSearchChips } from '@/components/list/QuickSearchChips';
import { MarketStats } from '@/components/list/MarketStats';
import { OlxLinkActions } from '@/components/olx/OlxLinkActions';
import CollapsibleAnnouncementList from '@/components/list/CollapsibleAnnouncementList';
import { computeMarketOverview } from '@/lib/stats/market';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { playUiSound, playSalaryChime } from '@/lib/motion/soundEngine';
import { fireConfetti } from '@/lib/motion/confettiEngine';
import { SPRING_PRESETS } from '@/lib/motion/springs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn, triggerHaptic, exportApplicationsToCSV, ensureAbsoluteUrl, getAnnouncementExternalUrl } from '@/lib/utils';
import { ALL_CATEGORY_KEYS, normalizeCategory, type CategoryKey } from '@/lib/data/categories';
import { searchAnnouncements, tokenize, isSzczecinAnnouncement } from '@/lib/search/engine';
import { parseNaturalLanguageQuery } from '@/lib/search/naturalLanguageQuery';
import { deduplicateCrossPortalAds } from '@/lib/deduplication/crossPortalDeduplicator';
import type { DisplayAnnouncement } from '@/lib/types/display';
import type { MatchResult } from '@/lib/matching/types';

import MapViewDynamic from '@/components/map/MapViewDynamic';
import { Hero } from '@/components/landing/Hero';
import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt';
import { RecentSearchChips } from '@/components/list/RecentSearchChips';
import { SalaryNetModal } from '@/components/salary/SalaryNetModal';
import { calculateDistanceKm } from '@/lib/geo/distance';
import { JobComparisonModal } from '@/components/list/JobComparisonModal';
import { ApplicationTimelineModal } from '@/components/list/ApplicationTimelineModal';
import { MarketBentoGrid } from '@/components/list/MarketBentoGrid';
import { FloatingDock } from '@/components/navigation/FloatingDock';
import { AnnouncementSlideOver } from '@/components/list/AnnouncementSlideOver';
import { MobileViewSwitcher } from '@/components/navigation/MobileViewSwitcher';
import { AnnouncementMobileDrawer } from '@/components/list/AnnouncementMobileDrawer';
import { KeyboardShortcutsModal } from '@/components/navigation/KeyboardShortcutsModal';
import { useDesktopShortcuts } from '@/lib/hooks/useDesktopShortcuts';
import { CompareShelfDock } from '@/components/list/CompareShelfDock';
import { CompactTableView } from '@/components/list/CompactTableView';
import { DesktopFilterSidebar } from '@/components/layout/DesktopFilterSidebar';
import { DynamicIsland } from '@/components/ui/DynamicIsland';
import { AmbientSolarGlow } from '@/components/theme/AmbientSolarGlow';
import ConstructionSalaryModal from '@/components/calculator/ConstructionSalaryModal';
import { MarketPulseBar } from '@/components/list/MarketPulseBar';
import { CommandPaletteModal } from '@/components/navigation/CommandPaletteModal';
import { SettingsDashboard } from '@/components/settings/SettingsDashboard';
import { FavoritesView } from '@/components/favorites';
import { TerminalTyper } from '@/components/brand/TerminalTyper';
import { playUiChime } from '@/lib/audio/chime';
import { AiInterviewModal } from '@/components/ai/AiInterviewModal';
import { SalaryBenchmarkingModal } from '@/components/stats/SalaryBenchmarkingModal';
import { CvGeneratorModal } from '@/components/cv/CvGeneratorModal';
import { EmployerPortalModal } from '@/components/employer/EmployerPortalModal';
import { EmployerReviewModal } from '@/components/reviews/EmployerReviewModal';
import { QuickFilterBar } from '@/components/ui/QuickFilterBar';
import { AppSettingsModal } from '@/components/settings/AppSettingsModal';
import { generateApplicationMessageDraft } from '@/lib/contact/draftGenerator';
import { ProTierModal } from '@/components/billing/ProTierModal';
import { BoostAdBadge } from '@/components/billing/BoostAdBadge';
import { UrgentBadge } from '@/components/announcements/UrgentBadge';
import { detectJobUrgency } from '@/lib/urgent/urgentJobDetector';
import { EmployerTrustBadge } from '@/components/safety/EmployerTrustBadge';
import { evaluateEmployerTrust } from '@/lib/safety/employerTrustEvaluator';
import { VoiceSummaryButton } from '@/components/voice/VoiceSummaryButton';
import { TradeBidEstimatorModal } from '@/components/announcements/TradeBidEstimatorModal';
import { PitchGeneratorModal } from '@/components/contact/PitchGeneratorModal';
import { SitePhotoLogModal } from '@/components/announcements/SitePhotoLogModal';
import { VoiceTaskRecorderModal } from '@/components/voice/VoiceTaskRecorderModal';
import { TrafficImpedimentsModal } from '@/components/map/TrafficImpedimentsModal';
import { evaluateJobTrafficImpact } from '@/lib/geo/szczecinTrafficImpediments';
import { AdaptiveMobileTopBar } from '@/components/navigation/AdaptiveMobileTopBar';
import { DesktopCommandCenter } from '@/components/layout/DesktopCommandCenter';

type SortOption = 'match' | 'newest' | 'oldest' | 'price-asc' | 'price-desc';

// --- Guest Banner ---

function GuestBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -40, opacity: 0 }}
      className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/20 px-4 py-3"
    >
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">Przeglądasz NaEtacie jako gość.</span>
          <a href="/login" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
            Zaloguj się <ArrowRight className="w-3 h-3" />
          </a>
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent" aria-label="Zamknij">
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// --- Announcement Card ---

// --- Search Query Highlight Helper ---
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/60 text-foreground px-0.5 rounded font-semibold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

function MatchBadge({ score, label }: { score: number; label: string }) {
  // Color calculation based on score
  const colorClass = 
    score >= 80 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200/50' :
    score >= 50 ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200/50' :
    'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200/50';

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all duration-300 shadow-sm",
        colorClass
      )}
      title={`Dopasowanie: ${score}%`}
    >
      <Target className="w-3.5 h-3.5 animate-pulse" /> {score}% · {label}
    </span>
  );
}

function AnnouncementCard({
  ad, index, isFavorite, isSelected, isHovered = false, onMouseEnter, onMouseLeave, match, status, onToggleFavorite, onShowOnMap, onSetStatus, onQuickView, onOpenAiInterview, onOpenSalaryBenchmark, onOpenTimeline, onOpenCalculator, isCompared = false, onToggleCompare,
}: {
  ad: DisplayAnnouncement;
  index: number;
  isFavorite: boolean;
  isSelected: boolean;
  isHovered?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  match: MatchResult | null;
  status: ApplicationStatus | null;
  onToggleFavorite: () => void;
  onShowInList?: () => void;
  onShowOnMap: () => void;
  onSetStatus: (s: ApplicationStatus) => void;
  onQuickView?: () => void;
  onOpenAiInterview?: () => void;
  onOpenSalaryBenchmark?: () => void;
  onOpenTimeline?: () => void;
  onOpenCalculator?: () => void;
  isCompared?: boolean;
  onToggleCompare?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { share, copied } = useShare();
  
  // Clean up search query from active window context to highlight text
  const [searchWord, setSearchWord] = useState('');
  useEffect(() => {
    // Locate the search input value dynamically if not passed directly
    const input = document.querySelector('input[placeholder*="Szukaj ogłoszeń"]') as HTMLInputElement;
    if (input) {
      setSearchWord(input.value);
      const handleInput = () => setSearchWord(input.value);
      input.addEventListener('input', handleInput);
      return () => input.removeEventListener('input', handleInput);
    }
  }, []);

  const priceDisplay = ad.price
    ? typeof ad.price === 'number' 
      ? `${ad.price.toLocaleString('pl-PL')} zł/mies.` 
      : ad.price
    : null;
    
  const hasLocation = ad.latitude !== null && ad.longitude !== null;
  
  const portalColors: Record<string, string> = {
    'pracuj.pl': '#10b981', // Emerald
    'olx': '#2563eb', // Indigo Blue
    'indeed': '#6366f1', // Indigo
    'oferteo': '#f97316', // Orange
    'fixly': '#a855f7', // Purple
    'bip': '#d97706', // Amber Gold (Municipal / Tender)
    'bip szczecin': '#d97706',
  };
  
  const portalColor = portalColors[ad.source_portal.toLowerCase()] || '#6b7280';
  const statusMeta = status ? STATUS_META[status] : null;
  const { show: showToast } = useToast();
  const [isFullDescShown, setIsFullDescShown] = useState(false);

  const { getNote, saveNote } = useUserNotes();
  const userNote = getNote(ad.id);
  const [noteInput, setNoteInput] = useState(userNote);
  useEffect(() => { setNoteInput(userNote); }, [userNote]);

  const netBreakdown = typeof ad.price === 'number' ? calculateNetSalary(ad.price) : null;
  const urgency = useMemo(() => detectJobUrgency(ad.title, ad.description), [ad.title, ad.description]);
  const trust = useMemo(() => evaluateEmployerTrust(ad), [ad]);
  const trafficImpact = useMemo(() => evaluateJobTrafficImpact(ad.latitude, ad.longitude), [ad.latitude, ad.longitude]);
  const [tradeBidModalOpen, setTradeBidModalOpen] = useState(false);
  const [pitchModalOpen, setPitchModalOpen] = useState(false);
  const [sitePhotoLogOpen, setSitePhotoLogOpen] = useState(false);
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false);
  const [trafficModalOpen, setTrafficModalOpen] = useState(false);

  const handleSwipeEnd = (_: unknown, info: PanInfo) => {
    triggerHaptic(15);
    if (info.offset.x > 75) {
      onToggleFavorite();
      playUiSound('sparkle');
      showToast('success', !isFavorite ? 'Dodano do ulubionych (gest swipe)' : 'Usunięto z ulubionych');
    } else if (info.offset.x < -75) {
      const nextStatus = status === 'applied' ? 'interview' : 'applied';
      onSetStatus(nextStatus);
      playUiSound('success');
      showToast('info', `Status oferty zmieniony na: ${STATUS_META[nextStatus].label}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.25), duration: 0.3, ease: 'easeOut' }}
      className="relative rounded-2xl overflow-hidden my-1"
    >
      {/* Background Swipe Actions Indicator */}
      <div className="absolute inset-0 flex items-center justify-between px-6 font-bold text-xs pointer-events-none rounded-2xl overflow-hidden bg-muted/40 border border-border/30">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black">
          <Heart className="w-5 h-5 fill-current" />
          <span>Polubiono</span>
        </div>
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black">
          <span>Zaaplikowano</span>
          <Briefcase className="w-5 h-5" />
        </div>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleSwipeEnd}
        layout
      >
        <SpotlightCard
          className={cn(
            'cursor-pointer transition-all duration-300 overflow-hidden wow-glass-card rounded-2xl',
            isSelected 
              ? 'bg-gradient-to-r from-primary/15 via-card to-card border-primary ring-2 ring-primary/20 shadow-xl' 
              : isHovered
              ? 'border-emerald-500/70 ring-2 ring-emerald-500/30 shadow-emerald-500/15 shadow-xl -translate-y-0.5'
              : 'hover:border-emerald-500/50 hover:shadow-emerald-500/10 hover:shadow-xl'
          )}
          onClick={() => setExpanded(!expanded)}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <CardContent className="p-0">
            <div className="p-4.5">
              <div className="flex items-start gap-3.5">
                {/* Portal status pillar */}
                <div 
                  className="w-1.5 self-stretch rounded-full shrink-0 transition-all duration-300 shadow-xs"
                  style={{ backgroundColor: portalColor }}
                  title={ad.source_portal}
                />

                <div className="flex-1 min-w-0 space-y-2">
                  {/* Top Row: Category / Portal badge & quick actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span 
                        className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border shadow-2xs"
                        style={{ 
                          backgroundColor: `${portalColor}12`, 
                          borderColor: `${portalColor}25`, 
                          color: portalColor 
                        }}
                      >
                        {ad.source_portal === 'bip' ? '🏛️ Przetarg BIP' : ad.source_portal}
                      </span>
                      {ad.traits?.trade_tags && ad.traits.trade_tags.length > 0 && (
                        <span 
                          className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 shadow-2xs"
                          title={`Branża: ${ad.traits.trade_tags.join(', ')}`}
                        >
                          <Wrench className="w-2.5 h-2.5" />
                          {ad.traits.trade_tags[0]}
                          {ad.traits.trade_tags.length > 1 && ` +${ad.traits.trade_tags.length - 1}`}
                        </span>
                      )}
                      {ad.is_cross_posted && ad.available_portals && ad.available_portals.length > 1 && (
                        <span 
                          className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1 shadow-2xs"
                          title={`Zlecenie opublikowane na: ${ad.available_portals.join(', ')}`}
                        >
                          🌐 Multi-portal ({ad.available_portals.length})
                        </span>
                      )}
                      {urgency.isUrgent && <UrgentBadge urgency={urgency} />}
                      {ad.employment_type && (
                        <span className="text-[9px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border/40">
                          {ad.employment_type}
                        </span>
                      )}
                      {(() => {
                        const is24h = ad.posted_days_ago === 0 || (ad.scraped_at && (Date.now() - new Date(ad.scraped_at).getTime()) < 24 * 3600 * 1000);
                        return is24h ? (
                          <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-2xs">
                            <Sparkles className="w-2.5 h-2.5 animate-pulse" /> NOWE 24H
                          </span>
                        ) : null;
                      })()}
                    </div>

                    <div className="flex items-center gap-1">
                      <VoiceSummaryButton
                        title={ad.title}
                        location={ad.location_text}
                        price={ad.price ? (typeof ad.price === 'number' ? `${ad.price} zł` : ad.price) : null}
                        description={ad.description}
                      />
                      {ad.phone && (
                        <div className="flex items-center gap-1">
                          <a
                            href={`tel:${ad.phone.replace(/\s+/g, '')}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHaptic(15);
                            }}
                            className="shrink-0 p-1.5 rounded-full text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:scale-110 transition-transform cursor-pointer"
                            title={`Zadzwoń: ${ad.phone}`}
                            aria-label={`Zadzwoń do majstra: ${ad.phone}`}
                          >
                            <Phone className="w-4 h-4 fill-current" />
                          </a>
                          <a
                            href={`sms:${ad.phone.replace(/\s+/g, '')}?body=${encodeURIComponent(
                              `Dzień dobry! Piszę w sprawie ogłoszenia: "${ad.title.slice(0, 45)}" z serwisu NaEtacie. Jestem zainteresowany i dyspozycyjny od zaraz. Proszę o kontakt.`
                            )}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHaptic(15);
                            }}
                            className="shrink-0 p-1.5 rounded-full text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:scale-110 transition-transform cursor-pointer"
                            title={`Napisz SMS: ${ad.phone}`}
                            aria-label="Napisz szybki SMS ze zgłoszeniem"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </a>
                        </div>
                      )}
                      {onQuickView && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic(10);
                            onQuickView();
                          }}
                          className="shrink-0 p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
                          title="Szybki podgląd"
                          aria-label="Szybki podgląd ogłoszenia"
                        >
                          <Sparkles className="w-4 h-4 text-emerald-500" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playUiChime('like');
                          triggerHaptic(12);
                          onToggleFavorite();
                        }}
                        className={cn(
                          'shrink-0 p-1.5 rounded-full transition-all duration-300 active:scale-90', 
                          isFavorite 
                            ? 'text-red-500 bg-red-50 dark:bg-red-950/60 shadow-sm' 
                            : 'text-muted-foreground/35 hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20'
                        )}
                        aria-label={isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                      >
                        <Heart className={cn('w-4 h-4 transition-transform duration-300', isFavorite && 'fill-current scale-110')} />
                      </button>
                    </div>
                  </div>

                {/* Title */}
                <h3 className="font-bold text-sm md:text-base text-foreground leading-snug tracking-tight hover:text-primary transition-colors duration-200">
                  <a
                    href={getAnnouncementExternalUrl(ad)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                    title="Otwórz ogłoszenie w nowej karcie"
                  >
                    <HighlightText text={ad.title} query={searchWord} />
                    <ExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0 inline" />
                  </a>
                </h3>

                {/* Match score & Application status */}
                {(match || statusMeta) && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {match && match.score < 100 && <MatchBadge score={match.score} label={match.reasons[0]?.label || 'Dopasowanie'} />}
                    {statusMeta && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm transition-all duration-300"
                        style={{ 
                          background: `${statusMeta.color}12`, 
                          borderColor: `${statusMeta.color}30`,
                          color: statusMeta.color 
                        }}
                      >
                        {statusMeta.icon} {statusMeta.label}
                      </span>
                    )}
                  </div>
                )}

                {/* Middle line: Company details & Trust Score */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {ad.company && (
                    <p className="text-xs font-semibold text-foreground/70 flex items-center gap-1.5">
                      🏢 {ad.company}
                    </p>
                  )}
                  <EmployerTrustBadge trust={trust} />
                </div>

                {/* Bottom line: Location, time, price */}
                <div className="flex items-center justify-between gap-4 pt-1 flex-wrap border-t border-border/30">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                      <MapPin className="w-3.5 h-3.5 text-primary/70" /> {ad.location_text}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {ad.posted_days_ago !== null && ad.posted_days_ago !== undefined
                        ? (ad.posted_days_ago === 0 ? 'Dzisiaj' : ad.posted_days_ago === 1 ? 'Wczoraj' : `${ad.posted_days_ago} dni temu`)
                        : formatTimeAgo(ad.scraped_at)
                      }
                    </span>
                  </div>
                  
                  {(() => {
                    const parsedSalary = ad.traits?.salary_parsed;
                    if (parsedSalary && parsedSalary.unit) {
                      const unitLabels: Record<string, string> = {
                        hourly: 'zł/h',
                        daily: 'zł/dzień',
                        piecework: 'zł/m²',
                        monthly: 'zł/mc',
                        project: 'zł zlecenie',
                      };
                      const unitStr = unitLabels[parsedSalary.unit] || 'zł';
                      const rangeStr = parsedSalary.min !== parsedSalary.max && parsedSalary.max
                        ? `${parsedSalary.min} – ${parsedSalary.max}`
                        : `${parsedSalary.min ?? ''}`;
                      return (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs md:text-sm font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shadow-xs">
                            {rangeStr} {unitStr}
                          </span>
                        </div>
                      );
                    }
                    return priceDisplay ? (
                      <span className="text-xs md:text-sm font-black text-primary bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10 shadow-sm">
                        {priceDisplay}
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Details dropdown */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden bg-muted/30 dark:bg-muted/10 border-t border-border/40"
              >
                <div className="p-4.5 space-y-4">
                  {/* Detailed Description with Rozwijany Opis Toggle */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Opis ogłoszenia</h4>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> ~{Math.max(1, Math.ceil((ad.description || '').split(/\s+/).length / 150))} min czytania
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed whitespace-pre-line bg-background/60 p-3.5 rounded-xl border border-border/40 shadow-2xs">
                      <HighlightText
                        text={isFullDescShown || (ad.description || '').length <= 220 ? ad.description : ad.description.slice(0, 220) + '...'}
                        query={searchWord}
                      />
                    </p>
                    {(ad.description || '').length > 220 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic(10);
                          setIsFullDescShown(!isFullDescShown);
                        }}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer pt-0.5"
                      >
                        {isFullDescShown ? (
                          <>Zwiń opis <ChevronUp className="w-3.5 h-3.5" /></>
                        ) : (
                          <>Pokaż pełny opis ({(ad.description || '').length} znaków) <ChevronDown className="w-3.5 h-3.5" /></>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Kalkulator Wynagrodzenia Netto (Na rękę) */}
                  {netBreakdown && (
                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Calculator className="w-4 h-4 text-emerald-500" /> Przelicznik Wynagrodzenia Netto
                        </span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                          ~{netBreakdown.uopNet.toLocaleString('pl-PL')} zł na rękę (UoP)
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-muted-foreground pt-1 border-t border-emerald-500/20">
                        <div>Umowa Zlecenie: <strong>~{netBreakdown.uzNet.toLocaleString('pl-PL')} zł</strong></div>
                        <div>UZ Student (&lt;26): <strong>{netBreakdown.uzStudentNet.toLocaleString('pl-PL')} zł</strong></div>
                        <div>B2B na rękę (ryczałt 8.5%): <strong>~{Math.round(typeof ad.price === 'number' ? ad.price * 0.82 : 0).toLocaleString('pl-PL')} zł</strong></div>
                      </div>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-300/80 bg-emerald-500/10 px-2 py-1 rounded-md flex items-center justify-between">
                        <span>🚗 Szacunkowy koszt dojazdu w Szczecinie: ~220-380 zł/mc</span>
                        <span className="font-semibold">Na czysto po paliwie: ~{Math.max(0, netBreakdown.uopNet - 280).toLocaleString('pl-PL')} zł</span>
                      </div>
                    </div>
                  )}

                  {/* Private User Notes Feature */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 border border-border/40">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileEdit className="w-3.5 h-3.5 text-primary" /> Moja prywatna notatka do oferty
                    </h4>
                    <textarea
                      value={noteInput}
                      onChange={(e) => {
                        setNoteInput(e.target.value);
                        saveNote(ad.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      placeholder="Dodaj prywatną notatkę (np. Ustalenia z majstrem, termin rozmowy)..."
                      rows={2}
                      className="w-full p-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>

                  {/* Extracted Equipment, Certifications & Benefits */}
                  {ad.traits && (
                    <div className="space-y-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                        <Wrench className="w-3.5 h-3.5" /> Branża, sprzęt, certyfikaty i korzyści
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {ad.traits.trade_tags?.map((t, i) => (
                          <span key={`trade-${i}`} className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40">
                            🏗️ {t}
                          </span>
                        ))}
                        {ad.traits.certifications?.map((c, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                            ⚡ {c}
                          </span>
                        ))}
                        {ad.traits.equipment_detected?.map((eq, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                            🛠️ {eq.name}
                          </span>
                        ))}
                        {ad.traits.benefits?.map((b, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                            ✨ {b}
                          </span>
                        ))}
                        {ad.traits.accommodation_provided && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                            🏠 Zakwaterowanie gratis
                          </span>
                        )}
                        {ad.traits.transport_provided && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                            🚌 Transport gratis
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Safety & Authenticity Badge */}
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Zweryfikowana oferta — 100% bezpieczna i zgodna ze standardami rynkowymi</span>
                  </div>

                  {/* Roadworks & Van Logistics Alert */}
                  {trafficImpact.hasNearbyRoadworks && trafficImpact.nearestImpediment && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setTrafficModalOpen(true);
                      }}
                      className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 cursor-pointer hover:bg-amber-500/15 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">🚧</span>
                        <div className="text-xs">
                          <span className="font-bold text-amber-800 dark:text-amber-300 block">
                            Utrudnienia drogowe w rejonie budowy ({trafficImpact.distanceKm} km)
                          </span>
                          <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80 line-clamp-1">
                            {trafficImpact.nearestImpediment.streetName} (+{trafficImpact.nearestImpediment.delayMinutes} min). Kliknij, aby sprawdzić objazd dla busa.
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-md shrink-0">
                        Objazd ➔
                      </span>
                    </div>
                  )}

                  {/* QOL Quick Share & Copy & Timeline Action Row */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        const shareText = `${ad.title} — ${ad.price ? ad.price + ' zł' : 'Do uzgodnienia'} w ${ad.location_text}\n${getAnnouncementExternalUrl(ad)}`;
                        navigator.clipboard.writeText(shareText);
                        triggerHaptic(15);
                        showToast('success', 'Skopiowano treść i link oferty do schowka!');
                      }}
                      className="flex-1 text-xs gap-1.5 h-8 font-semibold border-border/60 hover:bg-accent min-w-[120px]"
                    >
                      <Copy className="w-3.5 h-3.5" /> Kopiuj treść
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        const shareUrl = getAnnouncementExternalUrl(ad);
                        if (navigator.share) {
                          navigator.share({ title: ad.title, text: ad.title, url: shareUrl }).catch(() => {});
                        } else {
                          navigator.clipboard.writeText(shareUrl);
                          showToast('success', 'Skopiowano link oferty do schowka!');
                        }
                        triggerHaptic(15);
                      }}
                      className="flex-1 text-xs gap-1.5 h-8 font-semibold border-border/60 hover:bg-accent min-w-[100px]"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Udostępnij
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenTimeline) onOpenTimeline();
                      }}
                      className="flex-1 text-xs gap-1.5 h-8 font-semibold border-border/60 hover:bg-accent min-w-[120px]"
                    >
                      <Clock className="w-3.5 h-3.5 text-primary" /> Postęp
                    </Button>
                    <Button
                      variant={isCompared ? 'default' : 'outline'}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleCompare) onToggleCompare();
                      }}
                      className="text-xs gap-1 h-8 font-semibold min-w-[100px]"
                    >
                      ⚖️ {isCompared ? 'Porównujesz' : 'Porównaj'}
                    </Button>
                  </div>

                  {/* Reasons list (positive & negative matching criteria) */}
                  {match && match.reasons.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Analiza dopasowania preferencji</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {match.reasons.map((r, ri) => (
                          <span
                            key={ri}
                            className={cn(
                              'inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg border shadow-sm transition-all',
                              r.positive 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40'
                                : 'bg-muted text-muted-foreground border-border/60'
                            )}
                          >
                            <span>{r.positive ? '🟢' : '⚪'}</span>
                            <span>{r.label}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Change status actions */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Aktualny status oferty</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(STATUS_META) as ApplicationStatus[]).map((s) => {
                        const meta = STATUS_META[s];
                        const active = status === s;
                        return (
                          <button
                            key={s}
                            onClick={(e) => { e.stopPropagation(); onSetStatus(s); }}
                            className={cn(
                              'inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all duration-200 active:scale-95 cursor-pointer shadow-sm',
                              active 
                                ? 'text-white border-transparent scale-105 shadow-md' 
                                : 'text-muted-foreground border-border/80 bg-background hover:bg-accent/80 hover:text-foreground'
                            )}
                            style={active ? { backgroundColor: meta.color } : undefined}
                          >
                            <span className="text-xs">{meta.icon}</span>
                            <span>{meta.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action buttons - Responsive 2-tier Grid */}
                  <div className="space-y-2 pt-2.5 border-t border-border/40">
                    {/* Tier 1: Primary Direct Engagement Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <OlxLinkActions ad={ad} variant="default" size="sm" className="w-full text-xs font-bold py-2 shadow-sm" />
                      {ad.phone && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic(12);
                            setPitchModalOpen(true);
                          }}
                          className="w-full gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/15 cursor-pointer shadow-xs"
                          title="Otwórz generator zgłoszenia SMS / WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Zgłoś SMS / WhatsApp</span>
                        </Button>
                      )}
                      {hasLocation && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic(10);
                            onShowOnMap();
                          }}
                          className="w-full gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
                        >
                          <MapIcon className="w-3.5 h-3.5 text-primary" />
                          <span>Pokaż na mapie</span>
                        </Button>
                      )}
                    </div>

                    {/* Tier 2: AI Tools, Benchmarks & Transit */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic(10);
                          setTradeBidModalOpen(true);
                        }}
                        className="gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer"
                        title="Szybka wycena zlecenia / Oferta robocizny"
                      >
                        🧮 Wycena zlecenia
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic(10);
                          onOpenAiInterview?.();
                        }}
                        className="gap-1 text-xs font-bold text-primary border-primary/30 bg-primary/5 hover:bg-primary/10 cursor-pointer"
                        title="Trenuj rozmowę kwalifikacyjną z AI"
                      >
                        🤖 Trening AI
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic(10);
                          onOpenSalaryBenchmark?.();
                        }}
                        className="gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 cursor-pointer"
                        title="Porównaj stawkę z rynkiem"
                      >
                        📊 Stawki Szczecin
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic(10);
                          setSitePhotoLogOpen(true);
                        }}
                        className="gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10 cursor-pointer"
                        title="Foto-Dziennik Budowy & Raport Ustereki (Przed / W trakcie / Po)"
                      >
                        📸 Foto-Dziennik
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic(10);
                          setVoiceRecorderOpen(true);
                        }}
                        className="gap-1 text-xs font-bold text-violet-600 dark:text-violet-400 border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 cursor-pointer"
                        title="Głosowe notatki, metraż i rozliczenia majstra (Hands-free)"
                      >
                        🎙️ Głosowe Ustalenia
                      </Button>

                      {hasLocation && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${ad.latitude},${ad.longitude}&travelmode=transit`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic(10);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-2xs"
                        >
                          🚌 Dojazd ZDiTM
                        </a>
                      )}

                      {onQuickView && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic(10);
                            onQuickView();
                          }}
                          className="gap-1 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          👁️ Szybki podgląd
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </SpotlightCard>
      </motion.div>

      {/* Trade Bid Estimator Modal */}
      <TradeBidEstimatorModal
        isOpen={tradeBidModalOpen}
        onClose={() => setTradeBidModalOpen(false)}
        title={ad.title}
        description={ad.description}
        phone={ad.phone}
        locationText={ad.location_text}
        companyName={ad.company}
      />

      {/* 1-Click Polish Contractor Pitch Generator Modal */}
      <PitchGeneratorModal
        isOpen={pitchModalOpen}
        onClose={() => setPitchModalOpen(false)}
        phone={ad.phone}
        title={ad.title}
        location={ad.location_text}
        sourcePortal={ad.source_portal}
        defaultPrice={typeof ad.price === 'number' ? ad.price : null}
      />

      {/* Foto-Dziennik Budowy & Dokumentacja Fotograficzna Modal */}
      <SitePhotoLogModal
        isOpen={sitePhotoLogOpen}
        onClose={() => setSitePhotoLogOpen(false)}
        adId={ad.id}
        title={ad.title}
        locationText={ad.location_text}
        companyName={ad.company}
      />

      {/* Głosowe Notatki & Rozliczenia Majstra Modal */}
      <VoiceTaskRecorderModal
        isOpen={voiceRecorderOpen}
        onClose={() => setVoiceRecorderOpen(false)}
        adId={ad.id}
        title={ad.title}
      />

      {/* Utrudnienia Drogowe & Objazdy dla Busa Modal */}
      <TrafficImpedimentsModal
        isOpen={trafficModalOpen}
        onClose={() => setTrafficModalOpen(false)}
        highlightedImpedimentId={trafficImpact.nearestImpediment?.id}
      />
    </motion.div>
  );
}

// --- Loading Skeleton ---

function ListSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

// --- Legacy Notifications removed in favor of NotificationsView component ---

// --- Main Page ---

export default function HomePage() {
  const router = useRouter();
  const { isGuest } = useAuth();

  // Show landing hero on first visit (before user has interacted with the app)
  const [showHero, setShowHero] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hasMapQuery = params.has('lat') || params.has('lng') || params.get('tab') === 'map';
      if (hasMapQuery) {
        setActiveTab('map');
        setShowHero(false);
        return;
      }
    }
    if (!localStorage.getItem('naetacie-hero-dismissed')) {
      setShowHero(true);
    }
  }, []);

  const { announcements, isLive } = useRealtimeAnnouncements(50);
  const { isOnline, isOfflineMode, cachedAt, saveToCache } = useOfflineSync();
  const { ads: scrapedAds, loading: scrapeLoading, lastScrapedAt, scrapeNow } = useScraper();
  const { isFavorite, toggleFavorite, favoriteCount } = useFavorites();
  const { preferences, update: updatePreferences, reset: resetPreferences } = useJobPreferences();
  const { setStatus, getStatus, count: trackedCount, tracked } = useApplicationTracking();
  const pushNotifications = usePushNotifications();

  const [prefsPanelOpen, setPrefsPanelOpen] = useState(false);
  const [showTrackedOnly, setShowTrackedOnly] = useState(false);
  const { show: showToast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window !== 'undefined') {
      const urlTab = new URLSearchParams(window.location.search).get('tab');
      if (urlTab === 'map' || urlTab === 'list' || urlTab === 'favorites' || urlTab === 'stats' || urlTab === 'portal') {
        return urlTab as TabId;
      }
    }
    return 'list';
  });
  const [isSplitView, setIsSplitView] = useState(false);
  const [slideOverAd, setSlideOverAd] = useState<DisplayAnnouncement | null>(null);
  const [viewDensity, setViewDensity] = useState<'cards' | 'table'>('cards');
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [minSalary, setMinSalary] = useState<number>(0);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [guestPrompt, setGuestPrompt] = useState<string | null>(null);

  // --- Filters shared by map AND list ---
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleVoiceSearch = useCallback(() => {
    if (typeof window === 'undefined') return;
    const win = window as unknown as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionClass = (win.SpeechRecognition || win.webkitSpeechRecognition) as any;

    if (!SpeechRecognitionClass) {
      showToast('error', 'Wyszukiwanie głosowe nie jest wspierane w tej przeglądarce.');
      return;
    }

    triggerHaptic(15);
    const recognition = new SpeechRecognitionClass();
    recognition.lang = 'pl-PL';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: { results: Array<Array<{ transcript: string }>> }) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        setSearchQuery(transcript);
        triggerHaptic([10, 20, 10]);
        showToast('success', `Rozpoznano głosowo: "${transcript}"`);
      }
    };

    recognition.start();
  }, [showToast]);

  const [sortBy, setSortBy] = useState<SortOption>('match');
  const [filterPortal, setFilterPortal] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<string | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<CategoryKey>>(
    () => new Set(ALL_CATEGORY_KEYS)
  );

  // --- Salary & Comparison Modals ---
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [salaryCalcGross, setSalaryCalcGross] = useState<number | null>(null);

  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [comparedAdIds, setComparedAdIds] = useState<Set<string>>(new Set());
  const [commuteRadiusKm, setCommuteRadiusKm] = useState<number>(0);
  const [timelineAd, setTimelineAd] = useState<DisplayAnnouncement | null>(null);
  const [constructionCalcModalAd, setConstructionCalcModalAd] = useState<DisplayAnnouncement | null>(null);
  const [pitchModalAd, setPitchModalAd] = useState<DisplayAnnouncement | null>(null);

  // --- Command Palette State ---
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // --- AI Interview, Benchmark, CV, Employer, Review & Settings Modals ---
  const [interviewModalAd, setInterviewModalAd] = useState<DisplayAnnouncement | null>(null);
  const [benchmarkModalAd, setBenchmarkModalAd] = useState<DisplayAnnouncement | null>(null);
  const [cvGeneratorOpen, setCvGeneratorOpen] = useState(false);
  const [employerPortalOpen, setEmployerPortalOpen] = useState(false);
  const [reviewModalCompany, setReviewModalCompany] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [proTierModalOpen, setProTierModalOpen] = useState(false);

  // --- Map <-> List selection sync ---
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredAnnouncementId, setHoveredAnnouncementId] = useState<string | null>(null);
  const [flyToken, setFlyToken] = useState(0);
  const [mapBounds, setMapBounds] = useState<{ south: number; west: number; north: number; east: number } | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const handleSearchArea = useCallback((bounds: { south: number; west: number; north: number; east: number }) => {
    setMapBounds(bounds);
  }, []);

  // Merge realtime + scraped data into one normalized shape
  const allAnnouncements = useMemo((): DisplayAnnouncement[] => {
    const fromRealtime: DisplayAnnouncement[] = announcements.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      source_url: a.source_url || '',
      source_portal: a.source_portal,
      category: a.category || '',
      location_text: a.location_text,
      latitude: a.latitude,
      longitude: a.longitude,
      price: a.price,
      phone: a.contact_info,
      scraped_at: a.scraped_at,
      published_at: a.published_at,
      company: a.company || null,
      employment_type: a.employment_type || null,
      posted_days_ago: a.posted_days_ago ?? null,
      traits: a.traits,
    }));

    const fromScraper: DisplayAnnouncement[] = scrapedAds.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      source_url: a.source_url,
      source_portal: a.source_portal,
      category: a.category,
      location_text: a.location_text,
      latitude: a.latitude,
      longitude: a.longitude,
      price: a.price,
      phone: a.phone || null,
      scraped_at: new Date(a.scraped_at),
      published_at: a.published_at ? new Date(a.published_at) : null,
      company: a.company || null,
      employment_type: a.employment_type || null,
      posted_days_ago: a.posted_days_ago ?? null,
      traits: a.traits,
    }));

    const combinedScraped = [...fromScraper, ...fromRealtime].map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      source_url: item.source_url,
      source_portal: (item.source_portal || 'olx').toLowerCase() as any,
      category: item.category as any,
      location_text: item.location_text,
      latitude: item.latitude,
      longitude: item.longitude,
      price: item.price != null ? String(item.price) : null,
      phone: item.phone,
      scraped_at: item.scraped_at.toISOString(),
      published_at: item.published_at ? item.published_at.toISOString() : null,
      company: item.company || null,
      employment_type: item.employment_type || null,
    }));

    const deduplicated = deduplicateCrossPortalAds(combinedScraped);

    return deduplicated.map((m) => {
      const original = [...fromScraper, ...fromRealtime].find((raw) => raw.id === m.id);
      return {
        id: m.id,
        title: m.title,
        description: m.description,
        source_url: m.source_url,
        source_portal: m.source_portal,
        category: m.category || '',
        location_text: m.location_text,
        latitude: m.latitude,
        longitude: m.longitude,
        price: m.price,
        phone: m.phone || null,
        scraped_at: new Date(m.scraped_at),
        published_at: m.published_at ? new Date(m.published_at) : null,
        company: m.company || null,
        employment_type: m.employment_type || null,
        posted_days_ago: original?.posted_days_ago ?? null,
        traits: original?.traits,
        available_portals: m.available_portals,
        is_cross_posted: m.is_cross_posted,
      };
    });
  }, [announcements, scrapedAds]);

  // Precompute match scores once per (ads, preferences) change
  const matchMap = useMemo(() => {
    const m = new Map<string, MatchResult>();
    for (const ad of allAnnouncements) {
      m.set(ad.id, scoreMatch(ad, preferences));
    }
    return m;
  }, [allAnnouncements, preferences]);

  const prefsActive = !hasNoPreferences(preferences);

  // Market statistics over all announcements (salary levels, top location)
  const marketOverview = useMemo(() => computeMarketOverview(allAnnouncements), [allAnnouncements]);

  const isSearching = tokenize(searchQuery).length > 0;

  // Filters that apply to BOTH map and list (search, portal, favorites, sort)
  const filteredAds = useMemo(() => {
    // Ranked full-text search (diacritic-insensitive, field-weighted)
    let result = searchQuery.trim()
      ? searchAnnouncements(allAnnouncements, searchQuery)
      : [...allAnnouncements];

    if (filterPortal !== 'all') {
      result = result.filter((a) => (a.source_portal || '').toLowerCase() === filterPortal.toLowerCase());
    }

    if (showFavoritesOnly) {
      result = result.filter((a) => isFavorite(a.id));
    }

    if (showTrackedOnly) {
      result = result.filter((a) => getStatus(a.id) !== null);
    }

    if (selectedDistrict) {
      const distLower = selectedDistrict.toLowerCase();
      result = result.filter(
        (a) =>
          (a.location_text || '').toLowerCase().includes(distLower) ||
          (a.description || '').toLowerCase().includes(distLower)
      );
    }

    if (selectedTrade) {
      const tradeLower = selectedTrade.toLowerCase();
      result = result.filter((a) => {
        const hasTag = a.traits?.trade_tags?.some((t) => t.toLowerCase() === tradeLower);
        if (hasTag) return true;
        const fullText = `${a.title} ${a.description}`.toLowerCase();
        return fullText.includes(tradeLower);
      });
    }

    if (minSalary > 0) {
      result = result.filter((a) => {
        const num = extractNumPrice(a.price);
        return num ? num >= minSalary : false;
      });
    }

    if (commuteRadiusKm > 0) {
      const centerLat = 53.4285;
      const centerLon = 14.5528;
      result = result.filter((a) => {
        if (a.latitude == null || a.longitude == null) return true;
        return calculateDistanceKm(centerLat, centerLon, a.latitude, a.longitude) <= commuteRadiusKm;
      });
    }

    if (mapBounds) {
      result = result.filter((a) => {
        if (a.latitude == null || a.longitude == null) return false;
        return (
          a.latitude >= mapBounds.south &&
          a.latitude <= mapBounds.north &&
          a.longitude >= mapBounds.west &&
          a.longitude <= mapBounds.east
        );
      });
    }

    const scoreOf = (id: string) => matchMap.get(id)?.score ?? 0;

    switch (sortBy) {
      case 'match':
        // Active search + default sort => keep search relevance ranking as-is.
        if (searchQuery.trim()) break;
        // With active preferences, rank by score; otherwise fall back to newest
        if (prefsActive) {
          result.sort((a, b) => scoreOf(b.id) - scoreOf(a.id) || b.scraped_at.getTime() - a.scraped_at.getTime());
        } else {
          result.sort((a, b) => b.scraped_at.getTime() - a.scraped_at.getTime());
        }
        break;
      case 'newest':
        result.sort((a, b) => b.scraped_at.getTime() - a.scraped_at.getTime());
        break;
      case 'oldest':
        result.sort((a, b) => a.scraped_at.getTime() - b.scraped_at.getTime());
        break;
      case 'price-asc':
        result.sort((a, b) => (extractNumPrice(a.price) ?? 9999999) - (extractNumPrice(b.price) ?? 9999999));
        break;
      case 'price-desc':
        result.sort((a, b) => (extractNumPrice(b.price) ?? 0) - (extractNumPrice(a.price) ?? 0));
        break;
    }

    return result;
  }, [allAnnouncements, searchQuery, filterPortal, showFavoritesOnly, showTrackedOnly, selectedDistrict, selectedTrade, minSalary, commuteRadiusKm, mapBounds, sortBy, isFavorite, getStatus, matchMap, prefsActive]);

  // Memoize map announcements to preserve reference equality across non-search re-renders
  const mapAds = useMemo(() => filteredAds.filter(isSzczecinAnnouncement), [filteredAds]);

  const comparedAdsList = useMemo(() => {
    return allAnnouncements.filter((a) => comparedAdIds.has(a.id));
  }, [allAnnouncements, comparedAdIds]);

  // Desktop shortcuts listener
  useDesktopShortcuts(
    {
      onNextOffer: () => {
        const list = filteredAds;
        if (list.length === 0) return;
        const idx = list.findIndex((a) => a.id === selectedId);
        const next = idx < list.length - 1 ? list[idx + 1] : list[0];
        if (next) {
          setSelectedId(next.id);
          playUiSound('pop');
        }
      },
      onPrevOffer: () => {
        const list = filteredAds;
        if (list.length === 0) return;
        const idx = list.findIndex((a) => a.id === selectedId);
        const prev = idx > 0 ? list[idx - 1] : list[list.length - 1];
        if (prev) {
          setSelectedId(prev.id);
          playUiSound('pop');
        }
      },
      onToggleFavorite: () => {
        if (selectedId) {
          toggleFavorite(selectedId);
          playUiSound('favorite');
          showToast('info', isFavorite(selectedId) ? 'Usunięto z ulubionych' : 'Dodano do ulubionych ❤️');
        }
      },
      onOpenPitch: () => {
        const target = filteredAds.find((a) => a.id === selectedId) || filteredAds[0];
        if (target) {
          setSlideOverAd(target);
          playUiSound('sparkle');
        }
      },
      onToggleCompare: () => {
        if (selectedId) {
          setComparedAdIds((prev) => {
            const next = new Set(prev);
            if (next.has(selectedId)) next.delete(selectedId);
            else next.add(selectedId);
            return next;
          });
          playUiSound('pop');
        }
      },
      onToggleSplitView: () => {
        setIsSplitView((v) => !v);
        playUiSound('toggle');
      },
      onOpenEstimator: () => {
        setConstructionCalcModalAd({ title: 'Wycena robocizny', price: 6000 } as unknown as DisplayAnnouncement);
        playUiSound('pop');
      },
      onOpenShortcutsModal: () => {
        setShortcutsModalOpen(true);
        playUiSound('whoosh');
      },
      onFocusSearch: () => {
        searchInputRef.current?.focus();
      },
    },
    activeTab === 'list'
  );

  // Save to cache
  useEffect(() => {
    if (allAnnouncements.length > 0 && isOnline) {
      saveToCache(allAnnouncements);
    }
  }, [allAnnouncements, isOnline, saveToCache]);

  // Sync activeTab from URL on initial load and browser back/forward navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const readUrlTab = () => {
      const urlTab = new URLSearchParams(window.location.search).get('tab');
      if (urlTab === 'map' || urlTab === 'list' || urlTab === 'favorites' || urlTab === 'settings') {
        setActiveTab(urlTab as TabId);
      }
    };
    readUrlTab();
    window.addEventListener('popstate', readUrlTab);
    return () => window.removeEventListener('popstate', readUrlTab);
  }, []);

  // Auto-scrape on first load
  useEffect(() => {
    if (allAnnouncements.length === 0 && !scrapeLoading) {
      scrapeNow(undefined, 40);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Cross-navigation handlers ---

  /** Marker clicked on the map: select it, and if in split view, scroll to it */
  const handleMarkerClick = useCallback((id: string) => {
    setSelectedId(id);
    if (isSplitView) {
      cardRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isSplitView]);

  /** "Zobacz na liście" from a map popup: switch tabs + scroll to the card */
  const handleShowInList = useCallback((id: string) => {
    setSelectedId(id);
    setActiveTab('list');
    // Wait for the tab switch to render the list before scrolling
    requestAnimationFrame(() => {
      setTimeout(() => {
        cardRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
    });
  }, []);

  /** "Pokaż na mapie" from a list card: fly to marker (switches tab only when not in split view) */
  const handleShowOnMap = useCallback((id: string) => {
    setSelectedId(id);
    setFlyToken((t) => t + 1);
    if (!isSplitView) {
      setActiveTab('map');
    }
  }, [isSplitView]);

  function handleTabChange(tab: TabId) {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('tab', tab);
      window.history.replaceState(null, '', `?${params.toString()}`);
    }
  }

  // Power-user keyboard shortcuts
  useKeyboardShortcuts({
    onFocusSearch: () => { setActiveTab('list'); setTimeout(() => searchInputRef.current?.focus(), 60); },
    onEscape: () => { setPrefsPanelOpen(false); setGuestPrompt(null); },
    onTab: (t) => handleTabChange(t as TabId),
  });

  function renderContent() {
    if (activeTab === 'favorites') {
      const favoriteAds = allAnnouncements.filter((a) => isFavorite(a.id));
      return (
        <FavoritesView
          favoriteAds={favoriteAds}
          tracked={tracked}
          onSetStatus={(id, st, note) => {
            setStatus(id, st, note);
            showToast('success', `Status: ${STATUS_META[st].label}`);
          }}
          onOpenTimeline={(ad) => setTimelineAd(ad)}
          onToggleFavorite={toggleFavorite}
          onShowOnMap={(id) => {
            setActiveTab('map');
            setSelectedId(id);
            setFlyToken((t) => t + 1);
          }}
          onQuickView={(ad) => setSlideOverAd(ad)}
          onOpenAiInterview={(ad) => setInterviewModalAd(ad)}
          onOpenSalaryBenchmark={(ad) => setBenchmarkModalAd(ad)}
          onOpenCvGenerator={() => setCvGeneratorOpen(true)}
          onGoToBrowse={() => setActiveTab('list')}
        />
      );
    }

    if (activeTab === 'settings') {
      return <SettingsDashboard />;
    }

    const listAds = filteredAds.filter((a) => activeCategories.has(normalizeCategory(a.category)));
    const isMapActive = activeTab === 'map';
    const isListActive = activeTab === 'list';

    return (
      <div className="w-full">
        {/* 🗺️ Enterprise WebGL Map Container (Persisted when tab-switching, unmounted in split view to avoid duplicate WebGL contexts) */}
        {!isSplitView && (
          <div className={cn('w-full h-[calc(100dvh-128px)] md:h-[calc(100dvh-56px)] relative overflow-hidden', isMapActive ? 'block' : 'hidden')}>
            <MapViewDynamic
              ads={mapAds}
              totalCount={allAnnouncements.length}
              activeCategories={activeCategories}
              onCategoryChange={setActiveCategories}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              selectedId={selectedId}
              hoveredId={hoveredAnnouncementId}
              onMarkerHover={setHoveredAnnouncementId}
              flyToken={flyToken}
              onMarkerClick={handleMarkerClick}
              onShowInList={handleShowInList}
              onSearchArea={handleSearchArea}
              homeLat={preferences.homeLat}
              homeLng={preferences.homeLng}
              maxDistanceKm={preferences.maxDistanceKm}
            />
          </div>
        )}

        {/* 📋 Interactive List & Split View Container */}
        <div className={cn(isListActive || isSplitView ? 'block' : 'hidden')}>
          <div className={cn('mx-auto space-y-2', isSplitView ? 'max-w-[1780px] flex flex-col lg:flex-row gap-4 items-start px-2 sm:px-4' : 'max-w-3xl')}>
            {/* 🖥️ Desktop Command Center Left Sidebar: Advanced Pro Filters */}
            {isSplitView && (
              <div className="hidden xl:block">
                <DesktopFilterSidebar
                  selectedDistrict={selectedDistrict}
                  onSelectDistrict={setSelectedDistrict}
                  selectedPortal={filterPortal}
                  onSelectPortal={setFilterPortal}
                  selectedTrade={selectedTrade}
                  onSelectTrade={setSelectedTrade}
                  minSalary={minSalary}
                  onMinSalaryChange={setMinSalary}
                  commuteKm={commuteRadiusKm}
                  onCommuteKmChange={setCommuteRadiusKm}
                  onResetFilters={() => {
                    setSelectedDistrict(null);
                    setSelectedTrade(null);
                    setFilterPortal('all');
                    setMinSalary(0);
                    setCommuteRadiusKm(0);
                    setSearchQuery('');
                    setMapBounds(null);
                  }}
                />
              </div>
            )}

            <div className={cn('space-y-2', isSplitView ? 'w-full lg:flex-1' : 'w-full')}>

            {/* 📴 Offline Site Banner for Construction workers with weak LTE */}
            {isOfflineMode && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-1 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-between gap-3 text-xs shadow-md"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 shrink-0">
                    <WifiOff className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-extrabold text-amber-900 dark:text-amber-200 block truncate">
                      Tryb Pracy Offline (Budowa)
                    </span>
                    <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 block truncate">
                      Brak sieci — przeglądasz oferty z pamięci podręcznej PWA {cachedAt ? `(zapisane: ${formatTimeAgo(cachedAt)})` : ''}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 shrink-0">
                  Lokalnie
                </span>
              </motion.div>
            )}

            {/* 🍱 Dynamic Market Bento Grid Overview */}
            <MarketBentoGrid
              ads={listAds}
              totalCount={allAnnouncements.length}
              onFilterUrgent={() => {
                setSearchQuery('pilne');
                setActiveQuickFilter('urgent');
              }}
              onFilterHighPay={() => {
                setSortBy('price-desc');
                setActiveQuickFilter('high_pay');
              }}
            />

            {/* 🎛️ Unified Master Search & Tools Header */}
            <div className="sticky top-12 md:top-0 z-20 glass border border-border/50 px-3.5 py-3 space-y-2.5 rounded-2xl shadow-md bg-background/90 backdrop-blur-xl">
              {/* Row 1: Search Input + Quick Action Buttons */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder={isListening ? 'Słucham...' : 'Szukaj ogłoszeń: murarz, elektryk, B2B... (naciśnij /)'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      'pl-9 pr-18 h-10 rounded-xl bg-background/85 border-border/70 text-sm font-medium transition-all shadow-inner placeholder:text-muted-foreground/60',
                      isListening && 'border-primary ring-2 ring-primary/30 animate-pulse'
                    )}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      onClick={handleVoiceSearch}
                      className={cn(
                        'p-1.5 rounded-lg transition-all active:scale-90 cursor-pointer',
                        isListening
                          ? 'text-red-500 bg-red-50 dark:bg-red-950/60 animate-bounce'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                      title="Wyszukaj głosem (PL)"
                      aria-label="Wyszukaj głosem"
                    >
                      <Mic className="w-4 h-4 text-primary" />
                    </button>
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setActiveQuickFilter(null);
                        }}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Wyczyść wyszukiwanie"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    'h-10 px-3 rounded-xl gap-1.5 font-bold cursor-pointer transition-all',
                    showFilters ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
                  )}
                  title="Zaawansowane filtry i sortowanie"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Filtry</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => scrapeNow(undefined, 40)}
                  disabled={scrapeLoading}
                  className="h-10 px-3 rounded-xl gap-1 font-bold cursor-pointer"
                  title="Odśwież najnowsze ogłoszenia"
                >
                  {scrapeLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-primary" />
                  )}
                </Button>

                <Button
                  size="sm"
                  onClick={() => setProTierModalOpen(true)}
                  className="h-10 px-3 rounded-xl gap-1.5 font-black bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 hover:brightness-110 shadow-sm cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5 fill-zinc-950" />
                  <span className="hidden sm:inline">PRO</span>
                </Button>
              </div>

              {/* Row 2: Quick Filter Chips Rack */}
              <QuickFilterBar
                activeFilterId={activeQuickFilter}
                totalOffersCount={filteredAds.length}
                onRefresh={() => {
                  scrapeNow();
                  showToast('info', 'Odświeżanie najnowszych ofert ze Szczecina...');
                }}
                onFilterToggle={(filterId) => {
                  if (activeQuickFilter === filterId) {
                    setActiveQuickFilter(null);
                    setSearchQuery('');
                    setSortBy('match');
                    setFilterPortal('all');
                    setSelectedTrade(null);
                    setActiveCategories(new Set(ALL_CATEGORY_KEYS));
                    return;
                  }
                  setActiveQuickFilter(filterId);
                  if (filterId === 'bip_tenders') {
                    setFilterPortal('bip');
                    setSelectedTrade(null);
                    showToast('info', 'Filtruję przetargi publiczne BIP Szczecin');
                  } else if (filterId === 'urgent') setSearchQuery('pilne');
                  else if (filterId === 'german_border') setSearchQuery('Niemcy');
                  else if (filterId === 'mega_projects') setSearchQuery('budowa');
                  else if (filterId === 'high_pay') setSortBy('price-desc');
                  else if (filterId === 'today') setSearchQuery('dzisiaj');
                  else if (filterId === 'finishing') {
                    setActiveCategories(new Set(['wykończenia']));
                    setSelectedTrade('Płytki i glazura');
                  } else if (filterId === 'installations') {
                    setActiveCategories(new Set(['instalacje']));
                    setSelectedTrade('Instalacje wod-kan i CO');
                  } else if (filterId === 'shell_structure') {
                    setSelectedTrade('Zbrojarz i betoniarz');
                  } else if (filterId === 'near_me') setSearchQuery('Szczecin');
                }}
              />

              {/* Row 3: Desktop tools horizontal chip rack */}
              <div className="hidden md:flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 pt-1 border-t border-border/40">
                <RecentSearchChips currentQuery={searchQuery} onSelectQuery={setSearchQuery} />

                {mapBounds && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      triggerHaptic(10);
                      setMapBounds(null);
                    }}
                    className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1 shrink-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 cursor-pointer animate-in fade-in zoom-in-95 duration-200"
                    title="Wyczyść filtr obszaru mapy"
                  >
                    <MapIcon className="w-3 h-3" /> Obszar mapy ({filteredAds.length}) <X className="w-3 h-3 ml-0.5" />
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSalaryCalcGross(6000);
                    setSalaryModalOpen(true);
                  }}
                  className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1 shrink-0 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 cursor-pointer"
                  title="Kalkulator wynagrodzeń Netto / Brutto"
                >
                  💰 Netto
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCompareModalOpen(true)}
                  className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1 shrink-0 text-blue-600 dark:text-blue-400 bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10 cursor-pointer"
                  title="Porównywarka ofert obok siebie"
                >
                  ⚖️ Porównaj
                  {comparedAdIds.size > 0 && (
                    <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold inline-flex items-center justify-center -mr-0.5">
                      {comparedAdIds.size}
                    </span>
                  )}
                </Button>

                <Button
                  variant={isSplitView ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    triggerHaptic(10);
                    playUiSound('toggle');
                    setIsSplitView(!isSplitView);
                  }}
                  className="hidden lg:inline-flex h-8 px-2.5 rounded-lg text-xs font-bold gap-1 shrink-0 cursor-pointer"
                  title="Przełącz widok podzielony (Lista + Mapa obok siebie)"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>{isSplitView ? 'Pełna lista' : 'Split-View'}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCvGeneratorOpen(true)}
                  className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1 shrink-0 cursor-pointer"
                  title="Generator CV Budowlanego w PDF"
                >
                  📄 CV
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEmployerPortalOpen(true)}
                  className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1 shrink-0 text-primary border-primary/30 bg-primary/5 hover:bg-primary/10 cursor-pointer"
                  title="Panel Pracodawcy i Ogłoszenia B2B"
                >
                  🏢 Panel B2B
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    triggerHaptic(15);
                    const tracked = allAnnouncements.filter((a) => getStatus(a.id) || isFavorite(a.id));
                    const target = tracked.length > 0 ? tracked : listAds;
                    exportApplicationsToCSV(target, (id) => {
                      const s = getStatus(id);
                      return s ? STATUS_META[s].label : isFavorite(id) ? 'Ulubione' : 'Obserwowane';
                    });
                    showToast('success', `Wygenerowano plik CSV (${target.length} ofert)`);
                  }}
                  className="h-8 px-2.5 rounded-lg text-xs font-semibold gap-1 shrink-0 cursor-pointer"
                  title="Pobierz swoje aplikacje i zapisane oferty do pliku CSV"
                >
                  <Download className="w-3 h-3" /> CSV
                </Button>

                <Button
                  variant={viewDensity === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    triggerHaptic(10);
                    playUiSound('toggle');
                    setViewDensity((v) => (v === 'cards' ? 'table' : 'cards'));
                  }}
                  className="hidden md:inline-flex h-8 px-2.5 rounded-lg text-xs font-bold gap-1 shrink-0 cursor-pointer"
                  title="Przełącz widok: Karty Bento ⟷ Kompaktowa Tabela Pro"
                >
                  <span>{viewDensity === 'table' ? '🗂️ Tabela' : '🪞 Karty'}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    triggerHaptic(10);
                    playUiSound('whoosh');
                    setShortcutsModalOpen(true);
                  }}
                  className="hidden lg:inline-flex h-8 px-2 rounded-lg text-xs font-bold gap-1 shrink-0 cursor-pointer"
                  title="Skróty Klawiszowe Desktop Pro (?)"
                >
                  ⌨️ ?
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCommandPaletteOpen(true)}
                  className="h-8 px-2 rounded-lg text-xs font-mono font-bold gap-1 shrink-0"
                  title="Paleta Komend (⌘K / Ctrl+K)"
                >
                  ⌘K
                </Button>
              </div>

              {/* One-tap popular trade searches */}
              <QuickSearchChips value={searchQuery} onChange={setSearchQuery} />

              {/* Market Pulse Bar - Desktop & Tablet */}
              <div className="hidden md:block">
                <MarketPulseBar ads={listAds} totalCount={allAnnouncements.length} />
              </div>

              {/* Expandable Advanced Filters Accordion */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="pt-2 border-t border-border/40 grid grid-cols-2 sm:grid-cols-4 gap-2 overflow-hidden"
                  >
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                        Sortowanie
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="w-full h-8 px-2 text-xs font-semibold rounded-lg border border-input bg-background cursor-pointer"
                      >
                        <option value="match">Dopasowanie</option>
                        <option value="newest">Najnowsze</option>
                        <option value="oldest">Najstarsze</option>
                        <option value="price-asc">Płaca rosnąco</option>
                        <option value="price-desc">Płaca malejąco</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                        Portal źródłowy
                      </label>
                      <select
                        value={filterPortal}
                        onChange={(e) => setFilterPortal(e.target.value)}
                        className="w-full h-8 px-2 text-xs font-semibold rounded-lg border border-input bg-background cursor-pointer"
                      >
                        <option value="all">Wszystkie portale</option>
                        <option value="bip">🏛️ BIP Szczecin (Przetargi)</option>
                        <option value="olx">OLX</option>
                        <option value="pracuj">Pracuj.pl</option>
                        <option value="indeed">Indeed</option>
                        <option value="oferteo">Oferteo</option>
                        <option value="fixly">Fixly</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                        Czas dojazdu (Szczecin)
                      </label>
                      <select
                        value={commuteRadiusKm}
                        onChange={(e) => {
                          triggerHaptic(10);
                          setCommuteRadiusKm(Number(e.target.value));
                        }}
                        className="w-full h-8 px-2 text-xs font-semibold rounded-lg border border-input bg-background cursor-pointer"
                      >
                        <option value={0}>Wszędzie (bez limitu)</option>
                        <option value={5}>max 5 km (~10 min)</option>
                        <option value={10}>max 10 km (~20 min)</option>
                        <option value={15}>max 15 km (~30 min)</option>
                        <option value={25}>max 25 km (~45 min)</option>
                        <option value={50}>max 50 km (region)</option>
                      </select>
                    </div>

                    <div className="flex items-end gap-1.5">
                      <Button
                        variant={showFavoritesOnly ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                        className="h-8 flex-1 text-xs font-bold gap-1"
                      >
                        <Heart className={cn('w-3 h-3', showFavoritesOnly && 'fill-current')} />
                        Ulubione ({favoriteCount})
                      </Button>

                      <Button
                        variant={showTrackedOnly ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShowTrackedOnly(!showTrackedOnly)}
                        className="h-8 flex-1 text-xs font-bold gap-1"
                      >
                        <Briefcase className="w-3 h-3" />
                        Śledzone ({trackedCount})
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Status footer line */}
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground pt-0.5">
                <span>
                  Znaleziono <strong className="text-foreground">{listAds.length}</strong> {listAds.length === 1 ? 'ofertę' : 'ofert'}
                  {isSearching && <span className="ml-1 text-primary font-bold">· fraza: &quot;{searchQuery}&quot;</span>}
                  {isLive && isOnline && <span className="ml-1 text-emerald-500 font-bold">● Na żywo</span>}
                  {isOfflineMode && <span className="ml-1 text-amber-500 font-bold">📴 Pamięć PWA</span>}
                </span>
                {lastScrapedAt && isOnline ? (
                  <span>Odświeżono: {formatTimeAgo(lastScrapedAt)}</span>
                ) : cachedAt ? (
                  <span>Zapis z: {formatTimeAgo(cachedAt)}</span>
                ) : null}
              </div>
            </div>

            {/* Market insights — only on desktop / tablet to keep mobile viewport laser-focused on jobs */}
            {!isSearching && !showFavoritesOnly && !showTrackedOnly && (
              <div className="hidden md:block">
                <MarketStats overview={marketOverview} />
              </div>
            )}

            {/* View Density Mode Rendering (Karty Bento vs Tabela Pro) */}
            {viewDensity === 'table' ? (
              <CompactTableView
                ads={listAds}
                selectedId={selectedId}
                onSelectAd={(id) => {
                  setSelectedId(id);
                  if (isSplitView) handleShowOnMap(id);
                }}
                isFavorite={isFavorite}
                onToggleFavorite={toggleFavorite}
                isCompared={(id) => comparedAdIds.has(id)}
                onToggleCompare={(id) => {
                  setComparedAdIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else {
                      if (next.size >= 3) {
                        showToast('error', 'Możesz porównywać maksymalnie 3 oferty jednocześnie!');
                        return prev;
                      }
                      next.add(id);
                    }
                    return next;
                  });
                }}
                onOpenPitch={(ad) => setSlideOverAd(ad)}
                onQuickView={(ad) => {
                  triggerHaptic(10);
                  playSalaryChime(ad.price);
                  setSlideOverAd(ad);
                }}
              />
            ) : (
              <CollapsibleAnnouncementList
                items={listAds}
                isLoading={scrapeLoading && allAnnouncements.length === 0}
                onRefresh={async () => {
                  triggerHaptic(15);
                  await scrapeNow(undefined, 40);
                }}
                emptyState={
                  <div className="p-8 text-center bg-card/40 rounded-2xl mx-4 my-2 border border-border/50">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                      <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">
                        {searchQuery ? 'Brak wyników dla tego wyszukiwania' : showFavoritesOnly ? 'Brak ulubionych ogłoszeń' : 'Brak ogłoszeń'}
                      </p>
                      {!searchQuery && !showFavoritesOnly && (
                        <Button variant="outline" className="mt-4" onClick={() => scrapeNow(undefined, 40)} disabled={scrapeLoading}>
                          {scrapeLoading ? 'Scrapuję...' : 'Pobierz ogłoszenia'}
                        </Button>
                      )}
                    </motion.div>
                  </div>
                }
                renderItem={(ad, i) => (
                  <div
                    key={ad.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(ad.id, el);
                      else cardRefs.current.delete(ad.id);
                    }}
                  >
                    <AnnouncementCard
                      ad={ad}
                      index={i}
                      isFavorite={isFavorite(ad.id)}
                      isSelected={ad.id === selectedId}
                      isHovered={ad.id === hoveredAnnouncementId}
                      onMouseEnter={() => setHoveredAnnouncementId(ad.id)}
                      onMouseLeave={() => setHoveredAnnouncementId(null)}
                      match={prefsActive ? matchMap.get(ad.id) ?? null : null}
                      status={getStatus(ad.id)}
                      onToggleFavorite={() => {
                        const wasFav = isFavorite(ad.id);
                        toggleFavorite(ad.id);
                        showToast('success', wasFav ? 'Usunięto z ulubionych' : 'Dodano do ulubionych ❤️');
                      }}
                      onShowOnMap={() => handleShowOnMap(ad.id)}
                      onSetStatus={(s) => {
                        setStatus(ad.id, s);
                        showToast('info', `Status: ${STATUS_META[s].label}`);
                      }}
                      onQuickView={() => {
                        triggerHaptic(10);
                        playSalaryChime(ad.price);
                        setSlideOverAd(ad);
                      }}
                      onOpenAiInterview={() => setInterviewModalAd(ad)}
                      onOpenSalaryBenchmark={() => setBenchmarkModalAd(ad)}
                      onOpenTimeline={() => setTimelineAd(ad)}
                      onOpenCalculator={() => setConstructionCalcModalAd(ad)}
                      isCompared={comparedAdIds.has(ad.id)}
                      onToggleCompare={() => {
                        setComparedAdIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(ad.id)) {
                            next.delete(ad.id);
                          } else {
                            if (next.size >= 3) {
                              showToast('error', 'Możesz porównywać maksymalnie 3 oferty jednocześnie!');
                              return prev;
                            }
                            next.add(ad.id);
                          }
                          return next;
                        });
                      }}
                    />
                  </div>
                )}
              />
            )}
            </div>

            {/* 🖥️ Split-View Right Pane: Real-time 3D Map (WebGL GPU Accelerated) */}
            {isSplitView && (
              <div className="hidden lg:block lg:w-[45%] xl:w-[48%] h-[calc(100vh-120px)] sticky top-16 rounded-3xl overflow-hidden border border-border/80 shadow-2xl">
                <MapViewDynamic
                  ads={mapAds}
                  totalCount={allAnnouncements.length}
                  activeCategories={activeCategories}
                  onCategoryChange={setActiveCategories}
                  isFavorite={isFavorite}
                  onToggleFavorite={toggleFavorite}
                  selectedId={selectedId}
                  hoveredId={hoveredAnnouncementId}
                  onMarkerHover={setHoveredAnnouncementId}
                  flyToken={flyToken}
                  onMarkerClick={handleMarkerClick}
                  onShowInList={handleShowInList}
                  onSearchArea={handleSearchArea}
                  homeLat={preferences.homeLat}
                  homeLng={preferences.homeLng}
                  maxDistanceKm={preferences.maxDistanceKm}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Hero landing for first-time guests (rendered AFTER all hooks)
  if (showHero && isGuest) {
    return (
      <Hero onContinue={() => {
        localStorage.setItem('naetacie-hero-dismissed', '1');
        setShowHero(false);
      }} />
    );
  }

  return (
    <>
      <ServiceWorkerRegistration />
      <PwaInstallPrompt />
      {/* 🌅 Real-Time Ambient Solar Glow (Szczecin live solar mesh) */}
      <AmbientSolarGlow />

      {/* 🏝️ Mobile-First Adaptive Dynamic Island (Top Status Capsule) */}
      <DynamicIsland
        isListening={isListening}
        isScraping={scrapeLoading}
        comparedCount={comparedAdIds.size}
        totalOffersCount={filteredAds.length}
        avgSalaryPln={marketOverview.overallAvgSalary || 7850}
        onOpenCompare={() => setCompareModalOpen(true)}
        onStopListening={() => setIsListening(false)}
        onRefresh={() => scrapeNow(undefined, 40)}
      />

      <JobPreferencesPanel
        open={prefsPanelOpen}
        preferences={preferences}
        onClose={() => setPrefsPanelOpen(false)}
        onChange={updatePreferences}
        onReset={resetPreferences}
      />
      <AppShell
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isLive={isLive}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenEstimator={() => {
          triggerHaptic(12);
          setConstructionCalcModalAd(allAnnouncements[0] || ({
            id: 'general-estimator',
            title: 'Wycena prac budowlano-remontowych Szczecin',
            description: 'Szpachlowanie, malowanie, glazura, ścianki GK, hydraulika, elektryka',
            price: 6500,
            location_text: 'Szczecin',
            category: 'remont',
          } as unknown as DisplayAnnouncement));
        }}
        onOpenAiInterview={() => setInterviewModalAd(allAnnouncements[0] || null)}
        onOpenSalaryBenchmark={() => setBenchmarkModalAd(allAnnouncements[0] || null)}
        onOpenCvGenerator={() => setCvGeneratorOpen(true)}
        onOpenEmployerPortal={() => setEmployerPortalOpen(true)}
      >
        {!isOnline && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 px-4 py-2 text-xs font-bold flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span>Brak połączenia z siecią. Przeglądasz zapisane oferty offline.</span>
          </div>
        )}
        <AnimatePresence>
          {isGuest && !bannerDismissed && <GuestBanner onDismiss={() => setBannerDismissed(true)} />}
        </AnimatePresence>
        {renderContent()}
      </AppShell>

      {/* Gross to Net Salary Calculator Modal */}
      <SalaryNetModal
        isOpen={salaryModalOpen}
        initialGross={salaryCalcGross}
        onClose={() => setSalaryModalOpen(false)}
      />

      {/* Side-by-Side Job Comparison Matrix Modal */}
      <JobComparisonModal
        isOpen={compareModalOpen}
        ads={allAnnouncements.filter((a) => comparedAdIds.has(a.id))}
        onClose={() => setCompareModalOpen(false)}
        onRemoveFromComparison={(id: string) => {
          setComparedAdIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }}
      />

      {/* Command Palette Modal (Ctrl+K) */}
      <CommandPaletteModal
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        ads={allAnnouncements}
        onSelectAd={(id) => {
          handleShowOnMap(id);
          const found = allAnnouncements.find((a) => a.id === id);
          if (found) setSlideOverAd(found);
        }}
        onSelectTab={(tab) => handleTabChange(tab)}
        onOpenCalculator={() => {
          setSalaryCalcGross(6000);
          setSalaryModalOpen(true);
        }}
        onOpenCompare={() => setCompareModalOpen(true)}
        onFilterSalaryOnly={() => {
          setActiveTab('list');
          setSearchQuery('zł');
        }}
        onFilterRemoteOnly={() => {
          setActiveTab('list');
          setSearchQuery('zdalna');
        }}
      />

      {/* AI Interview Simulator Modal */}
      <AiInterviewModal
        ad={interviewModalAd}
        isOpen={interviewModalAd !== null}
        onClose={() => setInterviewModalAd(null)}
      />

      {/* Salary Benchmarking Modal */}
      <SalaryBenchmarkingModal
        ad={benchmarkModalAd}
        isOpen={benchmarkModalAd !== null}
        onClose={() => setBenchmarkModalAd(null)}
      />

      {/* PDF CV Generator Modal */}
      <CvGeneratorModal
        isOpen={cvGeneratorOpen}
        onClose={() => setCvGeneratorOpen(false)}
      />

      {/* Employer Portal Modal */}
      <EmployerPortalModal
        isOpen={employerPortalOpen}
        onClose={() => setEmployerPortalOpen(false)}
        onAdCreated={(t) => showToast('success', `Dodano ogłoszenie bezpośrednie: ${t}`)}
      />

      {/* Employer & Crew Review Modal */}
      <EmployerReviewModal
        companyName={reviewModalCompany}
        isOpen={reviewModalCompany !== null}
        onClose={() => setReviewModalCompany(null)}
      />

      {/* Application Timeline & Progress Modal */}
      <ApplicationTimelineModal
        ad={timelineAd}
        trackedApp={timelineAd ? tracked[timelineAd.id] : null}
        isOpen={timelineAd !== null}
        onClose={() => setTimelineAd(null)}
        onSetStatus={(st, note) => {
          if (timelineAd) {
            setStatus(timelineAd.id, st, note);
            showToast('success', `Zmieniono status na: ${STATUS_META[st].label}`);
          }
        }}
      />

      {/* Trade Bid Estimator Modal (Wycena Robocizny) */}
      <TradeBidEstimatorModal
        isOpen={constructionCalcModalAd !== null}
        onClose={() => setConstructionCalcModalAd(null)}
        title={constructionCalcModalAd?.title || 'Wycena prac budowlanych'}
        description={constructionCalcModalAd?.description || ''}
        phone={constructionCalcModalAd?.phone || null}
      />

      {/* Pitch / Application Message Generator Modal */}
      <PitchGeneratorModal
        isOpen={pitchModalAd !== null}
        onClose={() => setPitchModalAd(null)}
        phone={pitchModalAd?.phone || null}
        title={pitchModalAd?.title || 'Zgłoszenie do pracy'}
        location={pitchModalAd?.location_text || 'Szczecin'}
        sourcePortal={pitchModalAd?.source_portal || 'Bezpośrednie'}
        defaultPrice={typeof pitchModalAd?.price === 'number' ? pitchModalAd.price : null}
      />

      {/* Guest prompt modal */}
      <AnimatePresence>
        {guestPrompt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setGuestPrompt(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border"
              onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-semibold text-foreground mb-2">Wymagane logowanie</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {guestPrompt === 'notifications' ? 'Zaloguj się, aby ustawić powiadomienia.' : 'Zaloguj się, aby zarządzać profilem.'}
              </p>
              <div className="space-y-2">
                <Button className="w-full" onClick={() => router.push('/login')}>Zaloguj się</Button>
                <Button variant="ghost" className="w-full" onClick={() => setGuestPrompt(null)}>Kontynuuj przeglądanie</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🌟 Floating Glass Quick Actions Dock */}
      <FloatingDock
        onOpenEstimator={() => setConstructionCalcModalAd({ title: 'Wycena robocizny', price: 6000 } as unknown as DisplayAnnouncement)}
        onOpenAiInterview={() => setInterviewModalAd({ title: 'Rozmowa kwalifikacyjna' } as unknown as DisplayAnnouncement)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onToggleSplitView={() => setIsSplitView(!isSplitView)}
        isSplitView={isSplitView}
        activeTab={activeTab}
        onRefresh={() => {
          scrapeNow();
          showToast('info', 'Odświeżanie najnowszych ofert ze Szczecina...');
        }}
      />



      {/* 📱 Mobile: Drag Bottom Sheet with Snap Points */}
      <AnnouncementMobileDrawer
        announcement={slideOverAd}
        isOpen={!!slideOverAd}
        onClose={() => setSlideOverAd(null)}
        onShowOnMap={() => {
          if (slideOverAd) handleShowOnMap(slideOverAd.id);
        }}
        onOpenTimeline={() => {
          if (slideOverAd) setTimelineAd(slideOverAd);
        }}
      />

      {/* 📑 Desktop & Tablet: Slide-Over Inspector Drawer */}
      <div className="hidden md:block">
        <AnnouncementSlideOver
          announcement={slideOverAd}
          isOpen={!!slideOverAd}
          onClose={() => setSlideOverAd(null)}
          onShowOnMap={() => {
            if (slideOverAd) handleShowOnMap(slideOverAd.id);
          }}
          onOpenTimeline={() => {
            if (slideOverAd) setTimelineAd(slideOverAd);
          }}
        />
      </div>

      {/* ⚖️ Desktop: Floating Compare Shelf Dock */}
      <CompareShelfDock
        comparedAds={comparedAdsList}
        onRemoveAd={(id) => {
          setComparedAdIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }}
        onClearAll={() => setComparedAdIds(new Set())}
        onOpenCompareModal={() => setCompareModalOpen(true)}
      />

      {/* ⌨️ Desktop Pro: Keyboard Shortcuts Cheat Sheet Modal */}
      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {/* 👑 B2B Monetization & Instant BLIK Payments Modal */}
      <ProTierModal
        isOpen={proTierModalOpen}
        onClose={() => setProTierModalOpen(false)}
      />

      {/* ⚙️ Pełne Ustawienia Aplikacji Modal */}
      <AppSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}

// --- Helpers ---

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'teraz';
  if (minutes < 60) return `${minutes} min temu`;
  if (hours < 24) return `${hours}h temu`;
  if (days < 7) return `${days}d temu`;
  return date.toLocaleDateString('pl-PL');
}

function extractNumPrice(price: string | number | null): number | null {
  if (price === null) return null;
  if (typeof price === 'number') return price;
  const match = price.replace(/\s/g, '').match(/(\d+(?:[.,]\d+)?)/);
  return match ? parseFloat(match[1].replace(',', '.')) : null;
}
