/**
 * Master Multi-Portal Scraper Engine for Job Announcements 2.0.
 *
 * Enterprise Orchestrator:
 * - Supports OLX, Pracuj.pl, Indeed, Jooble, GoWork, Oferteo, and Fixly.
 * - Strategy/Plugin Registry Pattern with per-portal circuit breaker & timeout bounds.
 * - Cross-portal entity resolution & fuzzy deduplication.
 * - Zero-latency NLP trait extraction, equipment detection & anti-fraud analysis.
 * - Szczecin micro-district geocoding & market benchmark evaluation.
 * - Resilient Firestore persistence & run logging.
 */

import { ScrapedAd, PortalScraperResult, SourcePortal, PortalScraperOptions } from './types';
import { scrapeOlx } from './olxScraper';
import { scrapePracuj } from './pracujScraper';
import { scrapeIndeed } from './indeedScraper';
import { scrapeJooble } from './joobleScraper';
import { scrapeGoWork } from './goworkScraper';
import { scrapeOferteoWithFirecrawl } from './firecrawl/firecrawlScraper';
import { scrapeFixlyWithFirecrawl } from './firecrawl/firecrawlScraper';
import { scrapeBipSzczecin } from './portals/bipSzczecinScraper';
import { deduplicateCrossPortalAds, MergedScrapedAd } from '@/lib/deduplication/crossPortalDeduplicator';
import { extractJobTraits, ExtractedJobTraits } from '@/lib/ai/freeJobExtractor';
import { evaluateMarketSalary, MarketEvaluation } from '@/lib/stats/marketBenchmarks';
import { classifyEmployer } from '@/lib/ai/employerClassifier';
import { parseConstructionRate } from '@/lib/calculator/constructionRatesParser';
import { cleanCanonicalUrl } from './canonicalUrlCleaner';
import { resolveSzczecinMicroDistrict } from '@/lib/geo/szczecinMicroDistricts';
import { adminFirestore } from '@/lib/firebase/admin';
import { filterAndAddAvailableOffers } from '@/lib/verification/offerAvailability';
import { generateRunId, logScraperRun, type PortalRunResult } from './runLogger';
import { getPortalCircuitBreaker } from './circuitBreaker';
import { jitteredPosition } from '@/lib/geo/jitter';

export interface EnrichedScrapedAd extends MergedScrapedAd {
  traits: ExtractedJobTraits;
  market_evaluation: MarketEvaluation;
}

