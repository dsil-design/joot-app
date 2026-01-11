import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/imports/status-counts
 *
 * Returns counts for import dashboard status cards:
 * - pending: emails awaiting user review
 * - waiting: THB receipts waiting for USD statement match
 * - matched: successfully matched in the last 30 days
 *
 * Also returns email sync stats (lastSyncedAt, folder, totalSynced).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch counts for each status
    const [pendingResult, waitingResult, matchedResult, syncStateResult, totalSyncedResult] = await Promise.all([
      // Pending review count
      supabase
        .from('email_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending_review'),

      // Waiting for statement count
      supabase
        .from('email_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'waiting_for_statement'),

      // Matched in last 30 days count
      supabase
        .from('email_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'matched')
        .gte('matched_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

      // Get sync state for last sync time and folder
      supabase
        .from('email_sync_state')
        .select('folder, last_sync_at')
        .eq('user_id', user.id)
        .order('last_sync_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Get total synced emails count
      supabase
        .from('emails')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ]);

    // Handle any errors
    if (pendingResult.error) {
      console.error('Error fetching pending count:', pendingResult.error);
    }
    if (waitingResult.error) {
      console.error('Error fetching waiting count:', waitingResult.error);
    }
    if (matchedResult.error) {
      console.error('Error fetching matched count:', matchedResult.error);
    }
    if (syncStateResult.error) {
      console.error('Error fetching sync state:', syncStateResult.error);
    }
    if (totalSyncedResult.error) {
      console.error('Error fetching total synced:', totalSyncedResult.error);
    }

    return NextResponse.json({
      counts: {
        pending: pendingResult.count ?? 0,
        waiting: waitingResult.count ?? 0,
        matched: matchedResult.count ?? 0,
      },
      sync: {
        lastSyncedAt: syncStateResult.data?.last_sync_at ?? null,
        folder: syncStateResult.data?.folder ?? 'Transactions',
        totalSynced: totalSyncedResult.count ?? 0,
      },
    });
  } catch (error) {
    console.error('Error in imports status-counts API:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
