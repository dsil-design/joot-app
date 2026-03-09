import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { emailSyncService } from '@/lib/services/email-sync-service';

// Allow up to 60s for IMAP connection + sync (Vercel default is 10s)
export const maxDuration = 60;

/**
 * Track active syncs to prevent concurrent sync operations per user.
 * Using in-memory Set is sufficient for a single-user app.
 * For multi-server deployment, use Redis or database-based locking.
 */
const activeSyncs = new Set<string>();

/**
 * POST /api/emails/sync
 *
 * Triggers a manual email sync for the authenticated user.
 * Connects to iCloud IMAP and syncs email metadata into the database.
 * Does NOT process or extract data — use /api/emails/process or
 * /api/emails/[id]/extract for that.
 *
 * Returns:
 * - 200: Sync completed successfully
 * - 401: Unauthorized (not logged in)
 * - 409: Sync already in progress
 * - 503: Email integration not configured
 * - 500: Internal server error
 */
export async function POST(_request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check for concurrent sync
    if (activeSyncs.has(user.id)) {
      return NextResponse.json(
        { error: 'Sync already in progress' },
        { status: 409 }
      );
    }

    // Check if iCloud credentials are configured
    if (!process.env.ICLOUD_EMAIL || !process.env.ICLOUD_APP_PASSWORD) {
      console.error('Email sync: missing env vars -',
        !process.env.ICLOUD_EMAIL ? 'ICLOUD_EMAIL' : '',
        !process.env.ICLOUD_APP_PASSWORD ? 'ICLOUD_APP_PASSWORD' : ''
      );
      return NextResponse.json(
        { error: 'iCloud email integration not configured. Check ICLOUD_EMAIL and ICLOUD_APP_PASSWORD env vars in Vercel.' },
        { status: 503 }
      );
    }

    // Mark sync as active
    activeSyncs.add(user.id);

    try {
      console.log(`Email sync (IMAP only) triggered for user ${user.id}`);

      // Execute IMAP sync only — no extraction/AI processing
      const result = await emailSyncService.executeSync(user.id);

      return NextResponse.json({
        success: result.success,
        synced: result.synced,
        errors: result.errors,
        lastUid: result.lastUid,
        message: result.message,
      });
    } finally {
      // Always remove from active syncs when done
      activeSyncs.delete(user.id);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Email sync failed:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        // Include diagnostic info for debugging (safe since this is a single-user app)
        debug: {
          hasImapEmail: !!process.env.ICLOUD_EMAIL,
          hasImapPassword: !!process.env.ICLOUD_APP_PASSWORD,
          folder: process.env.ICLOUD_FOLDER || 'Transactions (default)',
          errorType: error?.constructor?.name || typeof error,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/emails/sync
 *
 * Get sync status and statistics for the authenticated user.
 *
 * Returns:
 * - isRunning: Whether a sync is currently in progress
 * - totalEmails: Total number of emails synced
 * - lastSyncAt: Timestamp of last sync
 * - folders: Array of folder stats
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get sync stats from the service
    const stats = await emailSyncService.getSyncStats(user.id);

    // Check if sync is currently running for this user
    const isRunning = activeSyncs.has(user.id);

    return NextResponse.json({
      isRunning,
      ...stats,
    });

  } catch (error) {
    console.error('Failed to get sync status:', error);

    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