/** Comprehensive coordinates lookup table for Szczecin districts, osiedla, and surrounding towns. */
export const LOCATION_COORDINATES: Record<string, { lat: number; lon: number }> = {
  gumieńce: { lat: 53.3973, lon: 14.5064 },
  gumience: { lat: 53.3973, lon: 14.5064 },
  prawobrzeże: { lat: 53.409, lon: 14.6133 },
  prawobrzeze: { lat: 53.409, lon: 14.6133 },
  dąbie: { lat: 53.4539, lon: 14.5281 },
  dabie: { lat: 53.4539, lon: 14.5281 },
  pogodno: { lat: 53.437, lon: 14.521 },
  niebuszewo: { lat: 53.4468, lon: 14.5622 },
  centrum: { lat: 53.4285, lon: 14.5528 },
  śródmieście: { lat: 53.4285, lon: 14.5528 },
  srodmiescie: { lat: 53.4285, lon: 14.5528 },
  bezrzecze: { lat: 53.3683, lon: 14.5789 },
  załom: { lat: 53.3932, lon: 14.6488 },
  zalom: { lat: 53.3932, lon: 14.6488 },
  warszewo: { lat: 53.465, lon: 14.545 },
  pomorzany: { lat: 53.402, lon: 14.532 },
  żelechowa: { lat: 53.456, lon: 14.572 },
  zelechowa: { lat: 53.456, lon: 14.572 },
  krzekowo: { lat: 53.442, lon: 14.492 },
  stołczyn: { lat: 53.492, lon: 14.598 },
  stolczyn: { lat: 53.492, lon: 14.598 },
  skolwin: { lat: 53.522, lon: 14.618 },
  bukowo: { lat: 53.475, lon: 14.568 },
  bukowe: { lat: 53.376, lon: 14.648 },
  majowe: { lat: 53.385, lon: 14.652 },
  słoneczne: { lat: 53.382, lon: 14.636 },
  sloneczne: { lat: 53.382, lon: 14.636 },
  kijewo: { lat: 53.388, lon: 14.672 },
  zdroje: { lat: 53.382, lon: 14.615 },
  podjuchy: { lat: 53.365, lon: 14.595 },
  golęcin: { lat: 53.468, lon: 14.588 },
  golecin: { lat: 53.468, lon: 14.588 },
  drzetowo: { lat: 53.452, lon: 14.568 },
  osów: { lat: 53.472, lon: 14.512 },
  osow: { lat: 53.472, lon: 14.512 },
  głębokie: { lat: 53.475, lon: 14.485 },
  glebokie: { lat: 53.475, lon: 14.485 },
  świerczewo: { lat: 53.408, lon: 14.518 },
  swierczewo: { lat: 53.408, lon: 14.518 },
  turzyn: { lat: 53.425, lon: 14.532 },
  zawadzkiego: { lat: 53.452, lon: 14.502 },
  łasztownia: { lat: 53.4241, lon: 14.5612 },
  lasztownia: { lat: 53.4241, lon: 14.5612 },
  mierzyn: { lat: 53.421, lon: 14.462 },
  dobra: { lat: 53.488, lon: 14.385 },
  przecław: { lat: 53.372, lon: 14.468 },
  przeclaw: { lat: 53.372, lon: 14.468 },
  warzymice: { lat: 53.375, lon: 14.482 },
  wołczkowo: { lat: 53.465, lon: 14.455 },
  wolczkowo: { lat: 53.465, lon: 14.455 },
  kołbaskowo: { lat: 53.332, lon: 14.442 },
  kolbaskowo: { lat: 53.332, lon: 14.442 },
  police: { lat: 53.5513, lon: 14.5692 },
  goleniów: { lat: 53.564, lon: 14.8298 },
  goleniow: { lat: 53.564, lon: 14.8298 },
  stargard: { lat: 53.3362, lon: 15.05 },
  gryfino: { lat: 53.2538, lon: 14.4889 },
  nowogard: { lat: 53.6667, lon: 15.1167 },
  szczecin: { lat: 53.4285, lon: 14.5528 },
};

export function enrichCoordinates(ad: ScrapedAd): ScrapedAd {
  let baseLat = ad.latitude;
  let baseLng = ad.longitude;

  if (baseLat == null || baseLng == null) {
    const locLower = (ad.location_text || '').toLowerCase();
    let matched = false;
    for (const [key, coords] of Object.entries(LOCATION_COORDINATES)) {
      if (locLower.includes(key)) {
        baseLat = coords.lat;
        baseLng = coords.lon;
        matched = true;
        break;
      }
    }
    if (!matched) {
      baseLat = 53.4285;
      baseLng = 14.5528;
    }
  }

  const finalLat = baseLat ?? 53.4285;
  const finalLng = baseLng ?? 14.5528;

  // Apply stable golden-angle jitter (~240m radius) so markers in same district or center spread across streets
  const [jitteredLat, jitteredLng] = jitteredPosition(finalLat, finalLng, ad.id, 240);

  return {
    ...ad,
    latitude: jitteredLat,
    longitude: jitteredLng,
  };
}

export type SupportedPortal = SourcePortal;

export interface MultiPortalScrapeOptions {
  query?: string;
  limit?: number;
  portals?: SupportedPortal[];
  timeoutPerPortalMs?: number;
}

export interface MultiPortalScrapeResponse {
  success: boolean;
  data: EnrichedScrapedAd[];
  metadata: {
    totalScraped: number;
    storedInFirestore: number;
    rejectedUnavailableCount?: number;
    scrapedAt: string;
    breakdown: Record<string, number>;
    queries: string[];
  };
}

/** Registry of active scrapers by portal ID */
const SCRAPER_REGISTRY: Record<
  SupportedPortal,
  (opts: PortalScraperOptions) => Promise<ScrapedAd[]>
