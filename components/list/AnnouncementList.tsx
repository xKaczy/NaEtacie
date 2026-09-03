'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/lib/auth/AuthContext';
import ListSkeleton from '@/components/feedback/ListSkeleton';
import type { MaskedAnnouncement } from '@/lib/types/announcement';
import type { PaginatedResponse } from '@/lib/types/api';

import { getAnnouncementExternalUrl, triggerHaptic } from '@/lib/utils';
import { OlxLinkActions } from '@/components/olx/OlxLinkActions';
import { Phone, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react';

export interface AnnouncementListProps {
  onItemClick?: (id: string) => void;
}

/**
 * Format price for display in list cards.
 * Returns "N/A" when price is null.
 */
function formatPrice(price: number | null): string {
  if (price === null) {
    return 'Wycena';
  }
  return `${price.toLocaleString('pl-PL')} zł`;
}

/**
 * Format scraped_at as a Polish relative time string (e.g., "2 godz. temu", "3 dni temu").
 */
function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return 'przed chwilą';
  if (diffMin < 60) return `${diffMin} min temu`;
  if (diffHr < 24) return `${diffHr} godz. temu`;
  if (diffDay === 1) return 'wczoraj';
  if (diffDay < 7) return `${diffDay} dni temu`;
  if (diffWeek < 4) return `${diffWeek} tyg. temu`;
  return d.toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' });
}

/**
 * Get display label for source portal badge.
 */
function getPortalLabel(portal: string): string {
  const p = (portal || '').toLowerCase();
  switch (p) {
    case 'olx':
      return 'OLX';
    case 'oferteo':
      return 'Oferteo';
    case 'fixly':
      return 'Fixly';
    case 'pracuj':
      return 'Pracuj.pl';
    case 'indeed':
      return 'Indeed';
    case 'jooble':
      return 'Jooble';
    case 'gowork':
      return 'GoWork';
    case 'bip_szczecin':
      return 'BIP Szczecin';
    default:
      return portal;
  }
}

/** Map pin icon SVG rendered inline at 14px. */
function MapPinIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

/**
 * Stagger delay computation for card entrance animation.
 * Each card is delayed by index * 50ms.
 */
export function computeStaggerDelay(index: number): number {
  return index * 50;
}

/**
 * Card entrance animation variants for Framer Motion.
 */
const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: computeStaggerDelay(index) / 1000,
      duration: 0.3,
      ease: 'easeOut' as const,
    },
  }),
};

/**
 * Reduced motion variants — no animation, instant appearance.
 */
const reducedMotionVariants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
} as const;

/**
 * AnnouncementList component displaying announcement cards with infinite scroll.
 * Fetches from /api/announcements?page=N&limit=20, sorted by scraped_at descending.
 * Uses Intersection Observer to detect when the user scrolls to the bottom.
 *
 * Card design per Requirement 11.1-11.4:
 * - Title (bold, 16-18px)
 * - Location (14px, map pin icon)
 * - Price (semi-bold, 16px, accent color)
 * - Source portal badge (chip)
 * - scraped_at relative time (12px, muted)
 *
 * Supports guest mode: when unauthenticated, fetches without Bearer token.
 * The API returns free-tier masked data for guest requests (Requirement 1.1, 1.6).
 */
