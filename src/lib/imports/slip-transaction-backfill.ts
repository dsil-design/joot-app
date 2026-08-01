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
 *
 * ── Why the identity guards below exist ──────────────────────────────────
 * Amount + date alone is far too weak a test. Both sides of this comparison
 * are dense streams of small round THB numbers: reimbursements from a person
 * and everyday food orders. A ฿139 Grab receipt was auto-linked to a ฿139
 * reimbursement *received* two days later — an expense claiming an income
 * transaction on a different account, from a different vendor, at 95%.
 *
 * So a numeric amount match is treated as a *candidate*, never a match. It
 * must additionally survive every identity check that both records can
 * actually answer: direction of money flow, account, vendor identity, and
 * card. These are exact comparisons on ids and signs — deliberately not
 * fuzzy name matching, which cannot be trusted here (Thai bank rows carry
 * legal names like "MS. SUPAPORN KIDK" while the vendor is saved as a
 * nickname, so name comparison would reject correct links).
 */

/** Which way the money moved for a queue item. `null` when it can't be told. */
function sourceDirection(item: QueueItem): 'in' | 'out' | null {
  if (item.source === 'payment_slip') {
    const detected = item.paymentSlipMetadata?.detectedDirection
    if (detected === 'income') return 'in'
    if (detected === 'expense') return 'out'
    return null
  }

  // A refund notification is money coming back regardless of how it's signed.
  if (item.emailMetadata?.classification === 'refund_notification') return 'in'

  // Statement rows are signed consistently across account types: positive is
  // money leaving (a bank debit or a card charge), negative is money arriving
  // (a deposit, a refund, or a payment toward a card). Email receipts carry a
  // positive amount and describe a purchase.
  const amount = item.statementTransaction.amount
  if (amount > 0) return 'out'
  if (amount < 0) return 'in'
  return null
}

/** Which way the money moved for an existing transaction. */
function transactionDirection(type: string | null): 'in' | 'out' | null {
  if (type === 'income') return 'in'
  if (type === 'expense') return 'out'
  // 'transfer' is one leg of a movement between the user's own accounts and
  // can legitimately correspond to either direction.
  return null
}

export async function backfillSlipTransactionMatches(
  supabase: SupabaseClient,
  userId: string,
  emailItems: QueueItem[],
  statementItems: QueueItem[]
): Promise<void> {
  // Skip items the user has manually paired with another source via
  // manualPairKeys. Without this, the (currency, amount, ±3 days) heuristic
  // can falsely match e.g. a 265 THB Grab receipt to an unrelated 265 THB
  // payment slip from a few days earlier, then the matched-txn dedup pass
  // consolidates the user's merged pair into the wrong card and the
  // manually-attached pair disappears from the queue entirely.
  const candidates = [...emailItems, ...statementItems].filter(
    (item) =>
      item.status === 'pending' &&
      item.isNew &&
      !item.matchedTransaction &&
      !(item.manualPairKeys && item.manualPairKeys.length > 0)
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
      source_payment_slip_id, transaction_type, vendor_id, payment_method_id,
      vendors ( name ),
      payment_methods ( name, card_last_four )
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
    transaction_type: string | null
    vendor_id: string | null
    payment_method_id: string | null
    vendors: { name: string } | null
    payment_methods: { name: string; card_last_four: string | null } | null
  }

  const txns = slipTxns as unknown as SlipTxn[]

  // Enforce 1:1 matching: each slip-derived transaction can only be claimed by
  // one queue item. Without this, the same transaction could be backfilled onto
  // multiple items, causing duplicate cards in the review queue.
  const usedTransactionIds = new Set<string>()

  for (const item of candidates) {
    const itemDirection = sourceDirection(item)
    const itemVendorId = item.emailMetadata?.vendorId
    const itemCardLastFour = item.emailMetadata?.paymentCardLastFour

    let best: { tx: SlipTxn; daysDiff: number; corroboration: string[] } | null = null

    for (const tx of txns) {
      if (usedTransactionIds.has(tx.id)) continue
      if (item.rejectedTransactionIds?.includes(tx.id)) continue

      // ── Numeric candidacy ──────────────────────────────────────────────
      if (tx.original_currency !== item.statementTransaction.currency) continue
      const amountDiff = Math.abs(
        Math.abs(tx.amount) - Math.abs(item.statementTransaction.amount)
      )
      if (amountDiff > 0.01) continue
      const daysDiff = calculateDaysDiff(item.statementTransaction.date, tx.transaction_date)
      if (daysDiff > 3) continue

      // ── Identity guards ────────────────────────────────────────────────
      // Direction: an expense can never be the same event as an income.
      const txDirection = transactionDirection(tx.transaction_type)
      if (itemDirection && txDirection && itemDirection !== txDirection) continue

      // Account: a row on one payment method cannot be a transaction booked
      // to a different one.
      if (
        item.paymentMethod?.id &&
        tx.payment_method_id &&
        item.paymentMethod.id !== tx.payment_method_id
      ) continue

      // Vendor: compared by resolved id, so a merchant receipt cannot claim a
      // transaction belonging to a different counterparty.
      if (itemVendorId && tx.vendor_id && itemVendorId !== tx.vendor_id) continue

      // Card: a receipt that names the card it was paid with cannot be a
      // transaction booked to a different card.
      const txCardLastFour = tx.payment_methods?.card_last_four
      if (itemCardLastFour && txCardLastFour && itemCardLastFour !== txCardLastFour) continue

      // ── Positive corroboration (drives the confidence score) ────────────
      const corroboration: string[] = []
      if (itemVendorId && tx.vendor_id && itemVendorId === tx.vendor_id) {
        corroboration.push('same vendor')
      }
      if (
        item.paymentMethod?.id &&
        tx.payment_method_id &&
        item.paymentMethod.id === tx.payment_method_id
      ) {
        corroboration.push('same account')
      }
      if (itemCardLastFour && txCardLastFour && itemCardLastFour === txCardLastFour) {
        corroboration.push('same card')
      }

      if (
        !best ||
        corroboration.length > best.corroboration.length ||
        (corroboration.length === best.corroboration.length && daysDiff < best.daysDiff)
      ) {
        best = { tx, daysDiff, corroboration }
      }
    }

    if (best) {
      usedTransactionIds.add(best.tx.id)

      // An honest score for a heuristic link. The evidence is an amount, a
      // date, and the transaction's slip provenance — never enough to claim
      // the near-certainty (95) this used to assert. Corroborating identity
      // signals raise it; nothing here reaches the auto-approve band on
      // amount and date alone.
      let linkConfidence = 80
      if (best.daysDiff === 0) linkConfidence += 5
      linkConfidence = Math.min(95, linkConfidence + best.corroboration.length * 5)

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
      item.transactionMatchConfidence = linkConfidence
      item.confidence = Math.max(item.confidence, linkConfidence)
      item.confidenceLevel = linkConfidence >= 90 ? 'high' : 'medium'
      item.reasons = [
        ...item.reasons,
        best.corroboration.length > 0
          ? `Auto-linked: matches existing transaction created from a payment slip (${best.corroboration.join(', ')})`
          : 'Auto-linked: matches existing transaction created from a payment slip (amount and date only — verify before approving)',
      ]
    }
  }
}
