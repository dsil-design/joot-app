/**
 * Payment Slip ↔ Statement Cross-Check
 *
 * The only defense against a confidently-wrong vision read is evidence from
 * OUTSIDE the model response. The bank statement is the ledger of record:
 * a slip whose amount has no counterpart row in the matching account within
 * ±2 days should not be trusted at high confidence, while a slip whose
 * amount IS found there has independent corroboration and can be trusted
 * above the single-pass ceiling.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/** Date window for matching a slip against statement rows, in days. */
export const CROSS_CHECK_WINDOW_DAYS = 2

/** Confidence boost awarded when a statement row corroborates the slip amount. */
export const CORROBORATION_BONUS = 15

/** Confidence ceiling for a slip contradicted by its account's statement. */
export const CONTRADICTED_CONFIDENCE_CAP = 60

export interface StatementRowLite {
  amount: number
  transaction_date: string
  description?: string
}

export type CrossCheckOutcome =
  /** A statement row matches the slip's amount (or amount + fee), direction, and date window. */
  | 'corroborated'
  /** The account's statement covers the slip date but holds no counterpart row — needs verification. */
  | 'no_matching_row'
  /** No statement covering this account and date has been uploaded — inconclusive, not a strike. */
  | 'no_coverage'

export interface CrossCheckResult {
  outcome: CrossCheckOutcome
  matchedRow?: StatementRowLite
  rowsChecked: number
}

/**
 * Find a statement row corroborating a slip amount.
 *
 * Slips carry a separate fee field and the statement may book amount or
 * amount + fee, so both are tried. Direction matters: KBANK rows are signed
 * (positive = outgoing), and without the check an incoming −300 row would
 * corroborate an outgoing ฿300 slip.
 */
export function findCorroboratingRow(
  rows: StatementRowLite[],
  slip: {
    amount: number
    fee?: number | null
    date: string
    direction?: 'expense' | 'income' | 'transfer' | null
  }
): StatementRowLite | null {
  const slipTime = new Date(slip.date).getTime()
  if (isNaN(slipTime)) return null

  for (const row of rows) {
    const rowAmount = Number(row.amount)
    if (slip.direction === 'income' && rowAmount > 0) continue
    if (slip.direction === 'expense' && rowAmount <= 0) continue

    const a = Math.abs(rowAmount)
    const b = Math.abs(slip.amount)
    const matchesAmount =
      Math.abs(a - b) <= 0.01 ||
      Math.abs(a - (b + Number(slip.fee || 0))) <= 0.01
    if (!matchesAmount) continue

    const rowTime = new Date(row.transaction_date).getTime()
    if (isNaN(rowTime)) continue
    if (Math.abs(rowTime - slipTime) > CROSS_CHECK_WINDOW_DAYS * 86400000) continue

    return row
  }

  return null
}

/**
 * Cross-check a freshly-extracted slip against the statement rows of the
 * account it belongs to.
 *
 * Only runs when the slip's account (payment method) is known — checking a
 * slip against some other account's rows would manufacture both false
 * corroborations and false contradictions.
 */
export async function crossCheckSlipAgainstStatements(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  paymentMethodId: string | null | undefined,
  slip: {
    amount: number
    fee?: number | null
    date: string
    direction?: 'expense' | 'income' | 'transfer' | null
  }
): Promise<CrossCheckResult> {
  if (!paymentMethodId || !slip.amount || !slip.date) {
    return { outcome: 'no_coverage', rowsChecked: 0 }
  }

  const slipTime = new Date(slip.date)
  if (isNaN(slipTime.getTime())) {
    return { outcome: 'no_coverage', rowsChecked: 0 }
  }

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const windowStart = new Date(slipTime)
  windowStart.setDate(windowStart.getDate() - CROSS_CHECK_WINDOW_DAYS)
  const windowEnd = new Date(slipTime)
  windowEnd.setDate(windowEnd.getDate() + CROSS_CHECK_WINDOW_DAYS)

  // Statements whose period overlaps the slip's date window
  const { data: statements } = await supabase
    .from('statement_uploads')
    .select('id, extraction_log, statement_period_start, statement_period_end')
    .eq('user_id', userId)
    .eq('payment_method_id', paymentMethodId)
    .lte('statement_period_start', fmt(windowEnd))
    .gte('statement_period_end', fmt(windowStart))

  if (!statements || statements.length === 0) {
    return { outcome: 'no_coverage', rowsChecked: 0 }
  }

  const rows: StatementRowLite[] = statements.flatMap(
    (s) => ((s.extraction_log as { suggestions?: StatementRowLite[] })?.suggestions) || []
  )

  if (rows.length === 0) {
    // Statement exists but extracted nothing — indistinguishable from a
    // parser failure, so treat as no coverage rather than a contradiction.
    return { outcome: 'no_coverage', rowsChecked: 0 }
  }

  const matchedRow = findCorroboratingRow(rows, slip)
  if (matchedRow) {
    return { outcome: 'corroborated', matchedRow, rowsChecked: rows.length }
  }

  return { outcome: 'no_matching_row', rowsChecked: rows.length }
}
