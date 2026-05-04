/**
 * Email Bundle Assembly
 *
 * Groups sibling email_transactions into a virtual "bundle" — used when a
 * single card transaction settles multiple receipt emails (e.g. Lazada
 * splitting one order across multiple seller emails).
 *
 * Bundles are not persisted; they're computed at match time from rows that:
 *   - share the same user
 *   - come from the same split-receipt vendor (via `getSplitReceiptVendor`)
 *   - arrived within ±N minutes of each other (default 30)
 *   - share the same currency
 *   - have not yet been matched/imported/skipped
 *   - have distinct `order_id`s (so we don't double-count duplicate emails
 *     about the *same* order — this is the same-order de-dupe that
 *     `email_groups` performs upstream)
 *
 * Membership in a persisted bundle (post-match) is implicit — every member
 * email shares the same `matched_transaction_id`, mirroring the precedent
 * already in production.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSplitReceiptVendor } from './split-receipt-vendors';

export interface EmailBundleMember {
  id: string;
  amount: number;
  currency: string;
  /** YYYY-MM-DD */
  transaction_date: string;
  /** ISO timestamp */
  email_date: string;
  vendor: string;
  description?: string;
  order_id?: string;
  from_address?: string;
}

export interface EmailBundle {
  /** The email passed in to `buildLazadaBundle` — kept first in `members`. */
  focalId: string;
  vendorLabel: string;
  members: EmailBundleMember[];
}

export interface BuildBundleOptions {
  /** Window for grouping by `email_date`, in minutes (default 30). */
  windowMinutes?: number;
  /** Maximum bundle size including focal (default 5). */
  maxMembers?: number;
}

const DEFAULT_WINDOW_MINUTES = 30;
const DEFAULT_MAX_MEMBERS = 5;
const STATUSES_ELIGIBLE_FOR_BUNDLING = [
  'pending_review',
  'waiting_for_statement',
  'ready_to_import',
];

interface FocalEmailRow {
  id: string;
  user_id: string;
  from_address: string | null;
  email_date: string | null;
  transaction_date: string | null;
  amount: number | null;
  currency: string | null;
  vendor_name_raw: string | null;
  description: string | null;
  order_id: string | null;
  is_group_primary?: boolean | null;
}

/**
 * Build a bundle by pulling the focal email's row from the DB and finding
 * sibling emails. Returns null when the focal isn't a split-receipt vendor or
 * no eligible siblings exist.
 */
export async function buildBundleForEmail(
  supabase: SupabaseClient,
  focalEmailId: string,
  userId: string,
  options: BuildBundleOptions = {},
): Promise<EmailBundle | null> {
  const { data: focal } = await supabase
    .from('email_transactions')
    .select(
      'id, user_id, from_address, email_date, transaction_date, amount, currency, vendor_name_raw, description, order_id, is_group_primary',
    )
    .eq('id', focalEmailId)
    .eq('user_id', userId)
    .single();

  if (!focal) return null;
  return buildBundleFromFocalRow(supabase, focal as FocalEmailRow, options);
}

/**
 * Same as `buildBundleForEmail` but starts from an already-fetched focal row.
 * Used by callers (e.g. waiting-resolver) that already have the row in hand.
 */
export async function buildBundleFromFocalRow(
  supabase: SupabaseClient,
  focal: FocalEmailRow,
  options: BuildBundleOptions = {},
): Promise<EmailBundle | null> {
  const windowMinutes = options.windowMinutes ?? DEFAULT_WINDOW_MINUTES;
  const maxMembers = options.maxMembers ?? DEFAULT_MAX_MEMBERS;

  const vendor = getSplitReceiptVendor(focal.from_address);
  if (!vendor) return null;
  if (!focal.amount || !focal.currency || !focal.email_date || !focal.transaction_date) {
    return null;
  }

  const focalTime = new Date(focal.email_date).getTime();
  if (Number.isNaN(focalTime)) return null;
  const windowMs = windowMinutes * 60 * 1000;
  const fromIso = new Date(focalTime - windowMs).toISOString();
  const toIso = new Date(focalTime + windowMs).toISOString();

  const { data: candidates } = await supabase
    .from('email_transactions')
    .select(
      'id, from_address, email_date, transaction_date, amount, currency, vendor_name_raw, description, order_id, is_group_primary, status',
    )
    .eq('user_id', focal.user_id)
    .eq('currency', focal.currency)
    .gte('email_date', fromIso)
    .lte('email_date', toIso)
    .in('status', STATUSES_ELIGIBLE_FOR_BUNDLING)
    .neq('id', focal.id);

  const focalOrderId = (focal.order_id || '').trim();
  const seenOrderIds = new Set<string>();
  if (focalOrderId) seenOrderIds.add(focalOrderId);

  const siblings: EmailBundleMember[] = [];
  for (const row of candidates ?? []) {
    if (!row.amount || !row.currency || !row.email_date || !row.transaction_date) continue;
    if (!getSplitReceiptVendor(row.from_address)) continue;
    const oid = (row.order_id || '').trim();
    if (oid && seenOrderIds.has(oid)) continue;
    if (oid) seenOrderIds.add(oid);

    siblings.push(toMember(row));
    if (siblings.length + 1 >= maxMembers) break;
  }

  if (siblings.length === 0) return null;

  return {
    focalId: focal.id,
    vendorLabel: vendor.label,
    members: [toMember(focal), ...siblings],
  };
}

