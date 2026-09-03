import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSeoPageBySlug, ALL_SEO_PAGES } from '@/lib/seo/seoPagesConfig';
import { SEED_DATA } from '@/lib/data/announcements';
import { MapPin, ArrowLeft, Briefcase, Phone, Clock, ExternalLink } from 'lucide-react';

interface Props {
  params: {
    slug: string;
  };
}

export function generateStaticParams() {
  return ALL_SEO_PAGES.map((page) => ({
    slug: page.slug,
  }));
}

export function generateMetadata({ params }: Props): Metadata {
  const page = getSeoPageBySlug(params.slug);
  if (!page) return { title: 'Nie znaleziono – NaEtacie Szczecin' };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://naetacie.pl';

  return {
    title: page.title,
    description: page.metaDescription,
    alternates: {
      canonical: `${baseUrl}/praca/${page.slug}`,
    },
    openGraph: {
      title: page.title,
      description: page.metaDescription,
      url: `${baseUrl}/praca/${page.slug}`,
      siteName: 'NaEtacie Szczecin',
      locale: 'pl_PL',
      type: 'website',
    },
  };
}

export default function SeoLandingPage({ params }: Props) {
  const page = getSeoPageBySlug(params.slug);
  if (!page) notFound();

  // Filter matching seed offers
  const matchingOffers = SEED_DATA.filter((offer) => {
    const textToMatch = `${offer.title} ${offer.description} ${offer.location_text}`.toLowerCase();
    return page.keywords.some((k) => textToMatch.includes(k.toLowerCase()));
  }).slice(0, 10);

  const offersToDisplay = matchingOffers.length > 0 ? matchingOffers : SEED_DATA.slice(0, 6);

  return (
    <main className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors py-2 px-3 rounded-lg hover:bg-accent border border-border/40"
        >
          <ArrowLeft className="w-4 h-4" />
          Wróć do interaktywnej mapy Szczecina
        </Link>
      </div>

      <header className="mb-10 p-6 rounded-2xl bg-card border border-border/60 shadow-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 mb-3">
          <MapPin className="w-3.5 h-3.5" />
          <span>Szczecin & Aglomeracja • Rynek Budowlany 2026</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">
          {page.h1}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          {page.leadParagraph}
        </p>
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-emerald-500" />
            Aktualne ogłoszenia ({offersToDisplay.length})
          </h2>
          <span className="text-xs text-muted-foreground">Aktualizowane codziennie o 6:00</span>
        </div>

        <div className="grid gap-3">
          {offersToDisplay.map((ad) => (
            <div
              key={ad.id}
              className="p-4 rounded-xl bg-card border border-border/60 hover:border-primary/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0">
                <h3 className="font-bold text-sm sm:text-base text-foreground leading-snug">
                  {ad.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    {ad.location_text}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    {ad.posted_days_ago ? `${ad.posted_days_ago} dni temu` : 'Dzisiaj'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                  {typeof ad.price === 'number' ? `${ad.price} zł` : ad.price || 'Stawka do uzg.'}
                </span>

                {ad.phone ? (
                  <a
                    href={`tel:${ad.phone}`}
                    className="flex items-center gap-1.5 py-1.5 px-3 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Zadzwoń
                  </a>
                ) : (
                  <Link
                    href="/"
                    className="flex items-center gap-1.5 py-1.5 px-3 bg-accent hover:bg-accent/80 text-foreground font-bold text-xs rounded-lg transition-colors border border-border/60"
                  >
                    Zobacz na mapie
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
