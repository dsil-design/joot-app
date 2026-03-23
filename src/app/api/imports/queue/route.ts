import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchStatementQueueItems } from '@/lib/imports/statement-queue-builder'
import { fetchEmailQueueItems } from '@/lib/imports/email-queue-builder'
import { fetchPaymentSlipQueueItems } from '@/lib/imports/payment-slip-queue-builder'
import { aggregateQueueItems } from '@/lib/imports/queue-aggregator'
import { getProposalsForItems, transformProposalRow } from '@/lib/proposals/proposal-service'
import type { QueueFilters } from '@/lib/imports/queue-types'

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
    const shouldFetchSlips = !filters.statementUploadId && (filters.sourceFilter === 'all' || filters.sourceFilter === 'payment_slip')

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

    // Aggregate, pair, filter, sort
    const result = await aggregateQueueItems(supabase, statementItems, emailItems, filters, paymentSlipItems)

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
