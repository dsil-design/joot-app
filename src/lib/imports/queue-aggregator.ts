import { SupabaseClient } from '@supabase/supabase-js'
import { makeMergedId } from '@/lib/utils/import-id'
import { findCrossSourcePairs, type PairCandidate } from '@/lib/matching/cross-source-pairer'
import type { QueueItem, QueueFilters, QueueStats, EmailMetadata } from './queue-types'

export async function aggregateQueueItems(
  supabase: SupabaseClient,
  statementItems: QueueItem[],
  emailItems: QueueItem[],
  filters: QueueFilters
): Promise<{ items: QueueItem[]; stats: QueueStats; hasMore: boolean; total: number; page: number; limit: number }> {
  const page = Math.max(1, parseInt(String(filters.statusFilter === 'page' ? '1' : '1'), 10))

  // Separate waiting-for-statement items — they get their own section
  const waitingItems = emailItems.filter(item => item.waitingForStatement)
  const activeEmailItems = emailItems.filter(item => !item.waitingForStatement)
  const allItems = [...statementItems, ...activeEmailItems]

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
