/**
 * Self-Transfer Detector
 *
 * Detects when two statement entries across different bank statements
 * represent the same self-transfer (money moved between the user's own accounts).
 *
 * Matching criteria:
 * - Same absolute amount, opposite signs (one leg is money out, the other money in)
 * - Different payment methods (different accounts)
 * - Close dates: ±1 day for same-type account pairs; ±5 days for a
 *   credit-card ↔ bank-account pair, because an autopay debits the funding
 *   account days after the card posts the payment
 */

import { calculateDaysDiff } from '@/lib/matching/date-matcher'
import { isCardPaymentDescription } from '@/lib/matching/transfer-descriptions'
import type { QueueItem } from '@/lib/imports/queue-types'

/** Window for two accounts of the same type (e.g. bank → bank). */
const SAME_TYPE_WINDOW_DAYS = 1
/** Window for a credit-card payment: card posts the payment days before the bank leg settles. */
const CARD_BANK_WINDOW_DAYS = 5

export interface SelfTransferPair {
  /** The debit-side queue item (money leaving one account) */
  debitItem: QueueItem
  /** The credit-side queue item (money arriving at other account) */
  creditItem: QueueItem
  /** Days between the two entries */
  daysDiff: number
}

function isCardBankPair(a?: string, b?: string): boolean {
  const bankLike = (t?: string) => t === 'bank_account' || t === 'debit_card'
  return (a === 'credit_card' && bankLike(b)) || (b === 'credit_card' && bankLike(a))
}

/**
 * Find self-transfer pairs among pending statement items.
 *
 * Algorithm: for each item, find an item on a different payment method with
 * the same absolute amount and the opposite sign, within the date window for
 * that account-type combination. Greedy 1:1 matching, preferring pairs whose
 * descriptions both read as card payments, then the tightest date match.
 */
export function findSelfTransferPairs(
  statementItems: QueueItem[]
): SelfTransferPair[] {
  // Only consider pending statement items
  const pending = statementItems.filter(
    item => item.source === 'statement' && item.status === 'pending'
  )

  if (pending.length < 2) return []

  // Group by payment method to find cross-account candidates
  // Items with the same payment method can't be a self-transfer pair
  const byPaymentMethod = new Map<string, QueueItem[]>()
  for (const item of pending) {
    const pmId = item.paymentMethod?.id ?? 'none'
    const group = byPaymentMethod.get(pmId) || []
    group.push(item)
    byPaymentMethod.set(pmId, group)
  }

  // Need at least 2 different payment methods for self-transfers
  if (byPaymentMethod.size < 2) return []

  const pairs: SelfTransferPair[] = []
  const usedIds = new Set<string>()

  // For each item, look for a matching item from a different payment method
  for (const item of pending) {
    if (usedIds.has(item.id)) continue

    const amount = item.statementTransaction.amount
    const currency = item.statementTransaction.currency
    const pmId = item.paymentMethod?.id ?? 'none'
    if (amount === 0) continue

    const itemIsCardPayment = isCardPaymentDescription(item.statementTransaction.description)

    let bestMatch: { candidate: QueueItem; daysDiff: number; descMatch: boolean } | null = null

    // Search items from OTHER payment methods
    for (const [otherPmId, otherItems] of byPaymentMethod) {
      if (otherPmId === pmId) continue

      for (const candidate of otherItems) {
        if (usedIds.has(candidate.id)) continue

        // Must be same currency and same absolute amount
        if (candidate.statementTransaction.currency !== currency) continue
        const candidateAmount = candidate.statementTransaction.amount
        const amountDiff = Math.abs(Math.abs(candidateAmount) - Math.abs(amount))
        if (amountDiff > 0.01) continue

        // The two legs of a transfer point in opposite directions. Two
        // same-direction rows of equal size (e.g. two identical purchases on
        // different cards) are not a transfer.
        if (candidateAmount === 0) continue
        if (Math.sign(candidateAmount) === Math.sign(amount)) continue

        // Date window depends on the account types involved
        const descMatch = itemIsCardPayment &&
          isCardPaymentDescription(candidate.statementTransaction.description)
        let windowDays = isCardBankPair(item.paymentMethodType, candidate.paymentMethodType)
          ? CARD_BANK_WINDOW_DAYS
          : SAME_TYPE_WINDOW_DAYS
        // When both descriptions read as a card payment the pairing is
        // near-certain even when account types are missing/unknown — allow
        // the wide window on the description evidence alone.
        if (descMatch) windowDays = Math.max(windowDays, CARD_BANK_WINDOW_DAYS)

        const daysDiff = calculateDaysDiff(
          item.statementTransaction.date,
          candidate.statementTransaction.date
        )
        if (daysDiff > windowDays) continue

        // Prefer description-confirmed card-payment pairs, then tightest date
        if (
          !bestMatch ||
          (descMatch && !bestMatch.descMatch) ||
          (descMatch === bestMatch.descMatch && daysDiff < bestMatch.daysDiff)
        ) {
          bestMatch = { candidate, daysDiff, descMatch }
        }
      }
    }

    if (bestMatch) {
      usedIds.add(item.id)
      usedIds.add(bestMatch.candidate.id)

      // The positive leg is money leaving an account (bank rows are signed
      // positive-out; a card's payment leg is negative), so it is the debit side.
      const itemIsDebit = amount > 0
      pairs.push({
        debitItem: itemIsDebit ? item : bestMatch.candidate,
        creditItem: itemIsDebit ? bestMatch.candidate : item,
        daysDiff: bestMatch.daysDiff,
      })
    }
  }

  return pairs
}