> = {
  olx: scrapeOlx,
  pracuj: scrapePracuj,
  indeed: scrapeIndeed,
  jooble: scrapeJooble,
  gowork: scrapeGoWork,
  oferteo: scrapeOferteoWithFirecrawl,
  fixly: scrapeFixlyWithFirecrawl,
  bip_szczecin: scrapeBipSzczecin,
  facebook_group: scrapeBipSzczecin,
};

/**
 * Runs scraper for a single portal wrapped in Circuit Breaker and Timeout guard.
 */
async function executePortalScraper(
  portal: SupportedPortal,
  options: PortalScraperOptions,
  timeoutMs = 8000
): Promise<PortalScraperResult> {
  const breaker = getPortalCircuitBreaker(portal);
  const start = Date.now();

  if (!breaker.isAvailable()) {
    return {
      portal,
      ads: [],
      error: `Circuit breaker OPEN for ${portal}`,
      durationMs: 0,
    };
  }

  try {
    const scraperFn = SCRAPER_REGISTRY[portal];
    if (!scraperFn) {
      throw new Error(`No registered scraper for portal: ${portal}`);
    }

    const scrapePromise = scraperFn(options);
    const timeoutPromise = new Promise<ScrapedAd[]>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout of ${timeoutMs}ms exceeded for ${portal}`)), timeoutMs)
    );

    const ads = await Promise.race([scrapePromise, timeoutPromise]);
    breaker.recordSuccess();

    return {
      portal,
      ads,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const errorMsg = (err as Error).message;
    breaker.recordFailure(err as Error);

    return {
      portal,
      ads: [],
      error: errorMsg,
      durationMs: Date.now() - start,
    };
  }
}

export async function runMultiPortalScrape(
  options: MultiPortalScrapeOptions = {}
): Promise<MultiPortalScrapeResponse> {
  const {
    query,
    limit = 60,
    portals = ['olx', 'pracuj', 'indeed', 'jooble', 'gowork', 'oferteo', 'fixly', 'bip_szczecin'],
    timeoutPerPortalMs = 8000,
  } = options;

  const runId = generateRunId();
  const runStartedAt = new Date();
  const portalRunResults: PortalRunResult[] = [];

  const tasks: Promise<PortalScraperResult>[] = [];

  for (const portal of portals) {
    if (SCRAPER_REGISTRY[portal]) {
      const portalLimit = portal === 'olx' ? limit : Math.ceil(limit / 2);
      tasks.push(
        executePortalScraper(portal, { query, limit: portalLimit }, timeoutPerPortalMs)
      );
    }
  }

  const results = await Promise.allSettled(tasks);

  const rawAds: ScrapedAd[] = [];
  const breakdown: Record<string, number> = {};
  for (const p of portals) breakdown[p] = 0;

  for (const r of results) {
    if (r.status === 'fulfilled') {
      const res = r.value;
      breakdown[res.portal] = res.ads.length;

      portalRunResults.push({
        portal: res.portal,
        adsFound: res.ads.length,
        adsNew: 0,
        adsDuplicated: 0,
        adsFilteredFraud: 0,
        errors: res.error ? [res.error] : [],
        responseTimeMs: res.durationMs,
      });

      for (const rawAd of res.ads) {
        rawAds.push(enrichCoordinates(rawAd));
      }
    }
  }

  // 1. Cross-portal fuzzy deduplication & entity resolution
  const mergedAds = deduplicateCrossPortalAds(rawAds);

  // 2. Enrich with zero-cost AI NLP traits, equipment detection, anti-fraud analysis & Szczecin market benchmarks
  const enrichedAds: EnrichedScrapedAd[] = mergedAds
    .map((ad) => {
      const cleanUrl = cleanCanonicalUrl(ad.source_url);
      const traits = extractJobTraits(ad.title, ad.description, ad.price, ad.phone);
      const market_evaluation = evaluateMarketSalary(ad.title, ad.price);
      const employerClass = classifyEmployer(ad.title, ad.description, ad.company);
      const rateParsed = parseConstructionRate(ad.price || ad.description);

      // Micro-district pinpointing for Szczecin
      const microDistrict = resolveSzczecinMicroDistrict(`${ad.location_text} ${ad.district || ''} ${ad.title} ${ad.description}`);
      let lat = ad.latitude;
      let lng = ad.longitude;
      let district = ad.district;

      if (microDistrict) {
        district = district || microDistrict.name;
        // If coords are default center of Szczecin, replace with precise microdistrict coordinates
        if (lat === 53.4285 && lng === 14.5528) {
          lat = microDistrict.lat;
          lng = microDistrict.lng;
        }
      }

      return {
        ...ad,
        source_url: cleanUrl || ad.source_url,
        district,
        latitude: lat,
        longitude: lng,
        employer_type: ad.employer_type || employerClass.type,
        salary_range: ad.salary_range || rateParsed?.salaryRange || null,
        price: rateParsed ? rateParsed.priceText : ad.price,
        traits,
        market_evaluation,
      };
    })
    .filter((ad) => !ad.traits.fraud_analysis?.isSuspicious || (ad.traits.fraud_analysis?.score ?? 0) < 0.7);

  // 3. Filter out unavailable/expired offers and auto-add only active ones
  const { availableOffers, summary } = await filterAndAddAvailableOffers(enrichedAds);

  // 4. Sort newest first by published_at / scraped_at
  availableOffers.sort((a, b) => {
    const ta = a.published_at ? Date.parse(a.published_at) : Date.parse(a.scraped_at);
    const tb = b.published_at ? Date.parse(b.published_at) : Date.parse(b.scraped_at);
    return tb - ta;
  });

  const limitedAds = availableOffers.slice(0, limit);

  // Best-effort Firestore write capped at 4s
  let storedCount = 0;
  if (limitedAds.length > 0) {
    try {
      const batch = adminFirestore.batch();
      for (const ad of limitedAds.slice(0, 500)) {
        const ref = adminFirestore.collection('announcements').doc(ad.id);
        batch.set(
          ref,
          {
            deduplication_key: ad.id,
            title: ad.title,
            description: ad.description,
            source_url: ad.source_url,
            source_portal: ad.source_portal,
            category: ad.category,
            location_text: ad.location_text,
            latitude: ad.latitude,
            longitude: ad.longitude,
            price: ad.price,
            salary_range: ad.salary_range || null,
            phone: ad.phone || null,
            photos: ad.photos || null,
            company: ad.company,
            employer_type: ad.employer_type || null,
            employment_type: ad.employment_type,
            traits: ad.traits,
            market_evaluation: ad.market_evaluation,
            available_portals: ad.available_portals,
            source_urls: ad.source_urls || { [ad.source_portal]: ad.source_url },
            is_cross_posted: ad.is_cross_posted,
            is_active: true,
            availability_status: 'active',
            verified_at: new Date(),
            scraped_at: new Date(),
            published_at: ad.published_at ? new Date(ad.published_at) : null,
          },
          { merge: true }
        );
        storedCount++;
      }

      await Promise.race([
        batch.commit(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('firestore-timeout')), 4000)),
      ]);
    } catch (e) {
      storedCount = 0;
      console.warn('Firestore write non-fatal timeout or error:', (e as Error).message);
    }
  }

  // Best-effort run logging for health dashboard
  logScraperRun({
    runId,
    startedAt: runStartedAt,
    completedAt: new Date(),
    trigger: 'on-demand',
    portalResults: portalRunResults,
    totalFirestoreWrites: storedCount,
    totalAdsScraped: rawAds.length,
    totalNewAds: limitedAds.length,
    queries: query ? [query] : ['murarz', 'elektryk', 'hydraulik', 'malarz', 'dekarz', 'brukarz', 'monter', 'budowlany'],
  }).catch(() => {}); // fire-and-forget

  return {
    success: true,
    data: limitedAds,
    metadata: {
      totalScraped: limitedAds.length,
      storedInFirestore: storedCount,
      rejectedUnavailableCount: summary.rejectedCount,
      scrapedAt: new Date().toISOString(),
      breakdown,
      queries: query ? [query] : ['murarz', 'elektryk', 'hydraulik', 'malarz', 'dekarz', 'brukarz', 'monter', 'budowlany'],
    },
  };
}
