import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getEarliestTransactionDate,
  countEmailsBeforeCutoff,
  deleteEmailsBeforeCutoff,
} from '@/lib/email/date-cutoff';

/**
 * POST /api/emails/cleanup?dry-run=true
 *
 * Cleans up emails that pre-date the user's earliest transaction.
 * Pass ?dry-run=true to preview without deleting.
 *
 * Returns:
 * - 200: Cleanup completed (or dry-run preview)
 * - 401: Unauthorized
 * - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isDryRun = request.nextUrl.searchParams.get('dry-run') === 'true';

    // Get earliest transaction date as cutoff
    const cutoffDate = await getEarliestTransactionDate(user.id);
    if (!cutoffDate) {
      return NextResponse.json({
        message: 'No transactions found — cannot determine cutoff date',
        cutoffDate: null,
        counts: { emailCount: 0, emailTransactionCount: 0 },
      });
    }

    // Count affected records
    const counts = await countEmailsBeforeCutoff(user.id, cutoffDate);

    if (isDryRun) {
      return NextResponse.json({
        dryRun: true,
        cutoffDate: cutoffDate.toISOString().split('T')[0],
        counts,
      });
    }

    // Perform deletion
    const result = await deleteEmailsBeforeCutoff(user.id, cutoffDate);

    return NextResponse.json({
      dryRun: false,
      cutoffDate: cutoffDate.toISOString().split('T')[0],
      deleted: result,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
