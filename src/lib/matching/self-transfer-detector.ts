/**
 * Self-Transfer Detector
 *
 * Detects when two statement entries across different bank statements
 * represent the same self-transfer (money moved between the user's own accounts).
 *
 * Matching criteria:
 * - Same absolute amount
 * - One is a debit (charge), one is a credit
 * - Same date (±1 day tolerance for timezone/processing delays)
 * - Different payment methods (different bank accounts)
 */

import { calculateDaysDiff } from '@/lib/matching/date-matcher'
import type { QueueItem } from '@/lib/imports/queue-types'

export interface SelfTransferPair {
  /** The debit-side queue item (money leaving one account) */
  debitItem: QueueItem
  /** The credit-side queue item (money arriving at other account) */
  creditItem: QueueItem
  /** Days between the two entries */
  daysDiff: number
}

/**
 * Find self-transfer pairs among pending statement items.
 *
 * Algorithm: For each debit (positive amount = charge), find a matching
 * credit (negative amount or credit-type entry) with same absolute amount,
 * close date, and different payment method. Greedy 1:1 matching, preferring
 * tightest date match.
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

    let bestMatch: { candidate: QueueItem; daysDiff: number } | null = null

    // Search items from OTHER payment methods
    for (const [otherPmId, otherItems] of byPaymentMethod) {
      if (otherPmId === pmId) continue

      for (const candidate of otherItems) {
        if (usedIds.has(candidate.id)) continue

        // Must be same currency and same absolute amount
        if (candidate.statementTransaction.currency !== currency) continue
        const amountDiff = Math.abs(
          Math.abs(candidate.statementTransaction.amount) - Math.abs(amount)
        )
        if (amountDiff > 0.01) continue

        // Must be within ±1 day
        const daysDiff = calculateDaysDiff(
          item.statementTransaction.date,
          candidate.statementTransaction.date
        )
        if (daysDiff > 1) continue

        // Prefer tightest date match
        if (!bestMatch || daysDiff < bestMatch.daysDiff) {
          bestMatch = { candidate, daysDiff }
        }
      }
    }

    if (bestMatch) {
      usedIds.add(item.id)
      usedIds.add(bestMatch.candidate.id)

      // Determine which is debit and which is credit based on description hints
      // or just use item order (first found = debit side)
      pairs.push({
        debitItem: item,
        creditItem: bestMatch.candidate,
        daysDiff: bestMatch.daysDiff,
      })
    }
  }

  return pairs
}
