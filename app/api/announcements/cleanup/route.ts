import { NextResponse } from 'next/server';
import { adminFirestore } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * Retention cleanup endpoint for stale announcements (older than 30 days).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const adminSecret = process.env.ADMIN_SECRET;

  if (process.env.NODE_ENV === 'production') {
    const isAuthorized =
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      (adminSecret && authHeader === `Bearer ${adminSecret}`);

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Cleanup task requires administrative authorization' },
        { status: 401 }
      );
    }
  }

  try {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - THIRTY_DAYS_MS);

    const snapshot = await adminFirestore
      .collection('announcements')
      .where('scraped_at', '<', cutoffDate)
      .limit(500)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No stale announcements to clean up',
        deletedCount: 0,
      });
    }

    const batch = adminFirestore.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${snapshot.docs.length} announcements older than 30 days`,
      deletedCount: snapshot.docs.length,
    });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: 'Cleanup task skipped (Firestore unavailable)', details: err },
      { status: 200 } // Graceful return
    );
  }
}
