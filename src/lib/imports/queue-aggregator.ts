import { SupabaseClient } from '@supabase/supabase-js'
import { makeMergedId, makeMergedSlipEmailId, makeMergedSlipStmtId, makeMergedSlipEmailStmtId, makeSelfTransferId, parseImportId } from '@/lib/utils/import-id'
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

  // Waiting-for-statement emails still participate in cross-source pairing so
  // that previously-rejected "needs statement" emails can find a statement
  // partner from the existing queue pool. If they don't pair up, they fall
  // back into the waiting section at the end.
  const waitingEmailIds = new Set(
    emailItems.filter(item => item.waitingForStatement).map(item => item.id)
  )
  const allItems = [...statementItems, ...emailItems, ...paymentSlipItems]

  // ── Phase -1: same-type extras (multi-email / multi-slip enrichment) ──
  // Some queue items represent a single transaction sourced from multiple
  // emails or slips of the same type — e.g. a Lazada order where each item
  // produces its own email receipt but the credit card aggregates them. The
  // user attaches extras via "Attach a source" → the new same-type key lands
  // in the anchor's manual_pair_keys array. Here we collapse those extras
  // into the anchor's extraEmailIds / extraSlipIds, removing the extras from
  // the queue and stripping the same-type keys before cross-type pairing.
  {
    const itemById = new Map(allItems.map(i => [i.id, i] as const))
    const consumedByExtras = new Set<string>()

    for (const item of allItems) {
      if (item.source !== 'email' && item.source !== 'payment_slip') continue
      const keys = item.manualPairKeys
      if (!keys || keys.length === 0) continue

      const ownPrefix = item.source === 'email' ? 'email:' : 'slip:'
      const sameTypeKeys = keys.filter(k => k.startsWith(ownPrefix))
      if (sameTypeKeys.length === 0) continue

      for (const k of sameTypeKeys) {
        const counterpart = itemById.get(k)
        if (!counterpart || counterpart.source !== item.source) continue
        // The lower-id side wins as the anchor (deterministic) so symmetric
        // declarations don't double-consume.
        if (counterpart.id < item.id) continue
        consumedByExtras.add(counterpart.id)
        const counterpartId = k.slice(ownPrefix.length)
        if (item.source === 'email') {
          item.extraEmailIds = [...(item.extraEmailIds || []), counterpartId]
        } else {
          item.extraSlipIds = [...(item.extraSlipIds || []), counterpartId]
        }
      }

      // Hide the same-type keys from the cross-type pairing logic that runs
      // next — it doesn't know how to handle them.
      item.manualPairKeys = keys.filter(k => !k.startsWith(ownPrefix))
    }

    if (consumedByExtras.size > 0) {
      const remaining = allItems.filter(i => !consumedByExtras.has(i.id))
      allItems.length = 0
      allItems.push(...remaining)
    }
  }

  // ── Phase 0: manual pair materialization ───────────────────────────
  // Force-pair sources that the user has explicitly attached together via the
  // "Attach a source" affordance. Manual pair keys live on email_transactions
  // and payment_slip_uploads (mirror of rejected_pair_keys). We materialize
  // these pairs first so that subsequent heuristic phases see them as already
  // paired and skip them.
  //
  // Supported manual pair shapes:
  //   email ↔ slip   (2-way)
  //   email ↔ stmt   (2-way)
  //   slip  ↔ stmt   (2-way)
  //   slip  ↔ email + stmt (3-way, derived when a slip has both keys)
  if (filters.sourceFilter !== 'statement' && filters.sourceFilter !== 'email') {
    const itemById = new Map(allItems.map(i => [i.id, i] as const))
    const manuallyPairedIds = new Set<string>()
    const manualMerged: QueueItem[] = []

    // Collect every (sourceItem, counterpartKey) declaration. Both sides may
    // declare the same pair; we de-dupe via a sorted-key set.
    const seenPairs = new Set<string>()

    const declarePair = (a: QueueItem, b: QueueItem) => {
      const key = [a.id, b.id].sort().join('|')
      if (seenPairs.has(key)) return false
      seenPairs.add(key)
      return true
    }

    // First, find slips that have BOTH an email and a statement key — emit 3-way.
    const slipsWithKeys = allItems.filter(
      i => i.source === 'payment_slip' && (i.manualPairKeys?.length ?? 0) > 0
    )

    for (const slip of slipsWithKeys) {
      const keys = slip.manualPairKeys ?? []
      const emailKey = keys.find(k => k.startsWith('email:'))
      const stmtKey = keys.find(k => k.startsWith('stmt:'))

      if (emailKey && stmtKey) {
        const emailItem = itemById.get(emailKey)
        const stmtItem = itemById.get(stmtKey)
        if (!emailItem || !stmtItem) continue
        if (!declarePair(slip, emailItem) || !declarePair(slip, stmtItem)) continue

        const slipId = slip.id.replace(/^slip:/, '')
        const stmtParsed = parseImportId(stmtItem.id)
        if (stmtParsed?.type !== 'statement') continue

        const mergedId = makeMergedSlipEmailStmtId(
          slipId,
          emailItem.id.replace(/^email:/, ''),
          stmtParsed.statementId,
          stmtParsed.index
        )

        manuallyPairedIds.add(slip.id)
        manuallyPairedIds.add(emailItem.id)
        manuallyPairedIds.add(stmtItem.id)

        manualMerged.push({
          id: mergedId,
          statementUploadId: stmtItem.statementUploadId,
          statementFilename: stmtItem.statementFilename,
          paymentMethod: stmtItem.paymentMethod ?? slip.paymentMethod,
          paymentMethodType: stmtItem.paymentMethodType,
          statementTransaction: stmtItem.statementTransaction,
          matchedTransaction:
            stmtItem.matchedTransaction ?? emailItem.matchedTransaction ?? slip.matchedTransaction,
          confidence: 100,
          confidenceLevel: 'high',
          reasons: ['Manually attached: payment slip + email receipt + bank statement'],
          isNew:
            !stmtItem.matchedTransaction &&
            !emailItem.matchedTransaction &&
            !slip.matchedTransaction,
          status:
            stmtItem.matchedTransaction ?? emailItem.matchedTransaction ?? slip.matchedTransaction
              ? 'approved'
              : 'pending',
          source: 'merged',
          emailMetadata: emailItem.emailMetadata ?? {},
          paymentSlipMetadata: slip.paymentSlipMetadata,
          mergedEmailData: {
            date: emailItem.statementTransaction.date,
            description: emailItem.statementTransaction.description,
            amount: emailItem.statementTransaction.amount,
            currency: emailItem.statementTransaction.currency,
            metadata: emailItem.emailMetadata ?? {},
          },
          mergedPaymentSlipData: {
            date: slip.statementTransaction.date,
            description: slip.statementTransaction.description,
            amount: slip.statementTransaction.amount,
            currency: slip.statementTransaction.currency,
            metadata: slip.paymentSlipMetadata ?? {},
          },
          extraEmailIds: emailItem.extraEmailIds,
          extraSlipIds: slip.extraSlipIds,
        })
      }
    }

    // Then 2-way pairs from any source's manual_pair_keys (skipping items
    // already consumed by a 3-way above).
    const allWithKeys = allItems.filter(
      i =>
        !manuallyPairedIds.has(i.id) &&
        (i.source === 'email' || i.source === 'payment_slip') &&
        (i.manualPairKeys?.length ?? 0) > 0
    )

    for (const item of allWithKeys) {
      for (const counterpartKey of item.manualPairKeys ?? []) {
        const counterpart = itemById.get(counterpartKey)
        if (!counterpart) continue
        if (manuallyPairedIds.has(counterpart.id)) continue
        if (!declarePair(item, counterpart)) continue

        // Determine the merged shape from the (item, counterpart) source pair.
        let mergedItem: QueueItem | null = null

        if (item.source === 'email' && counterpart.source === 'statement') {
          mergedItem = buildManualEmailStmtMerged(item, counterpart)
        } else if (item.source === 'statement' && counterpart.source === 'email') {
          mergedItem = buildManualEmailStmtMerged(counterpart, item)
        } else if (item.source === 'payment_slip' && counterpart.source === 'email') {
          mergedItem = buildManualSlipEmailMerged(item, counterpart)
        } else if (item.source === 'email' && counterpart.source === 'payment_slip') {
          mergedItem = buildManualSlipEmailMerged(counterpart, item)
        } else if (item.source === 'payment_slip' && counterpart.source === 'statement') {
          mergedItem = buildManualSlipStmtMerged(item, counterpart)
        } else if (item.source === 'statement' && counterpart.source === 'payment_slip') {
          mergedItem = buildManualSlipStmtMerged(counterpart, item)
        }

        if (mergedItem) {
          manuallyPairedIds.add(item.id)
          manuallyPairedIds.add(counterpart.id)
          manualMerged.push(mergedItem)
        }
      }
    }

    if (manuallyPairedIds.size > 0) {
      const remaining = allItems.filter(i => !manuallyPairedIds.has(i.id))
      allItems.length = 0
      allItems.push(...remaining, ...manualMerged)
    }
  }

  // Cross-source pairing
  if (filters.sourceFilter === 'all' || filters.sourceFilter === 'merged') {
    // Only email and statement items participate in cross-source pairing.
    // Payment slips have their own pairing section below and would produce
    // invalid merged IDs if included here (slip:<uuid> ≠ stmt:<uuid>:<index>).
    const pendingItems = allItems.filter(item =>
      item.status === 'pending' && (item.source === 'email' || item.source === 'statement')
    )
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
          rejectedPairKeys: item.rejectedPairKeys,
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
          // If the parser captured the original foreign amount (e.g. Chase
          // shows the THB/VND value next to a USD-settled charge), pass it
          // through so the cross-source pairer can do a same-currency direct
          // match against an email in that currency.
          foreignAmount: item.statementTransaction.foreignAmount,
          foreignCurrency: item.statementTransaction.foreignCurrency,
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
        const crossSourceReasons = pair.usedForeignAmountSignal
          ? [
              `Cross-source match: email (${pair.emailCandidate.currency}) ↔ statement original ${pair.statementCandidate.foreignCurrency} (${pair.statementCandidate.currency} settlement)`,
              `Direct match against statement's printed foreign amount — diff ${pair.percentDiff.toFixed(2)}% (no FX lookup)`,
            ]
          : [
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
            foreignAmount: pair.statementCandidate.foreignAmount,
            foreignCurrency: pair.statementCandidate.foreignCurrency,
            foreignExchangeRate: stmtItem?.statementTransaction.foreignExchangeRate,
          },
          matchedTransaction: inheritedMatch,
          // Foreign-amount-sourced matches are exact-match strength (the rate
          // came straight from Visa, not our exchange_rates approximation), so
          // promote them above the 95-cap used for FX-converted matches.
          confidence: pair.usedForeignAmountSignal
            ? (hasDbMatch ? Math.max(stmtItem?.confidence ?? 0, 99) : 99)
            : (hasDbMatch ? Math.max(stmtItem?.confidence ?? 0, 95) : 95),
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
          extraEmailIds: emailItem?.extraEmailIds,
          extraSlipIds: stmtItem?.extraSlipIds,
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

        // Surgical-reject support: if the user has rejected this slip from
        // pairing with a specific counterpart, skip that counterpart here.
        // Keys use the full composite-id format (`email:<id>`, `stmt:<id>:<idx>`).
        // For a merged email+stmt candidate, either component being rejected
        // disqualifies it.
        const slipRejectedKeys = new Set(slip.rejectedPairKeys || [])
        const isRejectedPair = (candidate: QueueItem): boolean => {
          if (slipRejectedKeys.size === 0) return false
          if (candidate.source === 'email' || candidate.source === 'statement') {
            return slipRejectedKeys.has(candidate.id)
          }
          if (candidate.source === 'merged') {
            const p = parseImportId(candidate.id)
            if (p?.type === 'merged') {
              if (slipRejectedKeys.has(`email:${p.emailId}`)) return true
              if (slipRejectedKeys.has(`stmt:${p.statementId}:${p.index}`)) return true
            }
          }
          return false
        }

        // Expense slips → try matching with emails (same THB amount, close date).
        // Also consider already-merged (email+statement) items from Phase 1 —
        // if the slip matches one of those, emit a 3-way slip+email+statement group.
        if (isExpense) {
          const candidateEmails = allItems.filter(item =>
            (item.source === 'email' || item.source === 'merged') &&
            item.status === 'pending' && !pairedItemIds.has(item.id)
          )

          let bestEmailMatch: { item: QueueItem; daysDiff: number } | null = null
          for (const email of candidateEmails) {
            // For merged items, only consider those that actually carry email data
            // (i.e., email+statement cross-source pairs — not self-transfers).
            if (email.source === 'merged' && !email.mergedEmailData) continue
            if (isRejectedPair(email)) continue
            if (email.statementTransaction.currency !== slip.statementTransaction.currency) continue
            const amountDiff = Math.abs(Math.abs(email.statementTransaction.amount) - Math.abs(slip.statementTransaction.amount))
            if (amountDiff > 0.01) continue
            const daysDiff = calculateDaysDiff(slip.statementTransaction.date, email.statementTransaction.date)
            if (daysDiff > 3) continue
            if (!bestEmailMatch || daysDiff < bestEmailMatch.daysDiff) {
              bestEmailMatch = { item: email, daysDiff }
            }
          }

          // 3-way case: the best match is a pre-merged email+statement item
          if (bestEmailMatch && bestEmailMatch.item.source === 'merged') {
            const mergedParsed = parseImportId(bestEmailMatch.item.id)
            if (mergedParsed?.type === 'merged') {
              const emailId = mergedParsed.emailId
              const stmtId = mergedParsed.statementId
              const stmtIndex = mergedParsed.index
              const mergedId = makeMergedSlipEmailStmtId(slipId, emailId, stmtId, stmtIndex)
              const emailMeta: EmailMetadata = bestEmailMatch.item.emailMetadata ?? {}

              pairedItemIds.add(slip.id)
              pairedItemIds.add(bestEmailMatch.item.id)

              mergedSlipItems.push({
                id: mergedId,
                statementUploadId: bestEmailMatch.item.statementUploadId,
                statementFilename: bestEmailMatch.item.statementFilename,
                paymentMethod: bestEmailMatch.item.paymentMethod ?? slip.paymentMethod,
                paymentMethodType: bestEmailMatch.item.paymentMethodType,
                statementTransaction: bestEmailMatch.item.statementTransaction,
                matchedTransaction: bestEmailMatch.item.matchedTransaction ?? slip.matchedTransaction,
                confidence: 97,
                confidenceLevel: 'high',
                reasons: [
                  `Three-way match: payment slip + email receipt + bank statement`,
                  `Same amount: ${slip.statementTransaction.amount} ${slip.statementTransaction.currency}`,
                ],
                isNew: !bestEmailMatch.item.matchedTransaction && !slip.matchedTransaction,
                status: 'pending',
                source: 'merged',
                emailMetadata: emailMeta,
                paymentSlipMetadata: slipMeta,
                mergedEmailData: bestEmailMatch.item.mergedEmailData,
                mergedPaymentSlipData: {
                  date: slip.statementTransaction.date,
                  description: slip.statementTransaction.description,
                  amount: slip.statementTransaction.amount,
                  currency: slip.statementTransaction.currency,
                  metadata: slipMeta ?? {},
                },
                crossCurrencyInfo: bestEmailMatch.item.crossCurrencyInfo,
                extraEmailIds: bestEmailMatch.item.extraEmailIds,
                extraSlipIds: slip.extraSlipIds,
              })
              continue
            }
          }

          if (bestEmailMatch && bestEmailMatch.item.source === 'email') {
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
              extraEmailIds: bestEmailMatch.item.extraEmailIds,
              extraSlipIds: slip.extraSlipIds,
            })
            continue
          }

          // Expense slip didn't match any email — fall back to statement entries
          const candidateStmtsForExpense = allItems.filter(item =>
            item.source === 'statement' && item.status === 'pending' && !pairedItemIds.has(item.id)
          )

          let bestStmtMatchForExpense: { item: QueueItem; daysDiff: number } | null = null
          for (const stmt of candidateStmtsForExpense) {
            if (isRejectedPair(stmt)) continue
            if (stmt.statementTransaction.currency !== slip.statementTransaction.currency) continue
            const amountDiff = Math.abs(Math.abs(stmt.statementTransaction.amount) - Math.abs(slip.statementTransaction.amount))
            if (amountDiff > 0.01) continue
            const daysDiff = calculateDaysDiff(slip.statementTransaction.date, stmt.statementTransaction.date)
            if (daysDiff > 3) continue
            if (!bestStmtMatchForExpense || daysDiff < bestStmtMatchForExpense.daysDiff) {
              bestStmtMatchForExpense = { item: stmt, daysDiff }
            }
          }

          if (bestStmtMatchForExpense) {
            const stmtParts = bestStmtMatchForExpense.item.id.replace(/^stmt:/, '').split(':')
            const mergedId = makeMergedSlipStmtId(slipId, stmtParts[0], parseInt(stmtParts[1], 10))

            pairedItemIds.add(slip.id)
            pairedItemIds.add(bestStmtMatchForExpense.item.id)

            mergedSlipItems.push({
              id: mergedId,
              statementUploadId: bestStmtMatchForExpense.item.statementUploadId,
              statementFilename: bestStmtMatchForExpense.item.statementFilename,
              paymentMethod: bestStmtMatchForExpense.item.paymentMethod ?? slip.paymentMethod,
              statementTransaction: bestStmtMatchForExpense.item.statementTransaction,
              matchedTransaction: bestStmtMatchForExpense.item.matchedTransaction ?? slip.matchedTransaction,
              confidence: 95,
              confidenceLevel: 'high',
              reasons: [
                `Cross-source match: payment slip + bank statement`,
                `Same amount: ${slip.statementTransaction.amount} ${slip.statementTransaction.currency}`,
              ],
              isNew: !slip.matchedTransaction && !bestStmtMatchForExpense.item.matchedTransaction,
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
              extraSlipIds: slip.extraSlipIds,
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
            if (isRejectedPair(stmt)) continue
            if (stmt.statementTransaction.currency !== slip.statementTransaction.currency) continue
            const amountDiff = Math.abs(Math.abs(stmt.statementTransaction.amount) - Math.abs(slip.statementTransaction.amount))
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
              extraSlipIds: slip.extraSlipIds,
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

      // Derive status from constituent items — if ANY item is approved, the
      // whole group is approved because they all point to the same matched
      // transaction (the match is already confirmed by at least one source).
      const anyApproved = group.some(item => item.status === 'approved')
      const anyRejected = group.some(item => item.status === 'rejected')
      const derivedStatus: 'pending' | 'approved' | 'rejected' =
        anyApproved ? 'approved' : anyRejected ? 'rejected' : 'pending'

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
        status: derivedStatus,
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
    waitingForStatementCount: 0, // filled in below
  }

  // Pull out any still-unpaired waiting-for-statement emails and surface them
  // in the dedicated waiting section instead of the main queue.
  const waitingItems: QueueItem[] = []
  const mainItems: QueueItem[] = []
  for (const item of filteredItems) {
    if (waitingEmailIds.has(item.id) && item.source === 'email') {
      waitingItems.push(item)
    } else {
      mainItems.push(item)
    }
  }
  stats.total = mainItems.length
  stats.pending = mainItems.filter(item => item.status === 'pending').length
  stats.waitingForStatementCount = waitingItems.length

  // Append waiting-for-statement items at the end (they render in their own collapsed section)
  const allOutput = [...mainItems, ...waitingItems]

  return { items: allOutput, stats, hasMore: false, total: mainItems.length, page: 1, limit: allOutput.length }
}

// ── Manual-pair merged item builders ─────────────────────────────────
// Used by the Phase 0 manual pair materialization above. These bypass the
// heuristic amount/date/currency checks and trust the user's explicit attach.

function buildManualEmailStmtMerged(emailItem: QueueItem, stmtItem: QueueItem): QueueItem | null {
  const stmtParsed = parseImportId(stmtItem.id)
  if (stmtParsed?.type !== 'statement') return null
  const emailId = emailItem.id.replace(/^email:/, '')
  const mergedId = makeMergedId(emailId, stmtParsed.statementId, stmtParsed.index)
  const emailMeta: EmailMetadata = emailItem.emailMetadata ?? {}
  const inheritedMatch = stmtItem.matchedTransaction ?? emailItem.matchedTransaction

  return {
    id: mergedId,
    statementUploadId: stmtItem.statementUploadId,
    statementFilename: stmtItem.statementFilename ?? '',
    paymentMethod: stmtItem.paymentMethod ?? null,
    paymentMethodType: stmtItem.paymentMethodType,
    statementTransaction: stmtItem.statementTransaction,
    matchedTransaction: inheritedMatch,
    confidence: 100,
    confidenceLevel: 'high',
    reasons: ['Manually attached: email + bank statement'],
    isNew: !inheritedMatch,
    status: inheritedMatch ? 'approved' : 'pending',
    source: 'merged',
    emailMetadata: emailMeta,
    mergedEmailData: {
      date: emailItem.statementTransaction.date,
      description: emailItem.statementTransaction.description,
      amount: emailItem.statementTransaction.amount,
      currency: emailItem.statementTransaction.currency,
      metadata: emailMeta,
    },
    extraEmailIds: emailItem.extraEmailIds,
    extraSlipIds: stmtItem.extraSlipIds,
  }
}

function buildManualSlipEmailMerged(slipItem: QueueItem, emailItem: QueueItem): QueueItem {
  const slipId = slipItem.id.replace(/^slip:/, '')
  const emailId = emailItem.id.replace(/^email:/, '')
  const mergedId = makeMergedSlipEmailId(slipId, emailId)
  const emailMeta: EmailMetadata = emailItem.emailMetadata ?? {}
  const inheritedMatch = slipItem.matchedTransaction ?? emailItem.matchedTransaction

  return {
    id: mergedId,
    statementFilename: slipItem.statementFilename,
    paymentMethod: slipItem.paymentMethod,
    statementTransaction: slipItem.statementTransaction,
    matchedTransaction: inheritedMatch,
    confidence: 100,
    confidenceLevel: 'high',
    reasons: ['Manually attached: payment slip + email receipt'],
    isNew: !inheritedMatch,
    status: inheritedMatch ? 'approved' : 'pending',
    source: 'merged',
    emailMetadata: emailMeta,
    paymentSlipMetadata: slipItem.paymentSlipMetadata,
    mergedEmailData: {
      date: emailItem.statementTransaction.date,
      description: emailItem.statementTransaction.description,
      amount: emailItem.statementTransaction.amount,
      currency: emailItem.statementTransaction.currency,
      metadata: emailMeta,
    },
    mergedPaymentSlipData: {
      date: slipItem.statementTransaction.date,
      description: slipItem.statementTransaction.description,
      amount: slipItem.statementTransaction.amount,
      currency: slipItem.statementTransaction.currency,
      metadata: slipItem.paymentSlipMetadata ?? {},
    },
    extraEmailIds: emailItem.extraEmailIds,
    extraSlipIds: slipItem.extraSlipIds,
  }
}

function buildManualSlipStmtMerged(slipItem: QueueItem, stmtItem: QueueItem): QueueItem | null {
  const stmtParsed = parseImportId(stmtItem.id)
  if (stmtParsed?.type !== 'statement') return null
  const slipId = slipItem.id.replace(/^slip:/, '')
  const mergedId = makeMergedSlipStmtId(slipId, stmtParsed.statementId, stmtParsed.index)
  const inheritedMatch = stmtItem.matchedTransaction ?? slipItem.matchedTransaction

  return {
    id: mergedId,
    statementUploadId: stmtItem.statementUploadId,
    statementFilename: stmtItem.statementFilename,
    paymentMethod: stmtItem.paymentMethod ?? slipItem.paymentMethod,
    paymentMethodType: stmtItem.paymentMethodType,
    statementTransaction: stmtItem.statementTransaction,
    matchedTransaction: inheritedMatch,
    confidence: 100,
    confidenceLevel: 'high',
    reasons: ['Manually attached: payment slip + bank statement'],
    isNew: !inheritedMatch,
    status: inheritedMatch ? 'approved' : 'pending',
    source: 'merged',
    paymentSlipMetadata: slipItem.paymentSlipMetadata,
    mergedPaymentSlipData: {
      date: slipItem.statementTransaction.date,
      description: slipItem.statementTransaction.description,
      amount: slipItem.statementTransaction.amount,
      currency: slipItem.statementTransaction.currency,
      metadata: slipItem.paymentSlipMetadata ?? {},
    },
    extraSlipIds: slipItem.extraSlipIds,
  }
}
