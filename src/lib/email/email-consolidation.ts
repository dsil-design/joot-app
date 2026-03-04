/**
 * Email Consolidation Service
 *
 * Groups related emails about the same transaction (e.g., "bill ready" + "payment processed").
 * Uses deterministic keys from email attributes to find and merge groups.
 *
 * Group key strategies:
 * 1. If order/reference ID exists: `order:{normalized_id}`
 * 2. Otherwise: `txn:{vendor}:{currency}:{amount}:{3_day_window}`
 *
 * The 3-day window buckets dates so emails arriving within 3 days get grouped.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '../supabase/server';
import type { AiClassificationResult } from './types';

// ============================================================================
// GROUP KEY GENERATION
// ============================================================================

/**
 * Generate a 3-day window bucket from a date.
 * Dates within the same 3-day window get the same bucket string.
 */
function dateTo3DayWindow(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Bucket: floor(day_of_year / 3)
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000);
  const bucket = Math.floor(dayOfYear / 3);
  return `${d.getFullYear()}-w${bucket}`;
}

/**
 * Normalize a string for use in group keys (lowercase, trim, remove special chars)
 */
function normalizeForKey(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

/**
 * Generate a deterministic group key from transaction data
 */
export function generateGroupKey(params: {
  orderId?: string | null;
  referenceId?: string | null;
  vendorName?: string | null;
  amount?: number | null;
  currency?: string | null;
  date?: Date | string | null;
}): string | null {
  // Strategy 1: Order/reference ID-based key
  const refId = params.orderId || params.referenceId;
  if (refId && refId.trim().length > 0) {
    return `order:${normalizeForKey(refId)}`;
  }

  // Strategy 2: Vendor + amount + currency + date window
  if (params.vendorName && params.amount && params.amount > 0 && params.date) {
    const vendor = normalizeForKey(params.vendorName);
    const currency = (params.currency || 'USD').toUpperCase();
    const amount = params.amount.toFixed(2);
    const window = dateTo3DayWindow(params.date);
    return `txn:${vendor}:${currency}:${amount}:${window}`;
  }

  return null;
}

// ============================================================================
// CONSOLIDATION LOGIC
// ============================================================================

export interface ConsolidationResult {
  /** Email group ID (existing or newly created) */
  emailGroupId: string;

  /** Whether this email is the primary in its group */
  isPrimary: boolean;

  /** Whether an existing group was found (vs. new group created) */
  isExistingGroup: boolean;
}

/**
 * Check if an email belongs to an existing group and create/update accordingly.
 *
 * Returns null if no group key can be generated (email lacks identifying data).
 */
export async function consolidateEmail(params: {
  userId: string;
  emailTransactionId: string;
  vendorName?: string | null;
  amount?: number | null;
  currency?: string | null;
  transactionDate?: Date | string | null;
  orderId?: string | null;
  aiHint?: AiClassificationResult['related_transaction_hint'];
  supabase?: SupabaseClient;
}): Promise<ConsolidationResult | null> {
  // Try generating key from extraction data first
  let groupKey = generateGroupKey({
    orderId: params.orderId,
    vendorName: params.vendorName,
    amount: params.amount,
    currency: params.currency,
    date: params.transactionDate,
  });

  // Fall back to AI hint if extraction data is insufficient
  if (!groupKey && params.aiHint) {
    groupKey = generateGroupKey({
      referenceId: params.aiHint.reference_id,
      vendorName: params.aiHint.vendor_name,
      amount: params.aiHint.amount,
      currency: params.aiHint.currency,
      date: params.aiHint.approximate_date,
    });
  }

  if (!groupKey) {
    return null;
  }

  const supabase = params.supabase || createServiceRoleClient();

  // Check if a group with this key already exists for this user
  const { data: existingGroup } = await supabase
    .from('email_groups')
    .select('id, email_count')
    .eq('user_id', params.userId)
    .eq('group_key', groupKey)
    .single();

  if (existingGroup) {
    // Add to existing group as non-primary
    await supabase
      .from('email_groups')
      .update({ email_count: existingGroup.email_count + 1 })
      .eq('id', existingGroup.id);

    return {
      emailGroupId: existingGroup.id,
      isPrimary: false,
      isExistingGroup: true,
    };
  }

  // Create new group with this email as primary
  const transactionDate = params.transactionDate
    ? (typeof params.transactionDate === 'string'
      ? params.transactionDate
      : params.transactionDate.toISOString().split('T')[0])
    : params.aiHint?.approximate_date || null;

  const { data: newGroup, error } = await supabase
    .from('email_groups')
    .insert({
      user_id: params.userId,
      group_key: groupKey,
      vendor_name: params.vendorName || params.aiHint?.vendor_name || null,
      amount: params.amount || params.aiHint?.amount || null,
      currency: params.currency || params.aiHint?.currency || null,
      transaction_date: transactionDate,
      email_count: 1,
      primary_email_transaction_id: params.emailTransactionId,
    })
    .select('id')
    .single();

  if (error) {
    // Unique constraint violation = race condition, another request created it
    if (error.code === '23505') {
      const { data: raceGroup } = await supabase
        .from('email_groups')
        .select('id, email_count')
        .eq('user_id', params.userId)
        .eq('group_key', groupKey)
        .single();

      if (raceGroup) {
        await supabase
          .from('email_groups')
          .update({ email_count: raceGroup.email_count + 1 })
          .eq('id', raceGroup.id);

        return {
          emailGroupId: raceGroup.id,
          isPrimary: false,
          isExistingGroup: true,
        };
      }
    }

    console.error('Failed to create email group:', error);
    return null;
  }

  return {
    emailGroupId: newGroup.id,
    isPrimary: true,
    isExistingGroup: false,
  };
}
