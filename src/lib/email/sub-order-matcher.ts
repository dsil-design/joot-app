/**
 * Sub-order persistence + matching helpers
 *
 * Used by the extraction pipeline and the post-statement matcher to write
 * `email_sub_orders` rows and pair each sub-order against statement
 * transactions independently. See database/supabase/migrations/
 * 20260525152038_add_email_sub_orders.sql for the table definition.
 *
 * The match write pattern mirrors the existing per-email matching path in
 * `extraction-service.tryAutoMatch` and `waiting-resolver.ts`: we set the
 * sub-order's matched_transaction_id + match_confidence and leave the reverse
 * pointer (`transactions.source_email_transaction_id`) to be written when the
 * user approves the suggestion in the review queue, which is how single-email
 * matching already works.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { ExtractedSubOrder } from './types';
import { rankMatches } from '../matching/match-ranker';
import type { SourceTransaction, TargetTransaction } from '../matching/match-scorer';
import { formatLocalDate } from '../utils/date-helpers';

export interface PersistedSubOrder {
  id: string;
  email_transaction_id: string;
  position: number;
  order_id: string | null;
  amount: number;
  currency: string;
  description: string | null;
  arrival_date: string | null;
  matched_transaction_id: string | null;
  match_confidence: number | null;
}

/**
 * Replace all sub-orders on a parent email_transaction with the given list.
 *
 * Idempotent — safe to call from both initial-insert and reprocess paths.
 * Deletes existing rows, then bulk-inserts the new set.
 *
 * Returns the inserted rows (with assigned ids) so the caller can hand them
 * straight to `autoMatchSubOrders` without an extra round-trip.
 */
export async function persistSubOrders(
  supabase: SupabaseClient,
  parentId: string,
  userId: string,
  subOrders: ExtractedSubOrder[],
): Promise<PersistedSubOrder[]> {
  // Replace (delete + insert) — simpler than diffing positions/order_ids and
  // avoids stale matches lingering when the parser output changes shape.
  const { error: deleteError } = await supabase
    .from('email_sub_orders')
    .delete()
    .eq('email_transaction_id', parentId);

  if (deleteError) {
    console.error('Failed to delete existing sub-orders:', deleteError);
    throw deleteError;
  }

  if (subOrders.length === 0) return [];

  const rows = subOrders.map((so, position) => ({
    email_transaction_id: parentId,
    user_id: userId,
    position,
    order_id: so.order_id ?? null,
    amount: so.amount,
    currency: so.currency,
    description: so.description ?? null,
    arrival_date: so.arrival_date ? formatLocalDate(so.arrival_date) : null,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from('email_sub_orders')
    .insert(rows)
    .select('id, email_transaction_id, position, order_id, amount, currency, description, arrival_date, matched_transaction_id, match_confidence');

  if (insertError) {
    console.error('Failed to insert sub-orders:', insertError);
    throw insertError;
  }

  return (inserted ?? []).map((row) => ({
    ...row,
    amount: Number(row.amount),
  }));
}

/**
 * Attempt to auto-match each sub-order against the given target transactions.
 *
 * For each unmatched sub-order, runs `rankMatches` and — if the best match
 * clears `minScore` — writes the linkage onto the sub-order row. Returns the
 * count of newly-matched sub-orders.
 *
 * Statement targets that have already been claimed by another sub-order in
 * this batch are excluded from subsequent sub-orders' candidate pools, so two
 * sub-orders for the same amount can't both grab the same statement line.
 *
 * Default `minScore` is 80 — higher than the 55 used for single-email
 * matching. Sub-order amounts are paid in the same currency as the charge
 * (Amazon doesn't FX-convert), so a true match scores 85+ from amount-exact
 * (40) + same-day-ish date (25-30) + vendor (25-30). Lower thresholds
 * caused false positives when the real charge wasn't yet on a statement and
 * the matcher latched onto a nearby same-vendor row — see the conversation
 * note in clear-sub-order-matches.ts.
 */
export async function autoMatchSubOrders(
  supabase: SupabaseClient,
  userId: string,
  subOrders: PersistedSubOrder[],
  targets: TargetTransaction[],
  options: {
    /** Date used when running rankMatches. Typically the parent email's transaction_date. */
    sourceDate: string;
    /** Vendor string used when running rankMatches. */
    sourceVendor: string;
    /** Minimum composite score to write the match. Defaults to 80. */
    minScore?: number;
  },
): Promise<number> {
  const { sourceDate, sourceVendor, minScore = 80 } = options;
  const claimed = new Set<string>();
  let matched = 0;

  for (const so of subOrders) {
    if (so.matched_transaction_id) {
      claimed.add(so.matched_transaction_id);
      continue;
    }

    const availableTargets = targets.filter((t) => !claimed.has(t.id));
    if (availableTargets.length === 0) break;

    const source: SourceTransaction = {
      amount: so.amount,
      currency: so.currency,
      date: sourceDate,
      vendor: sourceVendor,
      description: so.description ?? undefined,
    };

    const ranked = await rankMatches(source, availableTargets, { supabase });
    const best = ranked.bestMatch;
    if (!best || best.score < minScore) continue;

    const { error: updateError } = await supabase
      .from('email_sub_orders')
      .update({
        matched_transaction_id: best.targetId,
        match_confidence: best.score,
        match_method: 'auto',
        matched_at: new Date().toISOString(),
      })
      .eq('id', so.id)
      .eq('user_id', userId);

    if (updateError) {
      console.error(`Failed to write sub-order match (${so.id}):`, updateError);
      continue;
    }

    claimed.add(best.targetId);
    matched++;
  }

  return matched;
}

/**
 * Load all sub-orders for a parent email_transaction, ordered by position.
 */
export async function loadSubOrders(
  supabase: SupabaseClient,
  parentId: string,
): Promise<PersistedSubOrder[]> {
  const { data, error } = await supabase
    .from('email_sub_orders')
    .select('id, email_transaction_id, position, order_id, amount, currency, description, arrival_date, matched_transaction_id, match_confidence')
    .eq('email_transaction_id', parentId)
    .order('position', { ascending: true });

  if (error) {
    console.error('Failed to load sub-orders:', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    ...row,
    amount: Number(row.amount),
  }));
}
