/**
 * Derive a single user-facing badge from the independent state fields on a
 * payment slip:
 *   - `status`               — extraction pipeline state
 *   - `review_status`        — the user's review decision
 *   - `duplicate_of_slip_id` — set when this slip is a copy of a payment
 *                              already in the account
 *
 * Pipeline states that block review (processing, pending, failed) take
 * precedence. Once extraction is done, the review state is surfaced so the
 * list matches the detail page.
 */

export interface SlipBadgeInput {
  status: string
  review_status: string
  duplicate_of_slip_id?: string | null
}

export interface SlipBadge {
  label: string
  className: string
}

export function getSlipBadge(slip: SlipBadgeInput): SlipBadge {
  if (slip.status === 'failed') {
    return { label: 'Failed', className: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400' }
  }
  if (slip.status === 'processing') {
    return { label: 'Processing', className: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' }
  }
  if (slip.status === 'pending') {
    return { label: 'Pending', className: 'bg-muted text-muted-foreground' }
  }

  // Extraction done — surface the review state.
  if (slip.review_status === 'approved') {
    return { label: 'Approved', className: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300' }
  }
  if (slip.review_status === 'rejected') {
    return { label: 'Rejected', className: 'bg-muted text-muted-foreground' }
  }

  // An unreviewed copy of a payment already in the account. Shown ahead of
  // "Ready" because approving it double-counts the payment — the whole reason
  // the 2026-04-11 / 2026-04-13 overlap went unnoticed was that nothing
  // distinguished a duplicate from an ordinary slip awaiting review.
  if (slip.duplicate_of_slip_id) {
    return { label: 'Duplicate', className: 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300' }
  }

  return { label: 'Ready', className: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' }
}
