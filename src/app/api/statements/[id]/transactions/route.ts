import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Extraction log structure (subset)
 */
interface ExtractionTransaction {
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
}

interface MatchSuggestion {
  transaction_date: string
  description: string
  amount: number
  currency: string
  matched_transaction_id?: string
  confidence: number
  reasons: string[]
  is_new: boolean
  status?: string
}

interface ExtractionLog {
  parser_used?: string
  period_start?: string
  period_end?: string
  warnings?: string[]
  transactions?: ExtractionTransaction[]
  suggestions?: MatchSuggestion[]
}

/**
 * GET /api/statements/[id]/transactions
 *
 * Returns paginated transactions from a statement's extraction log,
 * with match status information.
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
      return NextResponse.json({ error: 'Invalid statement ID format' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch statement
    const { data: statement, error: fetchError } = await supabase
      .from('statement_uploads')
      .select(`
        id,
        user_id,
        filename,
        payment_method_id,
        statement_period_start,
        statement_period_end,
        status,
        transactions_extracted,
        transactions_matched,
        transactions_new,
        extraction_log,
        payment_methods (id, name)
      `)
      .eq('id', statementId)
      .single()

    if (fetchError || !statement) {
      return NextResponse.json({ error: 'Statement not found' }, { status: 404 })
    }

    if (statement.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const statusFilter = searchParams.get('status') || 'all'
    const search = searchParams.get('search')?.toLowerCase() || ''

    const extractionLog = statement.extraction_log as ExtractionLog | null
    const transactions = extractionLog?.transactions || []
    const suggestions = extractionLog?.suggestions || []

    // Build a lookup from suggestion by matching on date+amount+description
    const suggestionMap = new Map<string, MatchSuggestion>()
    for (const s of suggestions) {
      const key = `${s.transaction_date}|${s.amount}|${s.description}`
      suggestionMap.set(key, s)
    }

    // Map each transaction to include match information
    interface TransactionItem {
      index: number
      date: string
      description: string
      amount: number
      currency: string
      type: string
      matchStatus: 'matched' | 'unmatched' | 'new' | 'credit'
      matchedTransactionId: string | null
      confidence: number
      suggestionStatus: string | null
    }

    let items: TransactionItem[] = transactions.map((tx, index) => {
      const key = `${tx.date}|${tx.amount}|${tx.description}`
      const suggestion = suggestionMap.get(key)

      let matchStatus: TransactionItem['matchStatus'] = 'unmatched'
      if (tx.type === 'credit' || tx.amount < 0) {
        matchStatus = 'credit'
      } else if (suggestion?.is_new) {
        matchStatus = 'new'
      } else if (suggestion?.matched_transaction_id) {
        matchStatus = 'matched'
      }

      return {
        index,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        currency: tx.currency,
        type: tx.type,
        matchStatus,
        matchedTransactionId: suggestion?.matched_transaction_id || null,
        confidence: suggestion?.confidence ?? 0,
        suggestionStatus: suggestion?.status || null,
      }
    })

    // Apply filters
    if (statusFilter !== 'all') {
      items = items.filter(item => item.matchStatus === statusFilter)
    }

    if (search) {
      items = items.filter(item =>
        item.description.toLowerCase().includes(search) ||
        item.amount.toString().includes(search)
      )
    }

    // Paginate
    const total = items.length
    const offset = (page - 1) * limit
    const paginatedItems = items.slice(offset, offset + limit)

    return NextResponse.json({
      statement: {
        id: statementId,
        filename: statement.filename,
        paymentMethod: statement.payment_methods,
        period: {
          start: statement.statement_period_start,
          end: statement.statement_period_end,
        },
        status: statement.status,
        parserUsed: extractionLog?.parser_used,
        warnings: extractionLog?.warnings || [],
      },
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error('Statement transactions API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
