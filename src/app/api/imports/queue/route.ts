import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/imports/queue
 *
 * Fetches the review queue from processed statement uploads.
 * Returns all suggestions from statement_uploads.extraction_log.suggestions
 * that haven't been approved or rejected yet.
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * - status: 'all' | 'pending' | 'approved' | 'rejected' (default: 'all')
 * - currency: string (default: 'all')
 * - confidence: 'all' | 'high' | 'medium' | 'low' (default: 'all')
 * - search: string (optional)
 * - from: string (date, optional)
 * - to: string (date, optional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)))
    const statusFilter = searchParams.get('status') || 'all'
    const currencyFilter = searchParams.get('currency') || 'all'
    const confidenceFilter = searchParams.get('confidence') || 'all'
    const searchQuery = searchParams.get('search') || ''
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')

    // Fetch all completed statement uploads with their suggestions
    const { data: statements, error: fetchError } = await supabase
      .from('statement_uploads')
      .select(`
        id,
        filename,
        payment_method_id,
        extraction_log,
        payment_methods (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('extraction_completed_at', { ascending: false })

    if (fetchError) {
      console.error('Failed to fetch statements:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch review queue' },
        { status: 500 }
      )
    }

    // Extract all suggestions from all statements
    interface Suggestion {
      transaction_date: string
      description: string
      amount: number
      currency: string
      matched_transaction_id?: string
      confidence: number
      reasons: string[]
      is_new: boolean
      // Added fields for tracking
      status?: 'pending' | 'approved' | 'rejected'
    }

    interface QueueItem {
      id: string
      statementUploadId: string
      statementFilename: string
      paymentMethod: { id: string; name: string } | null
      statementTransaction: {
        date: string
        description: string
        amount: number
        currency: string
      }
      matchedTransaction?: {
        id: string
        date: string
        amount: number
        currency: string
        vendor_name?: string
      }
      confidence: number
      confidenceLevel: 'high' | 'medium' | 'low' | 'none'
      reasons: string[]
      isNew: boolean
      status: 'pending' | 'approved' | 'rejected'
    }

    const allItems: QueueItem[] = []

    for (const statement of statements || []) {
      const extractionLog = statement.extraction_log as {
        suggestions?: Suggestion[]
      } | null

      const suggestions = extractionLog?.suggestions || []

      for (let i = 0; i < suggestions.length; i++) {
        const suggestion = suggestions[i]

        // Create a unique ID for this suggestion (statementId + index)
        const id = `${statement.id}:${i}`

        // Determine confidence level
        let confidenceLevel: 'high' | 'medium' | 'low' | 'none' = 'none'
        if (suggestion.confidence >= 90) {
          confidenceLevel = 'high'
        } else if (suggestion.confidence >= 55) {
          confidenceLevel = 'medium'
        } else if (suggestion.confidence > 0) {
          confidenceLevel = 'low'
        }

        const item: QueueItem = {
          id,
          statementUploadId: statement.id,
          statementFilename: statement.filename,
          paymentMethod: statement.payment_methods as { id: string; name: string } | null,
          statementTransaction: {
            date: suggestion.transaction_date,
            description: suggestion.description,
            amount: suggestion.amount,
            currency: suggestion.currency,
          },
          matchedTransaction: suggestion.matched_transaction_id ? {
            id: suggestion.matched_transaction_id,
            date: suggestion.transaction_date, // Will be populated later if needed
            amount: suggestion.amount,
            currency: suggestion.currency,
          } : undefined,
          confidence: suggestion.confidence,
          confidenceLevel,
          reasons: suggestion.reasons,
          isNew: suggestion.is_new,
          status: suggestion.status || 'pending',
        }

        allItems.push(item)
      }
    }

    // Apply filters
    let filteredItems = allItems

    // Status filter
    if (statusFilter !== 'all') {
      filteredItems = filteredItems.filter(item => item.status === statusFilter)
    }

    // Currency filter
    if (currencyFilter !== 'all') {
      filteredItems = filteredItems.filter(
        item => item.statementTransaction.currency === currencyFilter
      )
    }

    // Confidence filter
    if (confidenceFilter !== 'all') {
      filteredItems = filteredItems.filter(item => item.confidenceLevel === confidenceFilter)
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filteredItems = filteredItems.filter(item =>
        item.statementTransaction.description.toLowerCase().includes(query) ||
        item.statementFilename.toLowerCase().includes(query)
      )
    }

    // Date range filter
    if (fromDate) {
      filteredItems = filteredItems.filter(
        item => item.statementTransaction.date >= fromDate
      )
    }
    if (toDate) {
      filteredItems = filteredItems.filter(
        item => item.statementTransaction.date <= toDate
      )
    }

    // Calculate stats (before pagination)
    const stats = {
      total: filteredItems.length,
      pending: filteredItems.filter(item => item.status === 'pending').length,
      highConfidence: filteredItems.filter(item => item.confidenceLevel === 'high').length,
      mediumConfidence: filteredItems.filter(item => item.confidenceLevel === 'medium').length,
      lowConfidence: filteredItems.filter(item => item.confidenceLevel === 'low' || item.confidenceLevel === 'none').length,
    }

    // Paginate
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedItems = filteredItems.slice(startIndex, endIndex)
    const hasMore = endIndex < filteredItems.length

    return NextResponse.json({
      items: paginatedItems,
      hasMore,
      total: filteredItems.length,
      stats,
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
