/**
 * Multi-Portal On-Demand Job Scraper API Route 2.0.
 * Extracts live construction job postings across OLX, Pracuj.pl, Indeed, Jooble, GoWork, Oferteo, and Fixly.
 */

import { NextResponse } from 'next/server';
import { runMultiPortalScrape, SupportedPortal } from '@/lib/scraper/engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const ALL_PORTALS: SupportedPortal[] = ['olx', 'pracuj', 'indeed', 'jooble', 'gowork', 'oferteo', 'fixly', 'bip_szczecin'];

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const adminSecret = process.env.ADMIN_SECRET;

  // Protect on-demand scraper endpoint in production
  if (process.env.NODE_ENV === 'production') {
    const isAuthorized =
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      (adminSecret && authHeader === `Bearer ${adminSecret}`);

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: On-demand scraper requires administrative authorization' },
        { status: 401 }
      );
    }
  }

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '60', 10), 100);
  const customQuery = url.searchParams.get('query') || undefined;
  const portalsParam = url.searchParams.get('portals');

  let portals: SupportedPortal[] = ALL_PORTALS;
  if (portalsParam) {
    const parsed = portalsParam.split(',').map((p) => p.trim().toLowerCase());
    portals = parsed.filter((p): p is SupportedPortal =>
      ALL_PORTALS.includes(p as SupportedPortal)
    );
    if (portals.length === 0) portals = ALL_PORTALS;
  }

  try {
    const response = await runMultiPortalScrape({
      query: customQuery,
      limit,
      portals,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Multi-portal scrape API error:', error);
    const emptyBreakdown: Record<string, number> = {};
    for (const p of ALL_PORTALS) emptyBreakdown[p] = 0;

    return NextResponse.json(
      {
        success: false,
        error: 'Scraping failed',
        data: [],
        metadata: {
          totalScraped: 0,
          storedInFirestore: 0,
          scrapedAt: new Date().toISOString(),
          breakdown: emptyBreakdown,
          queries: customQuery ? [customQuery] : [],
        },
      },
      { status: 200 }
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const adminSecret = process.env.ADMIN_SECRET;

  if (process.env.NODE_ENV === 'production') {
    const isAuthorized =
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      (adminSecret && authHeader === `Bearer ${adminSecret}`);

    if (!isAuthorized) {
      // Return error only if both secrets are configured but neither was provided
      if (cronSecret || adminSecret) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Administrator authorization required' },
          { status: 401 }
        );
      }
    }
  }

  try {
    const body = await request.json().catch(() => ({}));
    const limit = Math.min(typeof body.limit === 'number' ? body.limit : 50, 100);
    const customQuery = typeof body.query === 'string' ? body.query : undefined;
    const requestedPortals = Array.isArray(body.portals) ? body.portals : ALL_PORTALS;

    const portals = requestedPortals.filter((p: string): p is SupportedPortal =>
      ALL_PORTALS.includes(p as SupportedPortal)
    );

    const response = await runMultiPortalScrape({
      query: customQuery,
      limit,
      portals: portals.length > 0 ? portals : ALL_PORTALS,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Multi-portal scrape POST API error:', error);
    const emptyBreakdown: Record<string, number> = {};
    for (const p of ALL_PORTALS) emptyBreakdown[p] = 0;

    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || 'Scraping failed',
        data: [],
        metadata: {
          totalScraped: 0,
          storedInFirestore: 0,
          scrapedAt: new Date().toISOString(),
          breakdown: emptyBreakdown,
          queries: [],
        },
      },
      { status: 200 }
    );
  }
}