export default function AnnouncementList({ onItemClick }: AnnouncementListProps) {
  const { isGuest, refreshToken } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const [announcements, setAnnouncements] = useState<MaskedAnnouncement[]>([]);
  const [, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isLoadingRef = useRef(false);

  const fetchAnnouncements = useCallback(async (pageNum: number) => {
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {};

      // Only attach Authorization header for authenticated users
      if (!isGuest) {
        const token = await refreshToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const response = await fetch(`/api/announcements?page=${pageNum}&limit=20`, {
        headers,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error || `Request failed with status ${response.status}`);
        setIsLoading(false);
        isLoadingRef.current = false;
        return;
      }

      const result: PaginatedResponse<MaskedAnnouncement> = await response.json();

      if (result.data.length === 0) {
        setHasMore(false);
      } else {
        setAnnouncements((prev) => [...prev, ...result.data]);
        // Check if we've reached the end
        if (pageNum >= result.metadata.total_pages) {
          setHasMore(false);
        }
      }
    } catch (err) {
      setError('Failed to load announcements');
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [isGuest, refreshToken]);

  // Initial load
  useEffect(() => {
    fetchAnnouncements(1);
  }, [fetchAnnouncements]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !isLoadingRef.current) {
          setPage((prev) => {
            const nextPage = prev + 1;
            fetchAnnouncements(nextPage);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [hasMore, fetchAnnouncements]);

  const variants = prefersReducedMotion ? reducedMotionVariants : cardVariants;

  const [activeFilter, setActiveFilter] = useState<'all' | 'cito' | 'salary' | 'budowa' | 'wykończenia' | 'instalacje'>('all');

  const filteredAnnouncements = announcements.filter((ad) => {
    if (activeFilter === 'cito') {
      return /cito|piln|od zaraz|natychmiast/i.test(ad.title || '');
    }
    if (activeFilter === 'salary') {
      return ad.price != null && ad.price > 0;
    }
    if (activeFilter === 'budowa' || activeFilter === 'wykończenia' || activeFilter === 'instalacje') {
      return (ad.category || '').toLowerCase().includes(activeFilter);
    }
    return true;
  });

  return (
    <div className="announcement-list">
      {/* Quick Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-0.5 select-none -mx-1 px-1">
        {[
          { id: 'all', label: 'Wszystkie', icon: '📋' },
          { id: 'cito', label: 'CITO / Pilne', icon: '⚡' },
          { id: 'salary', label: 'Ze stawką', icon: '💰' },
          { id: 'wykończenia', label: 'Wykończenia', icon: '🎨' },
          { id: 'instalacje', label: 'Instalacje', icon: '🔧' },
          { id: 'budowa', label: 'Stan surowy', icon: '🏗️' },
        ].map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setActiveFilter(chip.id as any)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
              activeFilter === chip.id
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50'
            }`}
          >
            <span>{chip.icon}</span>
            <span>{chip.label}</span>
          </button>
        ))}
      </div>

      {/* Guest mode banner (Requirement 1.4) */}
      {isGuest && announcements.length > 0 && (
        <div className="announcement-list__guest-banner bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-semibold rounded-xl p-2.5 text-center flex items-center justify-center gap-2" role="status">
          <span>🔒 Tryb gościa: zaloguj się bezpłatnie, aby odkryć bezpośrednie numery telefonów do inwestorów i majstrów.</span>
        </div>
      )}

      {filteredAnnouncements.map((announcement, index) => {
        const portalLabel = getPortalLabel(announcement.source_portal);
        const directOfferUrl = getAnnouncementExternalUrl(announcement);

        return (
          <motion.div
            key={announcement.deduplication_key}
            className="announcement-card group"
            custom={index}
            initial="hidden"
            animate="visible"
            variants={variants}
            onClick={() => onItemClick?.(announcement.deduplication_key)}
          >
            {/* Header: title + portal badge */}
            <div className="announcement-card__header">
              <h3 className="announcement-card__title group-hover:text-primary transition-colors">{announcement.title}</h3>
              <span className="announcement-card__badge">
                {portalLabel}
              </span>
            </div>

            {/* Location with map pin icon + New / 24h Badge */}
            <div className="announcement-card__location flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                <MapPinIcon />
                <span className="truncate">{announcement.location_text}</span>
              </div>
              {/* Radar 24h tag */}
              {(() => {
                const isRecent = (() => {
                  if (!announcement.scraped_at) return false;
                  const d = typeof announcement.scraped_at === 'string' ? new Date(announcement.scraped_at) : announcement.scraped_at;
                  return (Date.now() - d.getTime()) < 24 * 3600 * 1000;
                })();
                return isRecent ? (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                    <Sparkles className="w-2.5 h-2.5 animate-pulse" /> NOWE 24H
                  </span>
                ) : null;
              })()}
            </div>

            {/* Footer: price + relative time + direct Call / SMS + open button */}
            <div className="announcement-card__footer flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
              <div className="flex items-center gap-2">
                <span className="announcement-card__price font-bold text-emerald-600 dark:text-emerald-400">
                  {formatPrice(announcement.price)}
                </span>
                <time
                  className="announcement-card__time text-xs text-muted-foreground"
                  dateTime={
                    typeof announcement.scraped_at === 'string'
                      ? announcement.scraped_at
                      : announcement.scraped_at.toISOString()
                  }
                >
                  {formatRelativeTime(announcement.scraped_at)}
                </time>
              </div>

              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                {/* One-Tap Phone Dial */}
                {announcement.contact_info && /^\+?\d[\d\s-]{7,}\d$/.test(announcement.contact_info.trim()) && (
                  <a
                    href={`tel:${announcement.contact_info.replace(/\s+/g, '')}`}
                    onClick={() => triggerHaptic(12)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all shadow-2xs"
                    title={`Zadzwoń: ${announcement.contact_info}`}
                  >
                    <Phone className="w-3 h-3" />
                    <span className="hidden sm:inline">Zadzwoń</span>
                  </a>
                )}

                {/* One-Tap SMS Pitch */}
                {announcement.contact_info && /^\+?\d[\d\s-]{7,}\d$/.test(announcement.contact_info.trim()) && (
                  <a
                    href={`sms:${announcement.contact_info.replace(/\s+/g, '')}?body=${encodeURIComponent(
                      `Dzień dobry! Piszę w sprawie ogłoszenia: "${announcement.title.slice(0, 45)}" z serwisu NaEtacie. Jestem dyspozycyjny i zainteresowany zleceniem. Proszę o kontakt.`
                    )}`}
                    onClick={() => triggerHaptic(12)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all shadow-2xs"
                    title="Napisz szybki SMS ze zgłoszeniem"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>SMS</span>
                  </a>
                )}

                <OlxLinkActions
                  ad={{
                    id: announcement.id || announcement.deduplication_key,
                    deduplication_key: announcement.deduplication_key,
                    title: announcement.title,
                    source_url: announcement.source_url,
                    source_portal: announcement.source_portal,
                    category: announcement.category,
                  }}
                  variant="default"
                  size="sm"
                  showMenu={false}
                />
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Loading skeleton placeholder (Requirement 12.1) */}
      {isLoading && <ListSkeleton />}

      {/* End of list message */}
      {!hasMore && announcements.length > 0 && !isLoading && (
        <div className="announcement-list__end text-center text-xs text-muted-foreground py-4 font-medium" aria-live="polite">
          To już wszystkie ogłoszenia w tym widoku
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="announcement-list__error text-center text-xs text-rose-500 py-4 font-semibold" role="alert">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filteredAnnouncements.length === 0 && (
        <div className="announcement-list__empty text-center text-xs text-muted-foreground py-8 font-medium">
          Brak ofert w wybranej kategorii
        </div>
      )}

      {/* Sentinel element for Intersection Observer */}
      {hasMore && <div ref={sentinelRef} className="announcement-list__sentinel" />}

      <style>{`
        .announcement-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-3, 12px);
          padding: var(--spacing-4, 16px);
        }

        .announcement-list__guest-banner {
          padding: var(--spacing-2, 8px) var(--spacing-4, 16px);
          background: var(--color-primary, #2563eb);
          color: var(--color-text-inverse, #ffffff);
          border-radius: var(--radius-md, 8px);
          font-size: var(--font-size-caption, 12px);
          text-align: center;
        }

        .announcement-card {
          content-visibility: auto;
          contain-intrinsic-size: 140px;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-2, 8px);
          padding: var(--spacing-4, 16px);
          border-radius: 14px;
          background: var(--color-surface, #ffffff);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: none;
          text-align: left;
          cursor: pointer;
          font-family: var(--font-family);
          width: 100%;
          transition: box-shadow var(--transition-fast, 150ms ease);
          -webkit-tap-highlight-color: transparent;
        }

        .announcement-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .announcement-card:focus-visible {
          outline: 2px solid var(--color-primary, #2563eb);
          outline-offset: 2px;
        }

        .announcement-card__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--spacing-2, 8px);
        }

        .announcement-card__title {
          margin: 0;
          font-size: var(--font-size-body, 16px);
          font-weight: var(--font-weight-bold, 700);
          color: var(--color-text-primary);
          line-height: var(--line-height, 1.5);
          flex: 1;
          /* Limit to 2 lines */
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .announcement-card__badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: var(--radius-full, 9999px);
          font-size: var(--font-size-caption, 12px);
          font-weight: var(--font-weight-medium, 500);
          background: var(--color-surface-raised, #f9fafb);
          color: var(--color-text-secondary, #4b5563);
          border: 1px solid var(--color-border, #e5e7eb);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .announcement-card__location {
          display: flex;
          align-items: center;
          gap: var(--spacing-1, 4px);
          font-size: var(--font-size-body-sm, 14px);
          font-weight: var(--font-weight-normal, 400);
          color: var(--color-text-secondary);
          line-height: var(--line-height, 1.5);
        }

        .announcement-card__footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: var(--spacing-1, 4px);
        }

        .announcement-card__price {
          font-size: var(--font-size-body, 16px);
          font-weight: var(--font-weight-semibold, 600);
          color: var(--color-primary, #2563eb);
        }

        .announcement-card__time {
          font-size: var(--font-size-caption, 12px);
          font-weight: var(--font-weight-normal, 400);
          color: var(--color-text-disabled, #9ca3af);
        }

        .announcement-list__end {
          padding: var(--spacing-4, 16px);
          text-align: center;
          font-size: var(--font-size-body-sm, 14px);
          color: var(--color-text-disabled, #9ca3af);
        }

        .announcement-list__error {
          padding: var(--spacing-4, 16px);
          text-align: center;
          font-size: var(--font-size-body-sm, 14px);
          color: var(--color-error, #dc2626);
          background: rgba(220, 38, 38, 0.05);
          border-radius: var(--radius-md, 8px);
        }

        .announcement-list__empty {
          padding: var(--spacing-12, 48px) var(--spacing-4, 16px);
          text-align: center;
          font-size: var(--font-size-body-sm, 14px);
          color: var(--color-text-disabled, #9ca3af);
        }

        .announcement-list__sentinel {
          height: 1px;
        }

        @media (prefers-reduced-motion: reduce) {
          .announcement-card {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
