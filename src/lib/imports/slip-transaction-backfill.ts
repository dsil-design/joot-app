import type { SupabaseClient } from '@supabase/supabase-js'
import type { QueueItem } from './queue-types'
import { calculateDaysDiff } from '@/lib/matching/date-matcher'

/**
 * Backfill matchedTransaction on unmatched email/statement queue items by
 * looking for existing transactions that were created from a payment slip.
 *
 * Why: Payment slips usually arrive before the corresponding bank statement
 * row and email receipt. If the user accepts the slip-only proposal early
 * (creating a transaction with `source_payment_slip_id` set), the email and
 * statement that arrive later should auto-link to that same transaction
 * instead of being proposed as separate "new" items.
 *
 * The aggregator's existing dedup-by-matched-transaction pass will then
 * consolidate any email/statement items pointing to the same slip-derived
 * transaction into a single merged card.
 */
export async function backfillSlipTransactionMatches(
  supabase: SupabaseClient,
  userId: string,
  emailItems: QueueItem[],
  statementItems: QueueItem[]
): Promise<void> {
  const candidates = [...emailItems, ...statementItems].filter(
    (item) => item.status === 'pending' && item.isNew && !item.matchedTransaction
  )
  if (candidates.length === 0) return

  // Derive date range from candidates (±3 days padding handled in match check).
  const dates = candidates.map((c) => c.statementTransaction.date).sort()
  const fromDate = dates[0]
  const toDate = dates[dates.length - 1]
  if (!fromDate || !toDate) return

  // Pad the query range by 3 days on each side to cover the matching tolerance.
  const pad = (date: string, days: number): string => {
    const d = new Date(date)
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().slice(0, 10)
  }

  const { data: slipTxns, error } = await supabase
    .from('transactions')
    .select(`
      id, transaction_date, amount, original_currency, description,
      source_payment_slip_id,
      vendors ( name ),
      payment_methods ( name )
    `)
    .eq('user_id', userId)
    .not('source_payment_slip_id', 'is', null)
    .gte('transaction_date', pad(fromDate, -3))
    .lte('transaction_date', pad(toDate, 3))

  if (error || !slipTxns || slipTxns.length === 0) return

  type SlipTxn = {
    id: string
    transaction_date: string
    amount: number
    original_currency: string
    description: string | null
    vendors: { name: string } | null
    payment_methods: { name: string } | null
  }

  const txns = slipTxns as unknown as SlipTxn[]

  for (const item of candidates) {
    let best: { tx: SlipTxn; daysDiff: number } | null = null
    for (const tx of txns) {
      if (tx.original_currency !== item.statementTransaction.currency) continue
      const amountDiff = Math.abs(
        Math.abs(tx.amount) - Math.abs(item.statementTransaction.amount)
      )
      if (amountDiff > 0.01) continue
      const daysDiff = calculateDaysDiff(item.statementTransaction.date, tx.transaction_date)
      if (daysDiff > 3) continue
      if (!best || daysDiff < best.daysDiff) {
        best = { tx, daysDiff }
      }
    }

    if (best) {
      item.matchedTransaction = {
        id: best.tx.id,
        date: best.tx.transaction_date,
        amount: best.tx.amount,
        currency: best.tx.original_currency,
        vendor_name: best.tx.vendors?.name,
        description: best.tx.description ?? undefined,
        payment_method_name: best.tx.payment_methods?.name,
      }
      item.isNew = false
      item.confidence = Math.max(item.confidence, 95)
      item.confidenceLevel = 'high'
      item.reasons = [
        ...item.reasons,
        'Auto-linked: matches existing transaction created from a payment slip',
      ]
    }
  }
}
