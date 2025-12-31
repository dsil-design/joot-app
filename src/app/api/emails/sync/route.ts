import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { emailSyncService } from '@/lib/services/email-sync-service';

/**
 * POST /api/emails/sync
 *
 * Triggers a manual email sync for the authenticated user.
 * Connects to iCloud IMAP and syncs email metadata from the configured folder.
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

    // Check if iCloud credentials are configured
    if (!process.env.ICLOUD_EMAIL || !process.env.ICLOUD_APP_PASSWORD) {
      return NextResponse.json(
        { error: 'iCloud email integration not configured' },
        { status: 503 }
      );
    }

    console.log(`Email sync triggered for user ${user.id}`);

    // Execute sync
    const result = await emailSyncService.executeSync(user.id);

    return NextResponse.json({
      success: result.success,
      synced: result.synced,
      errors: result.errors,
      lastUid: result.lastUid,
      message: result.message,
    });

  } catch (error) {
    console.error('Email sync failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
