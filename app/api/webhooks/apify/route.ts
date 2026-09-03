/**
 * Autonomous Apify Webhook Receiver Route.
 * Ingests scraped job postings in real time when Apify Actors finish execution.
 * Ensures 100% fresh listings without periodic serverless browser overhead.
 */

import { NextResponse } from 'next/server';
import { processApifyWebhook } from '@/lib/scraper/apify/webhookHandler';
import { defaultApifyClient } from '@/lib/scraper/apify/apifyClient';
import { ApifyWebhookPayload } from '@/lib/scraper/apify/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const secretParam = url.searchParams.get('secret');
  const secretHeader = request.headers.get('x-apify-webhook-secret');
  const authHeader = request.headers.get('authorization');
  const configuredSecret = process.env.APIFY_WEBHOOK_SECRET;

  // In production, an Apify webhook secret must be configured and verified
  if (process.env.NODE_ENV === 'production' && !configuredSecret) {
    return NextResponse.json(
      { success: false, error: 'Server misconfiguration: APIFY_WEBHOOK_SECRET missing in production' },
      { status: 500 }
    );
  }

  // Authorization check if webhook secret is configured
  if (configuredSecret) {
    const isSecretValid =
      secretHeader === configuredSecret ||
      secretParam === configuredSecret ||
      authHeader === `Bearer ${configuredSecret}`;

    if (!isSecretValid) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid Apify webhook secret' },
        { status: 401 }
      );
    }
  }

  try {
    const payload = (await request.json()) as ApifyWebhookPayload;

    // Optional event type filtering (ignore aborted/failed runs if eventType is specified)
    if (payload.eventType && payload.eventType !== 'ACTOR.RUN.SUCCEEDED') {
      return NextResponse.json({
        success: true,
        message: `Ignored event type: ${payload.eventType}`,
      });
    }

    const result = await processApifyWebhook(payload, defaultApifyClient);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Ingestion failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Apify dataset successfully ingested and synchronized',
      data: result,
    });
  } catch (err) {
    console.error('Apify Webhook Processing Exception:', err);
    return NextResponse.json(
      {
        success: false,
        error: (err as Error).message || 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
