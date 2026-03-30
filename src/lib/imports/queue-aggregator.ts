import { SupabaseClient } from '@supabase/supabase-js'
import { makeMergedId, makeMergedSlipEmailId, makeMergedSlipStmtId, makeSelfTransferId } from '@/lib/utils/import-id'
import { findCrossSourcePairs, type PairCandidate } from '@/lib/matching/cross-source-pairer'
import { findSelfTransferPairs } from '@/lib/matching/self-transfer-detector'
import { calculateDaysDiff } from '@/lib/matching/date-matcher'
import type { QueueItem, QueueFilters, QueueStats, EmailMetadata } from './queue-types'

export async function aggregateQueueItems(
  supabase: SupabaseClient,
  statementItems: QueueItem[],
  emailItems: QueueItem[],
  filters: QueueFilters,
  paymentSlipItems: QueueItem[] = []
): Promise<{ items: QueueItem[]; stats: QueueStats; hasMore: boolean; total: number; page: number; limit: number }> {
  const page = Math.max(1, parseInt(String(filters.statusFilter === 'page' ? '1' : '1'), 10))

  // Separate waiting-for-statement items — they get their own section
  const waitingItems = emailItems.filter(item => item.waitingForStatement)
  const activeEmailItems = emailItems.filter(item => !item.waitingForStatement)
  const allItems = [...statementItems, ...activeEmailItems, ...paymentSlipItems]

  // Cross-source pairing
  if (filters.sourceFilter === 'all' || filters.sourceFilter === 'merged') {
    const pendingItems = allItems.filter(item => item.status === 'pending')
    const pairCandidates: PairCandidate[] = pendingItems.map(item => {
      if (item.source === 'email') {
        const emailId = item.id.replace(/^email:/, '')
        return {
          source: 'email' as const,
          emailId,
          date: item.statementTransaction.date,
          amount: item.statementTransaction.amount,
          currency: item.statementTransaction.currency,
          description: item.statementTransaction.description,
        }
      } else {
        const parts = item.id.replace(/^stmt:/, '').split(':')
        return {
          source: 'statement' as const,
          statementId: parts[0],
          statementIndex: parseInt(parts[1], 10),
          date: item.statementTransaction.date,
          amount: item.statementTransaction.amount,
          currency: item.statementTransaction.currency,
          description: item.statementTransaction.description,
        }
      }
    })

    const pairs = await findCrossSourcePairs(supabase, pairCandidates)

    if (pairs.length > 0) {
      const pairedEmailIds = new Set(pairs.map(p => `email:${p.emailCandidate.emailId}`))
      const pairedStmtIds = new Set(pairs.map(p =>
        `stmt:${p.statementCandidate.statementId}:${p.statementCandidate.statementIndex}`
      ))

      const emailItemMap = new Map(allItems.filter(i => i.source === 'email').map(i => [i.id, i]))
      const stmtItemMap = new Map(allItems.filter(i => i.source === 'statement').map(i => [i.id, i]))

      const unpaired = allItems.filter(item =>
        !pairedEmailIds.has(item.id) && !pairedStmtIds.has(item.id)
      )

      for (const pair of pairs) {
        const emailOrigId = `email:${pair.emailCandidate.emailId}`
        const stmtOrigId = `stmt:${pair.statementCandidate.statementId}:${pair.statementCandidate.statementIndex}`
        const emailItem = emailItemMap.get(emailOrigId)
        const stmtItem = stmtItemMap.get(stmtOrigId)

        const mergedId = makeMergedId(
          pair.emailCandidate.emailId!,
          pair.statementCandidate.statementId!,
          pair.statementCandidate.statementIndex!
        )

        const emailMeta: EmailMetadata = emailItem?.emailMetadata ?? {}

        // Inherit matched transaction from either source (prefer statement)
        const inheritedMatch = stmtItem?.matchedTransaction ?? emailItem?.matchedTransaction
        const hasDbMatch = !!inheritedMatch
        const crossSourceReasons = [
          `Cross-source match: email (${pair.emailCandidate.currency}) + statement (${pair.statementCandidate.currency})`,
          `Amount diff: ${pair.percentDiff.toFixed(1)}% after conversion`,
        ]
        // If a DB transaction match exists, include the original match reasons
        if (hasDbMatch && stmtItem?.reasons?.length) {
          crossSourceReasons.push(...stmtItem.reasons)
        }

        unpaired.push({
          id: mergedId,
          statementUploadId: stmtItem?.statementUploadId,
          statementFilename: stmtItem?.statementFilename ?? '',
          paymentMethod: stmtItem?.paymentMethod ?? null,
          paymentMethodType: stmtItem?.paymentMethodType,
          statementTransaction: {
            date: pair.statementCandidate.date,
            description: pair.statementCandidate.description,
            amount: pair.statementCandidate.amount,
            currency: pair.statementCandidate.currency,
            sourceFilename: stmtItem?.statementTransaction.sourceFilename ?? '',
          },
          matchedTransaction: inheritedMatch,
          confidence: hasDbMatch ? Math.max(stmtItem?.confidence ?? 0, 95) : 95,
          confidenceLevel: 'high',
          reasons: crossSourceReasons,
          isNew: !hasDbMatch,
          status: 'pending',
          source: 'merged',
          emailMetadata: emailMeta,
          mergedEmailData: {
            date: pair.emailCandidate.date,
            description: pair.emailCandidate.description,
            amount: pair.emailCandidate.amount,
            currency: pair.emailCandidate.currency,
            metadata: emailMeta,
          },
          crossCurrencyInfo: {
            emailAmount: pair.emailCandidate.amount,
            emailCurrency: pair.emailCandidate.currency,
            statementAmount: pair.statementCandidate.amount,
            statementCurrency: pair.statementCandidate.currency,
            rate: pair.rate,
            rateDate: pair.rateDate,
            percentDiff: pair.percentDiff,
          },
        })
      }

      allItems.length = 0
      allItems.push(...unpaired)
    }
  }

  // ── Self-transfer detection ──────────────────────────────────────────
  // Detect when two statement entries from different bank accounts represent
  // the same self-transfer (e.g., KBank debit + Bangkok Bank credit).
  // Proposed as merged items for user review — not automatically created.
  if (filters.sourceFilter === 'all' || filters.sourceFilter === 'merged') {
    const selfTransferPairs = findSelfTransferPairs(allItems)

    if (selfTransferPairs.length > 0) {
      const pairedIds = new Set<string>()
      const mergedTransferItems: QueueItem[] = []

      for (const pair of selfTransferPairs) {
        pairedIds.add(pair.debitItem.id)
        pairedIds.add(pair.creditItem.id)

        const debitParts = pair.debitItem.id.replace(/^stmt:/, '').split(':')
        const creditParts = pair.creditItem.id.replace(/^stmt:/, '').split(':')

        const mergedId = makeSelfTransferId(
          debitParts[0], parseInt(debitParts[1], 10),
          creditParts[0], parseInt(creditParts[1], 10)
        )

        const fromAccount = pair.debitItem.paymentMethod?.name ?? 'Unknown account'
        const toAccount = pair.creditItem.paymentMethod?.name ?? 'Unknown account'

        mergedTransferItems.push({
          id: mergedId,
          statementUploadId: pair.debitItem.statementUploadId,
          statementFilename: pair.debitItem.statementFilename,
          paymentMethod: pair.debitItem.paymentMethod,
          statementTransaction: {
            date: pair.debitItem.statementTransaction.date,
            description: `Self-transfer: ${fromAccount} → ${toAccount}`,
            amount: pair.debitItem.statementTransaction.amount,
            currency: pair.debitItem.statementTransaction.currency,
            sourceFilename: pair.debitItem.statementTransaction.sourceFilename,
          },
          confidence: 90,
          confidenceLevel: 'high',
          reasons: [
            `Self-transfer detected: same amount across different accounts`,
            `${fromAccount} → ${toAccount}`,
            pair.daysDiff === 0
              ? 'Same date'
              : `Dates within ${pair.daysDiff} day`,
          ],
          isNew: true,
          status: 'pending',
          source: 'merged',
        })
      }

      // Remove paired items and add merged ones
      if (pairedIds.size > 0) {
        const remaining = allItems.filter(item => !pairedIds.has(item.id))
        allItems.length = 0
        allItems.push(...remaining, ...mergedTransferItems)
      }
    }
  }

  // ── Payment slip pairing ─────────────────────────────────────────────
  // Match pending payment slip items against unpaired email and statement items.
  // - Expense slips pair with email receipts (same amount, same currency, ±3 days)
  // - Income slips pair with statement entries (same amount, ±3 days)
  if (filters.sourceFilter === 'all' || filters.sourceFilter === 'merged' || filters.sourceFilter === 'payment_slip') {
    const pendingSlips = allItems.filter(item => item.source === 'payment_slip' && item.status === 'pending')
    if (pendingSlips.length > 0) {
      const pairedItemIds = new Set<string>()
      const mergedSlipItems: QueueItem[] = []

      for (const slip of pendingSlips) {
        const slipId = slip.id.replace(/^slip:/, '')
        const slipMeta = slip.paymentSlipMetadata
        const isExpense = slipMeta?.detectedDirection !== 'income'

        // Expense slips → try matching with emails (same THB amount, close date)
        if (isExpense) {
          const candidateEmails = allItems.filter(item =>
            item.source === 'email' && item.status === 'pending' && !pairedItemIds.has(item.id)
          )

          let bestEmailMatch: { item: QueueItem; daysDiff: number } | null = null
          for (const email of candidateEmails) {
            if (email.statementTransaction.currency !== slip.statementTransaction.currency) continue
            const amountDiff = Math.abs(email.statementTransaction.amount - slip.statementTransaction.amount)
            if (amountDiff > 0.01) continue
            const daysDiff = calculateDaysDiff(slip.statementTransaction.date, email.statementTransaction.date)
            if (daysDiff > 3) continue
            if (!bestEmailMatch || daysDiff < bestEmailMatch.daysDiff) {
              bestEmailMatch = { item: email, daysDiff }
            }
          }

          if (bestEmailMatch) {
            const emailId = bestEmailMatch.item.id.replace(/^email:/, '')
            const mergedId = makeMergedSlipEmailId(slipId, emailId)
            const emailMeta: EmailMetadata = bestEmailMatch.item.emailMetadata ?? {}

            pairedItemIds.add(slip.id)
            pairedItemIds.add(bestEmailMatch.item.id)

            mergedSlipItems.push({
              id: mergedId,
              statementFilename: slip.statementFilename,
              paymentMethod: slip.paymentMethod,
              statementTransaction: slip.statementTransaction,
              matchedTransaction: slip.matchedTransaction ?? bestEmailMatch.item.matchedTransaction,
              confidence: 95,
              confidenceLevel: 'high',
              reasons: [
                `Cross-source match: payment slip + email receipt`,
                `Same amount: ${slip.statementTransaction.amount} ${slip.statementTransaction.currency}`,
              ],
              isNew: !slip.matchedTransaction && !bestEmailMatch.item.matchedTransaction,
              status: 'pending',
              source: 'merged',
              emailMetadata: emailMeta,
              paymentSlipMetadata: slipMeta,
              mergedEmailData: {
                date: bestEmailMatch.item.statementTransaction.date,
                description: bestEmailMatch.item.statementTransaction.description,
                amount: bestEmailMatch.item.statementTransaction.amount,
                currency: bestEmailMatch.item.statementTransaction.currency,
                metadata: emailMeta,
              },
            })
            continue
          }
        }

        // Income slips → try matching with statement entries (same amount, close date)
        if (!isExpense) {
          const candidateStmts = allItems.filter(item =>
            item.source === 'statement' && item.status === 'pending' && !pairedItemIds.has(item.id)
          )

          let bestStmtMatch: { item: QueueItem; daysDiff: number } | null = null
          for (const stmt of candidateStmts) {
            if (stmt.statementTransaction.currency !== slip.statementTransaction.currency) continue
            const amountDiff = Math.abs(stmt.statementTransaction.amount - slip.statementTransaction.amount)
            if (amountDiff > 0.01) continue
            const daysDiff = calculateDaysDiff(slip.statementTransaction.date, stmt.statementTransaction.date)
            if (daysDiff > 3) continue
            if (!bestStmtMatch || daysDiff < bestStmtMatch.daysDiff) {
              bestStmtMatch = { item: stmt, daysDiff }
            }
          }

          if (bestStmtMatch) {
            const stmtParts = bestStmtMatch.item.id.replace(/^stmt:/, '').split(':')
            const mergedId = makeMergedSlipStmtId(slipId, stmtParts[0], parseInt(stmtParts[1], 10))

            pairedItemIds.add(slip.id)
            pairedItemIds.add(bestStmtMatch.item.id)

            mergedSlipItems.push({
              id: mergedId,
              statementUploadId: bestStmtMatch.item.statementUploadId,
              statementFilename: bestStmtMatch.item.statementFilename,
              paymentMethod: bestStmtMatch.item.paymentMethod ?? slip.paymentMethod,
              statementTransaction: bestStmtMatch.item.statementTransaction,
              matchedTransaction: bestStmtMatch.item.matchedTransaction ?? slip.matchedTransaction,
              confidence: 95,
              confidenceLevel: 'high',
              reasons: [
                `Cross-source match: payment slip + bank statement`,
                `Same amount: ${slip.statementTransaction.amount} ${slip.statementTransaction.currency}`,
              ],
              isNew: !slip.matchedTransaction && !bestStmtMatch.item.matchedTransaction,
              status: 'pending',
              source: 'merged',
              paymentSlipMetadata: slipMeta,
              mergedPaymentSlipData: {
                date: slip.statementTransaction.date,
                description: slip.statementTransaction.description,
                amount: slip.statementTransaction.amount,
                currency: slip.statementTransaction.currency,
                metadata: slipMeta ?? {},
              },
            })
            continue
          }
        }
      }

      // Remove paired items and add merged ones
      if (pairedItemIds.size > 0) {
        const remaining = allItems.filter(item => !pairedItemIds.has(item.id))
        allItems.length = 0
        allItems.push(...remaining, ...mergedSlipItems)
      }
    }
  }

  // ── Matched-transaction dedup ──────────────────────────────────────
  // Safety net: if multiple items still point to the same Joot transaction
  // (e.g., same-currency email+statement that the cross-source pairer missed,
  // or items that were individually auto-matched to the same transaction),
  // consolidate them into a single merged queue item.
  {
    const byMatchedTxn = new Map<string, QueueItem[]>()
    for (const item of allItems) {
      const txnId = item.matchedTransaction?.id
      if (!txnId) continue
      const group = byMatchedTxn.get(txnId)
      if (group) group.push(item)
      else byMatchedTxn.set(txnId, [item])
    }

    const dedupedIds = new Set<string>()
    const mergedDedup: QueueItem[] = []

    for (const [, group] of byMatchedTxn) {
      if (group.length < 2) continue
      // Already-merged items don't need re-merging
      if (group.every(item => item.source === 'merged')) continue

      // Pick the best item as the base (prefer statement, then email, then others)
      const stmtItem = group.find(i => i.source === 'statement')
      const emailItem = group.find(i => i.source === 'email')
      const slipItem = group.find(i => i.source === 'payment_slip')
      const base = stmtItem ?? emailItem ?? group[0]

      // Build a merged ID from whatever sources we have
      let mergedId: string
      if (emailItem && stmtItem) {
        const emailId = emailItem.id.replace(/^email:/, '')
        const stmtParts = stmtItem.id.replace(/^stmt:/, '').split(':')
        mergedId = makeMergedId(emailId, stmtParts[0], parseInt(stmtParts[1], 10))
      } else if (slipItem && emailItem) {
        const slipId = slipItem.id.replace(/^slip:/, '')
        const emailId = emailItem.id.replace(/^email:/, '')
        mergedId = makeMergedSlipEmailId(slipId, emailId)
      } else if (slipItem && stmtItem) {
        const slipId = slipItem.id.replace(/^slip:/, '')
        const stmtParts = stmtItem.id.replace(/^stmt:/, '').split(':')
        mergedId = makeMergedSlipStmtId(slipId, stmtParts[0], parseInt(stmtParts[1], 10))
      } else {
        // Fallback: keep the highest-confidence item, mark others for removal
        const sorted = [...group].sort((a, b) => b.confidence - a.confidence)
        for (let i = 1; i < sorted.length; i++) dedupedIds.add(sorted[i].id)
        continue
      }

      // Mark all original items for removal
      for (const item of group) dedupedIds.add(item.id)

      // Combine reasons from all sources, deduped
      const allReasons = new Set<string>()
      allReasons.add(`Consolidated from ${group.length} sources matching same transaction`)
      for (const item of group) {
        for (const r of item.reasons) allReasons.add(r)
      }

      const emailMeta: EmailMetadata = emailItem?.emailMetadata ?? {}

      mergedDedup.push({
        id: mergedId,
        statementUploadId: stmtItem?.statementUploadId ?? base.statementUploadId,
        statementFilename: stmtItem?.statementFilename ?? base.statementFilename,
        paymentMethod: stmtItem?.paymentMethod ?? base.paymentMethod,
        paymentMethodType: stmtItem?.paymentMethodType ?? base.paymentMethodType,
        statementTransaction: stmtItem?.statementTransaction ?? base.statementTransaction,
        matchedTransaction: base.matchedTransaction,
        confidence: Math.max(...group.map(i => i.confidence)),
        confidenceLevel: 'high',
        reasons: [...allReasons],
        isNew: false,
        status: 'pending',
        source: 'merged',
        emailMetadata: emailMeta,
        mergedEmailData: emailItem ? {
          date: emailItem.statementTransaction.date,
          description: emailItem.statementTransaction.description,
          amount: emailItem.statementTransaction.amount,
          currency: emailItem.statementTransaction.currency,
          metadata: emailMeta,
        } : undefined,
        paymentSlipMetadata: slipItem?.paymentSlipMetadata,
        mergedPaymentSlipData: slipItem ? {
          date: slipItem.statementTransaction.date,
          description: slipItem.statementTransaction.description,
          amount: slipItem.statementTransaction.amount,
          currency: slipItem.statementTransaction.currency,
          metadata: slipItem.paymentSlipMetadata ?? {},
        } : undefined,
      })
    }

    if (dedupedIds.size > 0) {
      const remaining = allItems.filter(item => !dedupedIds.has(item.id))
      allItems.length = 0
      allItems.push(...remaining, ...mergedDedup)
    }
  }

  // Sort: pending first, then by date descending
  const statusOrder: Record<string, number> = { pending: 0, approved: 1, rejected: 2 }
  allItems.sort((a, b) => {
    const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3)
    if (statusDiff !== 0) return statusDiff
    return b.statementTransaction.date.localeCompare(a.statementTransaction.date)
  })

  // Apply filters
  let filteredItems = allItems

  if (filters.sourceFilter === 'merged') {
    filteredItems = filteredItems.filter(item => item.source === 'merged')
  } else if (filters.sourceFilter === 'payment_slip') {
    filteredItems = filteredItems.filter(item => item.source === 'payment_slip')
  }

  if (filters.statusFilter !== 'all') {
    filteredItems = filteredItems.filter(item => item.status === filters.statusFilter)
  }

  if (filters.currencyFilter !== 'all') {
    filteredItems = filteredItems.filter(item => item.statementTransaction.currency === filters.currencyFilter)
  }

  if (filters.confidenceFilter !== 'all') {
    filteredItems = filteredItems.filter(item => item.confidenceLevel === filters.confidenceFilter)
  }

  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase()
    filteredItems = filteredItems.filter(item =>
      item.statementTransaction.description.toLowerCase().includes(query) ||
      item.statementFilename.toLowerCase().includes(query)
    )
  }

  if (filters.fromDate) {
    filteredItems = filteredItems.filter(item => item.statementTransaction.date >= filters.fromDate!)
  }
  if (filters.toDate) {
    filteredItems = filteredItems.filter(item => item.statementTransaction.date <= filters.toDate!)
  }

  // Calculate stats (before pagination)
  const now = new Date()
  const oneWeekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
  const oneWeekAgoStr = `${oneWeekAgo.getFullYear()}-${String(oneWeekAgo.getMonth() + 1).padStart(2, '0')}-${String(oneWeekAgo.getDate()).padStart(2, '0')}`

  const stats: QueueStats = {
    total: filteredItems.length,
    pending: filteredItems.filter(item => item.status === 'pending').length,
    highConfidence: filteredItems.filter(item => item.confidenceLevel === 'high').length,
    mediumConfidence: filteredItems.filter(item => item.confidenceLevel === 'medium').length,
    lowConfidence: filteredItems.filter(item => item.confidenceLevel === 'low' || item.confidenceLevel === 'none').length,
    thisWeekCount: filteredItems.filter(item => item.statementTransaction.date >= oneWeekAgoStr).length,
    resolvedCount: filteredItems.filter(item => item.status === 'approved' || item.status === 'rejected').length,
    waitingForStatementCount: waitingItems.length,
  }

  // Append waiting-for-statement items at the end (they render in their own collapsed section)
  const allOutput = [...filteredItems, ...waitingItems]

  return { items: allOutput, stats, hasMore: false, total: filteredItems.length, page: 1, limit: allOutput.length }
}
