'use client';

import React, { useState } from 'react';
import type { MaskedAnnouncement } from '@/lib/types/announcement';
import { getAnnouncementExternalUrl, triggerHaptic } from '@/lib/utils';
import { detectJobUrgency } from '@/lib/urgent/urgentJobDetector';
import { evaluateEmployerTrust } from '@/lib/safety/employerTrustEvaluator';
import { UrgentBadge } from '@/components/announcements/UrgentBadge';
import { EmployerTrustBadge } from '@/components/safety/EmployerTrustBadge';
import { VoiceSummaryButton } from '@/components/voice/VoiceSummaryButton';
import { TradeBidEstimatorModal } from '@/components/announcements/TradeBidEstimatorModal';
import { PitchGeneratorModal } from '@/components/contact/PitchGeneratorModal';
import { Calculator, MessageSquare } from 'lucide-react';

export interface AnnouncementDetailProps {
  announcement: MaskedAnnouncement | null;
  tier: 'free' | 'premium';
  onUpgradeClick?: () => void;
}

/**
 * Format price for display.
 * Returns "Price not listed" when price is null.
 */
function formatPrice(price: number | null): string {
  if (price === null) {
    return 'Price not listed';
  }
  return `${price.toLocaleString('pl-PL')} PLN`;
}

/**
 * Format a date for display.
 */
