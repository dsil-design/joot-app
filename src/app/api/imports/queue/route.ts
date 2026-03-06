import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchStatementQueueItems } from '@/lib/imports/statement-queue-builder'
import { fetchEmailQueueItems } from '@/lib/imports/email-queue-builder'
import { aggregateQueueItems } from '@/lib/imports/queue-aggregator'
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
    const shouldFetchStatements = filters.sourceFilter === 'all' || filters.sourceFilter === 'statement' || filters.sourceFilter === 'merged'
    const shouldFetchEmails = filters.sourceFilter === 'all' || filters.sourceFilter === 'email' || filters.sourceFilter === 'merged'

    const [statementItems, emailItems] = await Promise.all([
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
    ])

    // Aggregate, pair, filter, sort
    const result = await aggregateQueueItems(supabase, statementItems, emailItems, filters)

    // Paginate
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedItems = result.items.slice(startIndex, endIndex)
    const hasMore = endIndex < result.items.length

    return NextResponse.json({
      items: paginatedItems,
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
