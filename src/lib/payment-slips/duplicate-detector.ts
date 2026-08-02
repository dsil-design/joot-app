/**
 * Slip duplicate detection by bank transaction reference.
 *
 * Upload-time detection keys on `file_hash`, which only catches byte-identical
 * re-uploads. Photographing or re-exporting the same slip produces a different
 * hash, so uploads on 2026-04-11 and 2026-04-13 carried the same eight
 * February payments with nothing to flag it.
 *
 * The bank's transaction reference is unique per transfer, which makes it the
 * right key — but it does not exist until vision extraction has read the
 * image, so the check runs at the end of extraction rather than at upload.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Minimum length for a reference to be trusted as an identity key.
 *
 * Real KBank/Bangkok Bank references run ~20 characters
 * ("016041150258ATF04576"). Anything short is a partial read, and matching on
 * it would flag unrelated payments as duplicates.
 */
export const MIN_REFERENCE_LENGTH = 10

/** Values the model returns when a slip has no readable reference. */
const PLACEHOLDER_REFERENCES = new Set([
  'n/a',
  'na',
  'none',
  'null',
  'unknown',
  '-',
  '--',
  'notavailable',
  'notfound',
])

/**
 * Whether a reference is specific enough to prove two slips are the same
 * payment.
 *
 * Deliberately strict: a false positive here tells the user a genuine payment
 * is a duplicate, and the cost of missing one is only that it stays visible in
 * the review queue.
 */
export function isComparableReference(reference: string | null | undefined): boolean {
  if (typeof reference !== 'string') return false
  const trimmed = reference.trim()
  if (trimmed.length < MIN_REFERENCE_LENGTH) return false
  if (PLACEHOLDER_REFERENCES.has(trimmed.toLowerCase())) return false
  // Must carry enough alphanumeric signal to be an identifier rather than
  // punctuation the model emitted for an unreadable field.
  const alphanumeric = trimmed.replace(/[^a-z0-9]/gi, '')
  return alphanumeric.length >= MIN_REFERENCE_LENGTH
}

export interface DuplicateMatch {
  slipId: string
  filename: string
  reviewStatus: string
  uploadedAt: string
}

/**
 * Find an existing slip for the same payment.
 *
 * Compares against the stored reference directly — extraction normalises text
 * on the way in and the existing rows were backfilled, so no normalisation is
 * needed at the call site.
 *
 * When several slips share the reference, an already-approved one wins: it is
 * the copy the ledger is built on, so it is the one to point the user at.
 */
export async function findDuplicateByReference(
  supabase: SupabaseClient,
  userId: string,
  reference: string | null | undefined,
  excludeSlipId: string
): Promise<DuplicateMatch | null> {
  if (!isComparableReference(reference)) return null

  const { data } = await supabase
    .from('payment_slip_uploads')
    .select('id, filename, review_status, uploaded_at')
    .eq('user_id', userId)
    .eq('transaction_reference', (reference as string).trim())
    .neq('id', excludeSlipId)
    .order('uploaded_at', { ascending: true })

  const rows = (data as
    | { id: string; filename: string; review_status: string; uploaded_at: string }[]
    | null) || []
  if (rows.length === 0) return null

  const canonical = rows.find((r) => r.review_status === 'approved') ?? rows[0]
  return {
    slipId: canonical.id,
    filename: canonical.filename,
    reviewStatus: canonical.review_status,
    uploadedAt: canonical.uploaded_at,
  }
}

/** Warning shown on a slip that duplicates one already in the account. */
export function duplicateWarning(match: DuplicateMatch): string {
  const state = match.reviewStatus === 'approved' ? 'already approved' : 'awaiting review'
  return `Duplicate of ${match.filename} (${state}) — same bank reference, so this is the same payment. Approving both would double-count it.`
}
