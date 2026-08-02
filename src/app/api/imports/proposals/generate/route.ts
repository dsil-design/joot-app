export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAndStoreProposals } from '@/lib/proposals/proposal-service'
import { fetchStatementQueueItems } from '@/lib/imports/statement-queue-builder'
import { fetchEmailQueueItems } from '@/lib/imports/email-queue-builder'
import { fetchPaymentSlipQueueItems } from '@/lib/imports/payment-slip-queue-builder'
import { aggregateQueueItems } from '@/lib/imports/queue-aggregator'
import { buildProposalInputFromQueueItem, attachExtraSourceContext } from '@/lib/proposals/queue-input'
import { attachRetailOrderContext } from '@/lib/proposals/retail-order-context'
import { parseImportId } from '@/lib/utils/import-id'
import type { QueueFilters } from '@/lib/imports/queue-types'
import type { ProposalInput } from '@/lib/proposals/types'

/**
 * POST /api/imports/proposals/generate
 *
 * Trigger batch proposal generation for import queue items.
 *
 * Runs the same fetch → aggregate pipeline as GET /api/imports/queue, so the
 * proposals are keyed by the composite id the review queue actually renders.
 * Generating from the unaggregated builder items instead writes `stmt:…` /
 * `email:…` proposals that no cross-source (`merged:…`) card can ever load.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      compositeIds,
      statementUploadId,
      emailTransactionIds,
      source,
      currency,
      status,
      confidence,
      from: fromDate,
      to: toDate,
      force = false,
    } = body as {
      compositeIds?: string[]
      statementUploadId?: string
      emailTransactionIds?: string[]
      source?: string
      currency?: string
      status?: string
      confidence?: string
      from?: string
      to?: string
      force?: boolean
    }

    const filters: QueueFilters = {
      statusFilter: status || 'all',
      currencyFilter: currency || 'all',
      confidenceFilter: confidence || 'all',
      sourceFilter: source || 'all',
      searchQuery: '',
      fromDate,
      toDate,
      statementUploadId: statementUploadId || undefined,
    }

    // Determine which sources to fetch based on filters
    const shouldFetchStatements = filters.sourceFilter === 'all' || filters.sourceFilter === 'statement' || filters.sourceFilter === 'merged'
    const shouldFetchEmails = !filters.statementUploadId && (filters.sourceFilter === 'all' || filters.sourceFilter === 'email' || filters.sourceFilter === 'merged')
    const shouldFetchSlips = !filters.statementUploadId && (filters.sourceFilter === 'all' || filters.sourceFilter === 'payment_slip' || filters.sourceFilter === 'merged')

    const [statementItems, emailItems, slipItems] = await Promise.all([
      shouldFetchStatements
        ? fetchStatementQueueItems(supabase, user.id, {
            statementUploadId: filters.statementUploadId,
            currencyFilter: filters.currencyFilter,
            searchQuery: filters.searchQuery,
            fromDate: filters.fromDate,
            toDate: filters.toDate,
          })
        : Promise.resolve([]),
      shouldFetchEmails
        ? fetchEmailQueueItems(supabase, user.id, {
            currencyFilter: filters.currencyFilter,
            searchQuery: filters.searchQuery,
            fromDate: filters.fromDate,
            toDate: filters.toDate,
          })
        : Promise.resolve([]),
      shouldFetchSlips
        ? fetchPaymentSlipQueueItems(supabase, user.id, {
            currencyFilter: filters.currencyFilter,
            searchQuery: filters.searchQuery,
            fromDate: filters.fromDate,
            toDate: filters.toDate,
          })
        : Promise.resolve([]),
    ])

    // Pair and filter exactly as the review queue does — merged cards only
    // exist after this pass.
    const aggregated = await aggregateQueueItems(
      supabase,
      statementItems,
      emailItems,
      filters,
      slipItems
    )

    // Only unmatched ("new transaction") cards get proposals.
    let targetItems = aggregated.items.filter((item) => item.isNew)

    // Apply explicit id filters (the retry pass posts failed composite ids
    // with no date window).
    if (compositeIds && compositeIds.length > 0) {
      const idSet = new Set(compositeIds)
      targetItems = targetItems.filter((item) => idSet.has(item.id))
    }
    if (emailTransactionIds && emailTransactionIds.length > 0) {
      const emailIdSet = new Set(emailTransactionIds)
      targetItems = targetItems.filter((item) => {
        const parsed = parseImportId(item.id)
        const owned = [
          parsed && 'emailId' in parsed ? parsed.emailId : undefined,
          ...(item.extraEmailIds ?? []),
        ].filter((id): id is string => !!id)
        // Statement/slip-only cards carry no email — leave them in, matching
        // the previous behaviour of this filter.
        if (owned.length === 0) return true
        return owned.some((id) => emailIdSet.has(id))
      })
    }

    const proposalInputs: ProposalInput[] = targetItems.map(buildProposalInputFromQueueItem)

    // Multi-source enrichment: bulk-load extra email/slip context for any
    // items that have manually-attached extras.
    await attachExtraSourceContext(supabase, user.id, proposalInputs, targetItems)

    // Online-retail orders: recover the full item list behind each charge so
    // descriptions name what was bought rather than echoing one product's
    // listing title.
    await attachRetailOrderContext(supabase, user.id, proposalInputs)

    const result = await generateAndStoreProposals(supabase, user.id, proposalInputs, { force })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Proposal generation API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
