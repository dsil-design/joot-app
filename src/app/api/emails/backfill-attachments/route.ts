import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { emailSyncService } from '@/lib/services/email-sync-service';

// Backfill walks every synced email's body structure over IMAP — can take a
// while on large mailboxes. Bumped well beyond the default 10s.
export const maxDuration = 300;

const activeBackfills = new Set<string>();

/**
 * POST /api/emails/backfill-attachments
 *
 * One-shot backfill: for every already-synced email that has no rows in
 * email_attachments, fetch its body structure over IMAP and run the standard
 * PDF download + extraction pipeline on any PDF parts it contains.
 *
 * Body (optional JSON):
 *   { "limit": number }  // cap how many emails to scan in this call
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (activeBackfills.has(user.id)) {
      return NextResponse.json(
        { error: 'Backfill already in progress' },
        { status: 409 },
      );
    }

    if (!process.env.ICLOUD_EMAIL || !process.env.ICLOUD_APP_PASSWORD) {
      return NextResponse.json(
        { error: 'iCloud email integration not configured.' },
        { status: 503 },
      );
    }

    let limit: number | undefined;
    try {
      const body = await request.json().catch(() => null);
      if (body && typeof body.limit === 'number' && body.limit > 0) {
        limit = Math.floor(body.limit);
      }
    } catch {
      // No body — that's fine.
    }

    activeBackfills.add(user.id);
    try {
      const result = await emailSyncService.backfillAttachments(user.id, { limit });
      return NextResponse.json(result, { status: result.success ? 200 : 500 });
    } finally {
      activeBackfills.delete(user.id);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Backfill attachments failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