interface BundleCandidateRow {
  id: string;
  from_address?: string | null;
  email_date?: string | null;
  transaction_date?: string | null;
  amount?: number | null;
  currency?: string | null;
  vendor_name_raw?: string | null;
  description?: string | null;
  order_id?: string | null;
}

function toMember(row: BundleCandidateRow): EmailBundleMember {
  return {
    id: row.id,
    amount: Number(row.amount),
    currency: String(row.currency),
    transaction_date: String(row.transaction_date),
    email_date: String(row.email_date),
    vendor: row.vendor_name_raw || 'Lazada Thailand',
    description: row.description ?? undefined,
    order_id: row.order_id ?? undefined,
    from_address: row.from_address ?? undefined,
  };
}

/**
 * Find every Lazada bundle within a list of email rows — used by the
 * waiting-resolver to discover bundles before per-email matching.
 *
 * Returns: array of bundles. Each row appears in at most one bundle.
 */
export function groupRowsIntoBundles<T extends FocalEmailRow & { status?: string | null }>(
  rows: T[],
  options: BuildBundleOptions = {},
): Array<{ vendorLabel: string; members: EmailBundleMember[] }> {
  const windowMinutes = options.windowMinutes ?? DEFAULT_WINDOW_MINUTES;
  const maxMembers = options.maxMembers ?? DEFAULT_MAX_MEMBERS;
  const windowMs = windowMinutes * 60 * 1000;

  const eligible = rows
    .filter((r) => {
      if (!r.amount || !r.currency || !r.email_date || !r.transaction_date) return false;
      if (r.status && !STATUSES_ELIGIBLE_FOR_BUNDLING.includes(r.status)) return false;
      return getSplitReceiptVendor(r.from_address) !== null;
    })
    .map((r) => ({ row: r, time: new Date(r.email_date as string).getTime() }))
    .filter((x) => !Number.isNaN(x.time))
    .sort((a, b) => a.time - b.time);

  const claimed = new Set<string>();
  const bundles: Array<{ vendorLabel: string; members: EmailBundleMember[] }> = [];

  for (const { row, time } of eligible) {
    if (claimed.has(row.id)) continue;
    const vendor = getSplitReceiptVendor(row.from_address);
    if (!vendor) continue;

    const members: EmailBundleMember[] = [toMember(row)];
    claimed.add(row.id);
    const seenOrderIds = new Set<string>();
    if (row.order_id) seenOrderIds.add(row.order_id.trim());

    for (const other of eligible) {
      if (claimed.has(other.row.id)) continue;
      if (other.row.id === row.id) continue;
      if (other.row.currency !== row.currency) continue;
      if (Math.abs(other.time - time) > windowMs) continue;
      const otherVendor = getSplitReceiptVendor(other.row.from_address);
      if (!otherVendor || otherVendor.label !== vendor.label) continue;
      const oid = (other.row.order_id || '').trim();
      if (oid && seenOrderIds.has(oid)) continue;
      if (oid) seenOrderIds.add(oid);

      members.push(toMember(other.row));
      claimed.add(other.row.id);
      if (members.length >= maxMembers) break;
    }

    if (members.length >= 2) {
      bundles.push({ vendorLabel: vendor.label, members });
    } else {
      claimed.delete(row.id);
    }
  }

  return bundles;
}
