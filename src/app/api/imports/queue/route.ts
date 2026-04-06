import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchStatementQueueItems } from '@/lib/imports/statement-queue-builder'
import { fetchEmailQueueItems } from '@/lib/imports/email-queue-builder'
import { fetchPaymentSlipQueueItems } from '@/lib/imports/payment-slip-queue-builder'
import { aggregateQueueItems } from '@/lib/imports/queue-aggregator'
import { backfillSlipTransactionMatches } from '@/lib/imports/slip-transaction-backfill'
import { getProposalsForItems, markStaleProposals, transformProposalRow } from '@/lib/proposals/proposal-service'
import { parseImportId } from '@/lib/utils/import-id'
import type { QueueFilters, QueueItem } from '@/lib/imports/queue-types'

/**
 * GET /api/imports/queue
 *
 * Fetches the unified review queue from statement uploads and email transactions.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)))

    const filters: QueueFilters = {
      statusFilter: searchParams.get('status') || 'all',
      currencyFilter: searchParams.get('currency') || 'all',
      confidenceFilter: searchParams.get('confidence') || 'all',
      sourceFilter: searchParams.get('source') || 'all',
      searchQuery: searchParams.get('search') || '',
      fromDate: searchParams.get('from') || undefined,
      toDate: searchParams.get('to') || undefined,
      statementUploadId: searchParams.get('statementUploadId') || undefined,
    }

    // Fetch items from each source in parallel
    // When filtering by a specific statement, don't fetch email items (they're irrelevant)
    const shouldFetchStatements = filters.sourceFilter === 'all' || filters.sourceFilter === 'statement' || filters.sourceFilter === 'merged'
    const shouldFetchEmails = !filters.statementUploadId && (filters.sourceFilter === 'all' || filters.sourceFilter === 'email' || filters.sourceFilter === 'merged')
    const shouldFetchSlips = !filters.statementUploadId && (filters.sourceFilter === 'all' || filters.sourceFilter === 'payment_slip' || filters.sourceFilter === 'merged')

    const [statementItems, emailItems, paymentSlipItems] = await Promise.all([
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

    // Backfill: auto-link unmatched email/statement items to existing
    // transactions that were created from a payment slip. Mutates items in place
    // so the aggregator's existing dedup-by-matched-transaction pass will
    // consolidate them into a single merged card.
    await backfillSlipTransactionMatches(supabase, user.id, emailItems, statementItems)

    // Aggregate, pair, filter, sort
    const result = await aggregateQueueItems(supabase, statementItems, emailItems, filters, paymentSlipItems)

    // Reconcile previously-generated proposals against the latest grouping.
    // If a pending proposal's underlying source(s) have been re-grouped into a
    // different composite_id by this aggregation pass (e.g., a slip-only proposal
    // is now part of a 3-way slip+email+statement group), mark the old proposal
    // 'stale' so it stops surfacing as a separate card. Fire-and-forget.
    void reconcileStaleProposals(supabase, user.id, result.items).catch((err) => {
      console.error('Failed to reconcile stale proposals:', err)
    })

    // Paginate
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedItems = result.items.slice(startIndex, endIndex)
    const hasMore = endIndex < result.items.length

    // Enrich new transaction items with proposals
    const newItemIds = paginatedItems
      .filter((item) => item.isNew)
      .map((item) => item.id)

    let enrichedItems = paginatedItems
    if (newItemIds.length > 0) {
      try {
        const proposalRows = await getProposalsForItems(supabase, user.id, newItemIds)

        if (proposalRows.size > 0) {
          // Fetch name lookups
          const [vendorData, pmData, tagData] = await Promise.all([
            supabase.from('vendors').select('id, name').eq('user_id', user.id),
            supabase.from('payment_methods').select('id, name').eq('user_id', user.id),
            supabase.from('tags').select('id, name').eq('user_id', user.id),
          ])

          const context = {
            vendors: new Map((vendorData.data || []).map((v) => [v.id, v.name])),
            paymentMethods: new Map((pmData.data || []).map((pm) => [pm.id, pm.name])),
            tags: new Map((tagData.data || []).map((t) => [t.id, t.name])),
          }

          enrichedItems = paginatedItems.map((item) => {
            const row = proposalRows.get(item.id)
            if (row) {
              return { ...item, proposal: transformProposalRow(row, context) }
            }
            return item
          })
        }
      } catch (err) {
        // Don't fail the queue response if proposal enrichment fails
        console.error('Failed to enrich queue with proposals:', err)
      }
    }

    return NextResponse.json({
      items: enrichedItems,
      hasMore,
      total: result.total,
      stats: result.stats,
      page,
      limit,
    })
  } catch (error) {
    console.error('Review queue API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Mark stale any pending proposals whose underlying source IDs are now part of
 * a different composite_id in the latest aggregated queue. This handles the
 * temporal race where a slip is reviewed (and proposal generated) before its
 * matching email/statement arrived — once they arrive and the aggregator
 * regroups, the old proposal becomes stale.
 */