function formatDate(date: Date | string | null): string {
  if (date === null) {
    return '—';
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get display label for source portal.
 */
function getPortalLabel(portal: string): string {
  switch (portal) {
    case 'olx':
      return 'OLX';
    case 'oferteo':
      return 'Oferteo';
    case 'fixly':
      return 'Fixly';
    default:
      return portal;
  }
}

/**
 * AnnouncementDetail component showing all accessible fields per user tier.
 */
export default function AnnouncementDetail({
  announcement,
  tier,
  onUpgradeClick,
}: AnnouncementDetailProps) {
  const [estimatorOpen, setEstimatorOpen] = useState(false);
  const [pitchOpen, setPitchOpen] = useState(false);

  if (!announcement) {
    return (
      <div className="announcement-detail__empty" role="status">
        No announcement to display
      </div>
    );
  }

  const isFree = tier === 'free';
  const urgency = detectJobUrgency(announcement.title, announcement.description);
  const trustReport = evaluateEmployerTrust({
    company: 'company' in announcement ? ((announcement as unknown as Record<string, unknown>).company as string | null) : null,
    phone: announcement.contact_info,
    sourcePortal: announcement.source_portal,
    descriptionLength: announcement.description.length,
  });

  return (
    <article className="announcement-detail space-y-3" aria-label={`Details for ${announcement.title}`}>
      {/* Top Badges Header */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <UrgentBadge urgency={urgency} />
        <EmployerTrustBadge report={trustReport} />
        <VoiceSummaryButton
          data={{
            title: announcement.title,
            location: announcement.location_text,
            price: announcement.price,
            phone: announcement.contact_info,
          }}
        />
      </div>

      <header className="announcement-detail__header">
        <h2 className="announcement-detail__title">{announcement.title}</h2>
        <span className="announcement-detail__portal">
          {getPortalLabel(announcement.source_portal)}
        </span>
      </header>

      {/* 1-Tap Trade Bid Estimator Callout */}
      <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between gap-2">
        <div className="text-xs">
          <span className="font-bold text-foreground block">Wycena Robocizny Szczecin 2026</span>
          <span className="text-[11px] text-muted-foreground">Oblicz sugerowaną stawkę i wyślij gotową ofertę</span>
        </div>
        <button
          type="button"
          onClick={() => setEstimatorOpen(true)}
          className="flex items-center gap-1.5 py-1.5 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer"
        >
          <Calculator className="w-3.5 h-3.5" />
          Kalkulator
        </button>
      </div>

      <section className="announcement-detail__section">
        <h3 className="announcement-detail__section-title">Opis zlecenia</h3>
        <p className="announcement-detail__description text-sm leading-relaxed whitespace-pre-line p-3.5 rounded-xl bg-card border border-border/60">
          {announcement.description}
        </p>
      </section>

      <section className="announcement-detail__section">
        <h3 className="announcement-detail__section-title">Parametry oferty</h3>
        <dl className="announcement-detail__fields">
          <div className="announcement-detail__field">
            <dt>Lokalizacja</dt>
            <dd className="font-semibold text-foreground">📍 {announcement.location_text}</dd>
          </div>

          <div className="announcement-detail__field">
            <dt>Kategoria</dt>
            <dd className="font-semibold text-foreground capitalize">🛠️ {announcement.category}</dd>
          </div>

          <div className="announcement-detail__field">
            <dt>Wynagrodzenie</dt>
            <dd className="font-bold text-emerald-600 dark:text-emerald-400">💰 {formatPrice(announcement.price)}</dd>
          </div>

          <div className="announcement-detail__field">
            <dt>Data pobrania</dt>
            <dd>
              <time
                dateTime={
                  typeof announcement.scraped_at === 'string'
                    ? announcement.scraped_at
                    : announcement.scraped_at.toISOString()
                }
              >
                {formatDate(announcement.scraped_at)}
              </time>
            </dd>
          </div>

          <div className="announcement-detail__field">
            <dt>Data ogłoszenia</dt>
            <dd>{formatDate(announcement.published_at)}</dd>
          </div>

          {/* Source URL - masked for free tier */}
          <div className="announcement-detail__field">
            <dt>Źródło</dt>
            <dd>
              {isFree || announcement.source_url === undefined ? (
                <span className="announcement-detail__locked">
                  <span aria-hidden="true">🔒</span>
                  <button
                    type="button"
                    className="announcement-detail__upgrade-btn"
                    onClick={onUpgradeClick}
                    aria-label="Odblokuj w wersji Premium"
                  >
                    Odblokuj w Premium
                  </button>
                </span>
              ) : (
                <a
                  href={getAnnouncementExternalUrl(announcement)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="announcement-detail__link text-primary font-bold hover:underline"
                >
                  {announcement.source_url || getAnnouncementExternalUrl(announcement)}
                </a>
              )}
            </dd>
          </div>

          {/* Contact info - masked for free tier */}
          <div className="announcement-detail__field">
            <dt>Kontakt</dt>
            <dd>
              {isFree || announcement.contact_info === undefined ? (
                <span className="announcement-detail__locked">
                  <span aria-hidden="true">🔒</span>
                  <button
                    type="button"
                    className="announcement-detail__upgrade-btn"
                    onClick={onUpgradeClick}
                    aria-label="Odblokuj kontakt w wersji Premium"
                  >
                    Odblokuj kontakt
                  </button>
                </span>
              ) : announcement.contact_info !== null ? (
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`tel:${announcement.contact_info.replace(/\s+/g, '')}`}
                    onClick={() => triggerHaptic(15)}
                    className="inline-flex items-center gap-1.5 py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer min-h-[44px]"
                    title={`Zadzwoń do majstra: ${announcement.contact_info}`}
                  >
                    <span>📞 Zadzwoń: {announcement.contact_info}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(10);
                      setPitchOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 py-2 px-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-xl border border-blue-500/20 transition-all cursor-pointer shadow-2xs min-h-[44px]"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Gotowe zgłoszenie SMS / WhatsApp</span>
                  </button>
                </div>
              ) : (
                <span className="text-muted-foreground">Brak numeru telefonu</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <TradeBidEstimatorModal
        isOpen={estimatorOpen}
        onClose={() => setEstimatorOpen(false)}
        title={announcement.title}
        description={announcement.description}
        phone={announcement.contact_info}
        locationText={announcement.location_text}
        companyName={announcement.company}
      />

      <PitchGeneratorModal
        isOpen={pitchOpen}
        onClose={() => setPitchOpen(false)}
        phone={announcement.contact_info}
        title={announcement.title}
        location={announcement.location_text}
        sourcePortal={announcement.source_portal}
        defaultPrice={typeof announcement.price === 'number' ? announcement.price : null}
      />
    </article>
  );
}
