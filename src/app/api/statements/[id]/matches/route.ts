import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Match suggestion from extraction log
 */
interface MatchSuggestion {
  transaction_date: string
  description: string
  amount: number
  currency: string
  matched_transaction_id?: string
  confidence: number
  reasons: string[]
  is_new: boolean
}

/**
 * Extraction log structure
 */
interface ExtractionLog {
  parser_used?: string
  page_count?: number
  confidence?: number
  period_start?: string
  period_end?: string
  summary?: Record<string, unknown>
  warnings?: string[]
  transactions?: Array<{
    date: string
    description: string
    amount: number
    currency: string
    type: string
    category?: string
    foreign_transaction?: {
      originalAmount: number
      originalCurrency: string
      exchangeRate: number
    }
  }>
  suggestions?: MatchSuggestion[]
  log?: Array<{
    step: string
    percent: number
    message: string
    timestamp: string
  }>
  error?: string
}

/**
 * GET /api/statements/[id]/matches
 *
 * Retrieves processing results and match suggestions for a statement.
 *
 * Request params:
 * - id: Statement upload UUID
 *
 * Query params (optional):
 * - confidence: Filter by minimum confidence (number, 0-100)
 * - status: Filter by match status ('matched' | 'new' | 'all')
 * - limit: Maximum results to return (default: 100)
 * - offset: Pagination offset (default: 0)
 *
 * Returns:
 * - 200: Processing results with matches
 * - 400: Invalid request
 * - 401: Unauthorized
 * - 404: Statement upload not found
 * - 500: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: statementId } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(statementId)) {
      return NextResponse.json(
        { error: 'Invalid statement ID format' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const minConfidence = parseInt(searchParams.get('confidence') || '0', 10)
    const statusFilter = searchParams.get('status') || 'all'
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Validate query parameters
    if (isNaN(minConfidence) || minConfidence < 0 || minConfidence > 100) {
      return NextResponse.json(
        { error: 'confidence must be a number between 0 and 100' },
        { status: 400 }
      )
    }

    if (!['matched', 'new', 'all'].includes(statusFilter)) {
      return NextResponse.json(
        { error: 'status must be one of: matched, new, all' },
        { status: 400 }
      )
    }

    // Fetch statement upload
    const { data: statement, error: fetchError } = await supabase
      .from('statement_uploads')
      .select(`
        id,
        user_id,
        filename,
        file_path,
        payment_method_id,
        statement_period_start,
        statement_period_end,
        status,
        transactions_extracted,
        transactions_matched,
        transactions_new,
        extraction_started_at,
        extraction_completed_at,
        extraction_error,
        extraction_log,
        created_at,
        payment_methods (
          id,
          name
        )
      `)
      .eq('id', statementId)
      .single()

    if (fetchError || !statement) {
      return NextResponse.json(
        { error: 'Statement upload not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (statement.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Build consistent statement object for all responses
    const statementInfo = {
      id: statementId,
      filename: statement.filename,
      payment_method: statement.payment_methods,
      period: {
        start: statement.statement_period_start,
        end: statement.statement_period_end,
      },
      processed_at: statement.extraction_completed_at,
    }

    // Handle different processing statuses
    if (statement.status === 'pending') {
      return NextResponse.json({
        statement: statementInfo,
        status: 'pending',
        summary: null,
        error: null,
        progress: null,
      })
    }

    if (statement.status === 'processing') {
      const extractionLog = statement.extraction_log as ExtractionLog | null
      const progressLog = extractionLog?.log || []
      const currentProgress = progressLog.length > 0
        ? progressLog[progressLog.length - 1]
        : null

      return NextResponse.json({
        statement: statementInfo,
        status: 'processing',
        summary: null,
        error: null,
        progress: currentProgress ? {
          step: currentProgress.step,
          percent: currentProgress.percent,
          message: currentProgress.message,
        } : null,
      })
    }

    if (statement.status === 'failed') {
      return NextResponse.json({
        statement: statementInfo,
        status: 'failed',
        summary: null,
        error: statement.extraction_error,
        progress: null,
      })
    }

    // Status is 'completed' - return results
    const extractionLog = statement.extraction_log as ExtractionLog | null
    let suggestions = extractionLog?.suggestions || []

    // Apply filters
    if (minConfidence > 0) {
      suggestions = suggestions.filter(s => s.confidence >= minConfidence)
    }

    if (statusFilter === 'matched') {
      suggestions = suggestions.filter(s => !s.is_new)
    } else if (statusFilter === 'new') {
      suggestions = suggestions.filter(s => s.is_new)
    }

    // Calculate confidence distribution
    const confidenceDistribution = calculateConfidenceDistribution(
      extractionLog?.suggestions || []
    )

    // Paginate
    const totalMatches = suggestions.length
    const paginatedSuggestions = suggestions.slice(offset, offset + limit)

    // Fetch matched transaction details if available
    const matchedTransactionIds = paginatedSuggestions
      .filter(s => s.matched_transaction_id)
      .map(s => s.matched_transaction_id) as string[]

    let matchedTransactions: Record<string, {
      id: string
      date: string
      amount: number
      currency: string
      vendor_name?: string
    }> = {}

    if (matchedTransactionIds.length > 0) {
      const { data: txData } = await supabase
        .from('transactions')
        .select(`
          id,
          date,
          amount,
          currency,
          vendors (name)
        `)
        .in('id', matchedTransactionIds)

      if (txData) {
        matchedTransactions = txData.reduce((acc, tx) => {
          const vendors = tx.vendors as { name: string } | null
          acc[tx.id] = {
            id: tx.id,
            date: tx.date,
            amount: tx.amount,
            currency: tx.currency,
            vendor_name: vendors?.name,
          }
          return acc
        }, {} as Record<string, { id: string; date: string; amount: number; currency: string; vendor_name?: string }>)
      }
    }

    // Format response
    const matches = paginatedSuggestions.map(suggestion => ({
      // Statement transaction (from PDF)
      statement_transaction: {
        date: suggestion.transaction_date,
        description: suggestion.description,
        amount: suggestion.amount,
        currency: suggestion.currency,
      },
      // Match result
      match: suggestion.matched_transaction_id ? {
        transaction_id: suggestion.matched_transaction_id,
        transaction: matchedTransactions[suggestion.matched_transaction_id] || null,
      } : null,
      // Confidence and reasons
      confidence: suggestion.confidence,
      confidence_level: getConfidenceLevel(suggestion.confidence),
      reasons: suggestion.reasons,
      is_new: suggestion.is_new,
      status: suggestion.is_new ? 'new' : 'matched',
    }))

    return NextResponse.json({
      // Statement info
      statement: statementInfo,
      // Processing status
      status: 'completed',
      // Summary statistics
      summary: {
        total_extracted: statement.transactions_extracted,
        total_matched: statement.transactions_matched,
        total_new: statement.transactions_new,
        confidence_distribution: confidenceDistribution,
        parser_used: extractionLog?.parser_used,
        page_count: extractionLog?.page_count,
        warnings: extractionLog?.warnings || [],
      },
      // Match results
      matches,
      // Pagination info
      pagination: {
        total: totalMatches,
        limit,
        offset,
        has_more: offset + limit < totalMatches,
      },
    })

  } catch (error) {
    console.error('Statement matches API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get confidence level label from score
 */
function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 90) return 'high'
  if (confidence >= 55) return 'medium'
  return 'low'
}

/**
 * Calculate confidence distribution from suggestions
 */
function calculateConfidenceDistribution(suggestions: MatchSuggestion[]) {
  const distribution = {
    high: 0,      // >= 90
    medium: 0,    // 55-89
    low: 0,       // < 55
    no_match: 0,  // is_new === true
  }

  for (const suggestion of suggestions) {
    if (suggestion.is_new) {
      distribution.no_match++
    } else if (suggestion.confidence >= 90) {
      distribution.high++
    } else if (suggestion.confidence >= 55) {
      distribution.medium++
    } else {
      distribution.low++
    }
  }

  return distribution
}