async function reconcileStaleProposals(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  currentItems: QueueItem[]
): Promise<void> {
  // Build maps from each source identifier → current composite_id that owns it.
  const stmtToComposite = new Map<string, string>()
  const emailToComposite = new Map<string, string>()
  const slipToComposite = new Map<string, string>()

  for (const item of currentItems) {
    const parsed = parseImportId(item.id)
    if (!parsed) continue
    switch (parsed.type) {
      case 'statement':
        stmtToComposite.set(`${parsed.statementId}:${parsed.index}`, item.id)
        break
      case 'email':
        emailToComposite.set(parsed.emailId, item.id)
        break
      case 'payment_slip':
        slipToComposite.set(parsed.slipId, item.id)
        break
      case 'merged':
        stmtToComposite.set(`${parsed.statementId}:${parsed.index}`, item.id)
        emailToComposite.set(parsed.emailId, item.id)
        break
      case 'merged_slip_email':
        slipToComposite.set(parsed.slipId, item.id)
        emailToComposite.set(parsed.emailId, item.id)
        break
      case 'merged_slip_stmt':
        slipToComposite.set(parsed.slipId, item.id)
        stmtToComposite.set(`${parsed.statementId}:${parsed.index}`, item.id)
        break
      case 'merged_slip_email_stmt':
        slipToComposite.set(parsed.slipId, item.id)
        emailToComposite.set(parsed.emailId, item.id)
        stmtToComposite.set(`${parsed.statementId}:${parsed.index}`, item.id)
        break
      case 'self_transfer':
        stmtToComposite.set(`${parsed.debitStatementId}:${parsed.debitIndex}`, item.id)
        stmtToComposite.set(`${parsed.creditStatementId}:${parsed.creditIndex}`, item.id)
        break
    }
  }

  // Fetch all pending proposals for this user with their source refs.
  const { data: pending, error } = await supabase
    .from('transaction_proposals')
    .select('composite_id, statement_upload_id, suggestion_index, email_transaction_id, payment_slip_upload_id')
    .eq('user_id', userId)
    .eq('status', 'pending')

  if (error || !pending || pending.length === 0) return

  const staleIds: string[] = []
  for (const p of pending) {
    // For each source the proposal owns, check whether it's now in a current
    // item with a DIFFERENT composite_id. If any source has moved, mark stale.
    let regrouped = false

    if (p.statement_upload_id && p.suggestion_index !== null && p.suggestion_index !== undefined) {
      const owner = stmtToComposite.get(`${p.statement_upload_id}:${p.suggestion_index}`)
      if (owner && owner !== p.composite_id) regrouped = true
    }
    if (!regrouped && p.email_transaction_id) {
      const owner = emailToComposite.get(p.email_transaction_id)
      if (owner && owner !== p.composite_id) regrouped = true
    }
    if (!regrouped && p.payment_slip_upload_id) {
      const owner = slipToComposite.get(p.payment_slip_upload_id)
      if (owner && owner !== p.composite_id) regrouped = true
    }

    if (regrouped) staleIds.push(p.composite_id)
  }

  if (staleIds.length > 0) {
    await markStaleProposals(supabase, userId, staleIds)
  }
}
